import { useEffect, useRef, useState } from 'react';
import { SYNTHETIC_WS_URL } from '../config/backend';
import {
  parseDashboardFrame,
  type DashboardFrame,
} from '../types/dashboard';

export type DashboardWsStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'closed'
  | 'error'
  | 'no-scenario';

export interface UseDashboardWsResult {
  frame: DashboardFrame | null;
  status: DashboardWsStatus;
  /** Unix ms of last frame receipt — useful to show "stale" if frames stop flowing. */
  lastFrameMs: number | null;
  /** Description of the last error (connection, parse, etc.). */
  lastError: string | null;
}

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 10_000;
const NO_SCENARIO_CODE = 1013; // Matches server ws_server.py close code

/**
 * Subscribe to `/ws/dashboard` with auto-reconnect on network/transport failures.
 *
 * The backend closes with code 1013 when no scenario is running — we treat that
 * as a terminal "no-scenario" state (no reconnect spam) rather than a transient
 * failure. Once the caller launches a scenario and flips `enabled` false→true,
 * the hook reconnects.
 *
 * Parse errors are logged and surfaced as `lastError` but don't close the
 * socket — the server may recover on the next frame.
 */
export function useDashboardWs(enabled: boolean): UseDashboardWsResult {
  const [frame, setFrame] = useState<DashboardFrame | null>(null);
  const [status, setStatus] = useState<DashboardWsStatus>('idle');
  const [lastFrameMs, setLastFrameMs] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldConnectRef = useRef(enabled);

  useEffect(() => {
    shouldConnectRef.current = enabled;

    if (!enabled) {
      cleanup();
      setStatus('idle');
      return;
    }

    connect();

    return () => {
      shouldConnectRef.current = false;
      cleanup();
    };

    function cleanup() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        // Detach listeners so late events don't mutate React state after unmount.
        const s = socketRef.current;
        s.onopen = null;
        s.onmessage = null;
        s.onclose = null;
        s.onerror = null;
        if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) {
          s.close();
        }
        socketRef.current = null;
      }
    }

    function connect() {
      if (!shouldConnectRef.current) return;
      setStatus('connecting');
      const url = `${SYNTHETIC_WS_URL}/ws/dashboard`;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch (err) {
        setStatus('error');
        setLastError(String(err));
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStatus('open');
        setLastError(null);
      };
      socket.onmessage = (evt) => {
        try {
          const next = parseDashboardFrame(String(evt.data));
          setFrame(next);
          setLastFrameMs(Date.now());
        } catch (err) {
          setLastError(`parse: ${String(err)}`);
        }
      };
      socket.onerror = () => {
        // onerror is always followed by onclose; record the error but let close
        // drive the reconnect so we don't double-schedule.
        setLastError('websocket error');
      };
      socket.onclose = (evt) => {
        if (socketRef.current !== socket) return; // superseded by cleanup

        if (evt.code === NO_SCENARIO_CODE) {
          setStatus('no-scenario');
          setLastError(evt.reason || 'no active scenario');
          return; // do not reconnect — wait for caller to retry
        }

        setStatus('closed');
        scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      if (!shouldConnectRef.current) return;
      const attempt = reconnectAttemptsRef.current;
      reconnectAttemptsRef.current = attempt + 1;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
      reconnectTimerRef.current = setTimeout(connect, delay);
    }
  }, [enabled]);

  return { frame, status, lastFrameMs, lastError };
}

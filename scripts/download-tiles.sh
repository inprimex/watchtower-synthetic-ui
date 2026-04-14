#!/usr/bin/env bash
# Download OpenStreetMap XYZ tiles for offline Leaflet use.
#
# Task 9.1 plumbing: we do NOT check tiles into git (too large, OSM licensing),
# instead operators run this script once per deployment to populate
# public/tiles/. The Docker build then bakes the result into the nginx image.
#
# Usage:
#   scripts/download-tiles.sh                         # default bbox (Donbas), zooms 8-13
#   MIN_LAT=47.9 MAX_LAT=48.3 MIN_LON=37.3 MAX_LON=37.9 scripts/download-tiles.sh
#   MIN_ZOOM=10 MAX_ZOOM=14 scripts/download-tiles.sh
#
# Respect OSM tile usage policy: https://operations.osmfoundation.org/policies/tiles/
#  - Small operational areas only (not continent-scale)
#  - User-Agent must identify your app
#  - Throttle requests (we sleep between tiles)
# For large or long-term deployments, switch TILE_URL to a self-hosted tile
# server (tileserver-gl, openmaptiles) and disable the OSM-specific throttling.
set -euo pipefail

MIN_LAT="${MIN_LAT:-47.9}"
MAX_LAT="${MAX_LAT:-48.3}"
MIN_LON="${MIN_LON:-37.3}"
MAX_LON="${MAX_LON:-37.9}"
MIN_ZOOM="${MIN_ZOOM:-8}"
MAX_ZOOM="${MAX_ZOOM:-13}"
TILE_URL="${TILE_URL:-https://tile.openstreetmap.org/{z}/{x}/{y}.png}"
OUT_DIR="${OUT_DIR:-public/tiles}"
UA="${UA:-watchtower-synthetic-ui/0.1 tile-prefetch (contact: ops@watchtower.local)}"
SLEEP_MS="${SLEEP_MS:-100}"

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required (used for tile-coord math)" >&2
  exit 1
fi

# Emit "z x y" on stdout for every tile covering the bbox at each zoom.
tiles_for_bbox() {
  python3 - "$MIN_LAT" "$MAX_LAT" "$MIN_LON" "$MAX_LON" "$MIN_ZOOM" "$MAX_ZOOM" <<'PY'
import math, sys
min_lat, max_lat = float(sys.argv[1]), float(sys.argv[2])
min_lon, max_lon = float(sys.argv[3]), float(sys.argv[4])
min_z, max_z = int(sys.argv[5]), int(sys.argv[6])

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return xtile, ytile

for z in range(min_z, max_z + 1):
    x_min, y_max = deg2num(min_lat, min_lon, z)
    x_max, y_min = deg2num(max_lat, max_lon, z)
    for x in range(min(x_min, x_max), max(x_min, x_max) + 1):
        for y in range(min(y_min, y_max), max(y_min, y_max) + 1):
            print(f"{z} {x} {y}")
PY
}

total=0
downloaded=0
skipped=0
failed=0

mkdir -p "$OUT_DIR"

echo "Tile fetch:"
echo "  bbox=[${MIN_LAT},${MIN_LON}]-[${MAX_LAT},${MAX_LON}]"
echo "  zoom=${MIN_ZOOM}..${MAX_ZOOM}"
echo "  out=${OUT_DIR}  ua='${UA}'"
echo

while read -r z x y; do
  total=$((total + 1))
  dst_dir="${OUT_DIR}/${z}/${x}"
  dst="${dst_dir}/${y}.png"
  if [[ -s "$dst" ]]; then
    skipped=$((skipped + 1))
    continue
  fi
  mkdir -p "$dst_dir"
  url="${TILE_URL//\{z\}/${z}}"
  url="${url//\{x\}/${x}}"
  url="${url//\{y\}/${y}}"
  if curl -fsSL -A "$UA" -o "$dst" "$url"; then
    downloaded=$((downloaded + 1))
    # Throttle to stay within OSM fair use
    sleep "$(awk "BEGIN {print ${SLEEP_MS}/1000}")"
  else
    failed=$((failed + 1))
    rm -f "$dst"
  fi
done < <(tiles_for_bbox)

echo
echo "Done. total=${total} downloaded=${downloaded} skipped=${skipped} failed=${failed}"
if (( failed > 0 )); then
  echo "warning: ${failed} tile(s) failed — rerun to retry"
fi

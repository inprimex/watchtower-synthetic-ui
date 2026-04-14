# Multi-stage build: node builder → minimal nginx static serve.
#
# Build arg: VITE_SYNTHETIC_BASE_URL (default http://localhost:8100)
#   Baked into the JS bundle at build time. For docker-compose deployments
#   set this to the service DNS name (e.g. http://watchtower-synthetic:8100).
#   For field-host deployments set it to the reachable backend URL.
#
# Offline tiles (task 9.1): populated by scripts/download-tiles.sh into
# public/tiles/ before `docker build`. The COPY below is non-fatal when the
# directory is empty — nginx will 404 on /tiles/ probes and the UI will fall
# back to online OSM tiles via useOfflineTiles.

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first so layer caches don't invalidate on source edits.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Then bring in the source and build.
COPY . .
ARG VITE_SYNTHETIC_BASE_URL=http://localhost:8100
ENV VITE_SYNTHETIC_BASE_URL=$VITE_SYNTHETIC_BASE_URL
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine AS serve

# Drop the default nginx site; our config listens on :3000 instead of :80.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static bundle + offline tile cache (both may be empty if tiles weren't
# prefetched — the client falls back to online OSM tiles in that case).
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/public/tiles /usr/share/nginx/html/tiles

# The official nginx:alpine image already runs as a non-root-friendly user
# when bound to an unprivileged port (:3000 here). No USER directive is needed
# because the base entrypoint uses nginx's built-in master/worker model.

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

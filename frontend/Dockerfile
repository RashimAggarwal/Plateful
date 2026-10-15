FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json ./package.json
COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

COPY --from=build /app/frontend/dist/ /usr/share/nginx/html/
COPY frontend/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 frontend/docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 8080

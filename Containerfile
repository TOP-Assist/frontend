# SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
# SPDX-FileCopyrightText: 2026 deepsight GmbH
#
# SPDX-License-Identifier: AGPL-3.0-or-later

FROM docker.io/library/node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build


FROM docker.io/library/nginx:1.30-alpine

ENV ADMIN_API_PROXY_TARGET=http://admin-backend:8101

COPY --from=builder /app/dist /usr/share/nginx/html
# Installed as a template so the entrypoint can substitute the DNS resolver.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

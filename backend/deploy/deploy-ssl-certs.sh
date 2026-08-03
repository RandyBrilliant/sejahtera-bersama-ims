#!/bin/bash
# Copy Let's Encrypt certs into the nginx bind-mount and reload nginx.
# Intended as a certbot renew_hook / deploy-hook (runs as root after a successful renew).

set -euo pipefail

DOMAIN="${DOMAIN:-api.sejahterabersama.my.id}"
APP_DIR="${APP_DIR:-/home/regretzz/sejahtera-bersama-ims/backend}"
SSL_DIR="$APP_DIR/nginx/ssl/$DOMAIN"
LIVE_DIR="/etc/letsencrypt/live/$DOMAIN"
ENV_FILE="${ENV_FILE:-.env}"

PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

if [ ! -f "$LIVE_DIR/fullchain.pem" ] || [ ! -f "$LIVE_DIR/privkey.pem" ]; then
    echo "deploy-ssl-certs: missing live certs in $LIVE_DIR" >&2
    exit 1
fi

mkdir -p "$SSL_DIR"
# Copy through cat so we replace file contents in place (keeps bind-mount inodes stable for nginx).
cat "$LIVE_DIR/fullchain.pem" > "$SSL_DIR/fullchain.pem"
cat "$LIVE_DIR/privkey.pem" > "$SSL_DIR/privkey.pem"
cat "$LIVE_DIR/chain.pem" > "$SSL_DIR/chain.pem"
chmod 644 "$SSL_DIR/fullchain.pem" "$SSL_DIR/chain.pem"
chmod 600 "$SSL_DIR/privkey.pem"

cd "$APP_DIR"

COMPOSE=(docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml)
[ -f docker-compose.prod.block.yml ] && COMPOSE+=(-f docker-compose.prod.block.yml)
COMPOSE+=(-f docker-compose.prod.ssl.yml)

if ! "${COMPOSE[@]}" exec -T nginx nginx -s reload; then
    echo "deploy-ssl-certs: nginx reload failed; recreating nginx container" >&2
    "${COMPOSE[@]}" up -d --force-recreate nginx
fi

echo "deploy-ssl-certs: installed certs for $DOMAIN and reloaded nginx"

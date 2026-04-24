#!/bin/bash

# SSL Certificate Setup Script
# Sets up Let's Encrypt SSL certificate for data.sejahterabersama.my.id

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get directories
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="${APP_DIR:-$PROJECT_DIR}"

echo -e "${BLUE}=========================================="
echo "SSL Certificate Setup"
echo "==========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Domain configuration
DOMAIN="${DOMAIN:-data.sejahterabersama.my.id}"
EMAIL="${SSL_EMAIL:-admin@sejahterabersama.my.id}"
HTTP_CONF="./nginx/${DOMAIN}.http-only.conf"
SSL_CONF="./nginx/${DOMAIN}.conf"

echo -e "${YELLOW}Domain: ${DOMAIN}${NC}"
echo -e "${YELLOW}Email: ${EMAIL}${NC}"
echo ""

WEBROOT_DIR="$APP_DIR/nginx/certbot-www"
mkdir -p "$WEBROOT_DIR"

# Check if DNS is configured
echo -e "${BLUE}[1/6] Checking DNS configuration...${NC}"
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
if command -v dig &>/dev/null; then
    DNS_IP=$(dig +short $DOMAIN | tail -n1)
else
    # Fallback: use getent (no extra package) or host
    DNS_IP=$(getent ahosts "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || host -t A "$DOMAIN" 2>/dev/null | awk '/has address/ {print $NF; exit}')
fi

if [ -z "$DNS_IP" ]; then
    echo -e "${RED}Error: DNS not configured for $DOMAIN${NC}"
    echo "Please configure an A record pointing to: $SERVER_IP"
    exit 1
fi

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}⚠ Warning: DNS IP ($DNS_IP) doesn't match server IP ($SERVER_IP)${NC}"
    read -p "Continue anyway? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    echo -e "${GREEN}✓ DNS configured correctly${NC}"
fi

# Check if services are running
echo ""
echo -e "${BLUE}[2/6] Checking if services are running...${NC}"
if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${RED}Error: Services are not running!${NC}"
    echo "Please run: sudo ./deploy/deploy.sh first"
    exit 1
fi
echo -e "${GREEN}✓ Services are running${NC}"

# Ensure nginx is using HTTP-only config
echo ""
echo -e "${BLUE}[3/6] Ensuring Nginx is in HTTP mode...${NC}"
cd "$APP_DIR"
echo -e "${GREEN}✓ Using HTTP mode for ACME challenge${NC}"

# Generate certificate via webroot (no downtime)
echo ""
echo -e "${BLUE}[4/6] Generating SSL certificate (webroot)...${NC}"
certbot certonly \
    --webroot \
    -w "$WEBROOT_DIR" \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring || {
    echo -e "${RED}Error: Certificate generation failed${NC}"
    echo "Common issues:"
    echo "  - DNS not pointing to this server"
    echo "  - Port 80 not accessible"
    echo "  - Too many certificate requests (Let's Encrypt rate limit)"
    exit 1
}

# Copy certificates to nginx directory
echo ""
echo -e "${BLUE}[5/6] Copying certificates...${NC}"
mkdir -p "$APP_DIR/nginx/ssl/$DOMAIN"
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$APP_DIR/nginx/ssl/$DOMAIN/fullchain.pem"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$APP_DIR/nginx/ssl/$DOMAIN/privkey.pem"
cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$APP_DIR/nginx/ssl/$DOMAIN/chain.pem"
chmod 644 "$APP_DIR/nginx/ssl/$DOMAIN/fullchain.pem"
chmod 644 "$APP_DIR/nginx/ssl/$DOMAIN/chain.pem"
chmod 600 "$APP_DIR/nginx/ssl/$DOMAIN/privkey.pem"
echo -e "${GREEN}✓ Certificates copied${NC}"

# Update docker-compose.prod.yml to use SSL config
echo ""
echo -e "${BLUE}Updating Docker Compose configuration for SSL...${NC}"
cd "$APP_DIR"

# Replace active nginx config mount and ensure ssl volume is mounted
sed -i "s|$HTTP_CONF:/etc/nginx/conf.d/default.conf:ro|$SSL_CONF:/etc/nginx/conf.d/default.conf:ro|g" docker-compose.prod.yml
if ! grep -q "./nginx/ssl:/etc/nginx/ssl:ro" docker-compose.prod.yml; then
    sed -i '/conf.d\/default.conf:ro/a\      - ./nginx/ssl:/etc/nginx/ssl:ro' docker-compose.prod.yml
fi

echo -e "${GREEN}✓ Configuration updated${NC}"

# Restart nginx with SSL
echo ""
echo -e "${BLUE}[6/6] Starting Nginx with SSL...${NC}"
docker compose -f docker-compose.prod.yml up -d nginx
sleep 5

# Verify nginx configuration
if docker compose -f docker-compose.prod.yml exec -T nginx nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}Error: Nginx configuration is invalid!${NC}"
    docker compose -f docker-compose.prod.yml exec -T nginx nginx -t
    exit 1
fi

# Verify nginx is running
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    echo -e "${GREEN}✓ Nginx started successfully${NC}"
else
    echo -e "${RED}Error: Nginx failed to start${NC}"
    docker compose -f docker-compose.prod.yml logs nginx | tail -20
    exit 1
fi

# Setup auto-renewal (weekly)
echo ""
echo -e "${BLUE}Setting up certificate auto-renewal...${NC}"
# Create renewal script
cat > /etc/cron.weekly/renew-ssl-cert <<EOF
#!/bin/bash
set -e
certbot renew --quiet --webroot -w "$WEBROOT_DIR" --deploy-hook "cd $APP_DIR && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/$DOMAIN/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/$DOMAIN/privkey.pem && cp /etc/letsencrypt/live/$DOMAIN/chain.pem nginx/ssl/$DOMAIN/chain.pem && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload"
EOF
chmod +x /etc/cron.weekly/renew-ssl-cert
echo -e "${GREEN}✓ Auto-renewal configured${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "✅ SSL Setup Complete!"
echo "=========================================="
echo "${NC}"

echo -e "${BLUE}Certificate Details:${NC}"
certbot certificates

echo ""
echo -e "${GREEN}Your site is now available at: https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  - Certificates will auto-renew weekly"
echo "  - Update your .env file:"
echo "    ${BLUE}SECURE_SSL_REDIRECT=1${NC}"
echo "    ${BLUE}SESSION_COOKIE_SECURE=1${NC}"
echo "    ${BLUE}CSRF_COOKIE_SECURE=1${NC}"
echo ""
echo -e "${GREEN}SSL setup complete! 🎉${NC}"
echo ""


#!/usr/bin/env bash
# Run once from the repo root on Oleg's Mac:
#   ./alma-site/deploy/setup.sh
# The basic-auth password is generated on the droplet and printed here once.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOST="mirality-droplet"
DEST="/var/www/alma"

if [[ ! -f "$ROOT/alma-site/index.html" ]]; then
  echo "Cannot find $ROOT/alma-site/index.html." >&2
  exit 1
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" true; then
  echo "Could not SSH to $HOST." >&2
  echo "On this Mac, ~/.ssh/config needs: Host mirality-droplet (root@138.68.147.90)." >&2
  exit 1
fi

ssh "$HOST" "mkdir -p '$DEST'"

rsync -az --delete \
  --exclude 'deploy/' \
  --exclude '.DS_Store' \
  -e ssh \
  "$ROOT/alma-site/" "$HOST:$DEST/"

ssh "$HOST" "CERTBOT_EMAIL=$(printf '%q' "${CERTBOT_EMAIL:-}") bash -s" << 'REMOTE'
set -euo pipefail

SITE="alma.suvorav.com"
IP="138.68.147.90"
HTPASSWD="/etc/nginx/alma.htpasswd"

if [[ -d /etc/nginx/sites-available && -d /etc/nginx/sites-enabled ]]; then
  CONF="/etc/nginx/sites-available/alma.suvorav.com"
  LINK="/etc/nginx/sites-enabled/alma.suvorav.com"
else
  CONF="/etc/nginx/conf.d/alma.suvorav.com.conf"
  LINK=""
fi

if [[ -f "$HTPASSWD" ]]; then
  echo "Basic auth already exists at $HTPASSWD. The password was not changed."
else
  if ! command -v openssl >/dev/null 2>&1; then
    echo "openssl is not installed on the droplet, so no password was created." >&2
    exit 1
  fi
  PASS="$(openssl rand -base64 24 | tr -d '\n')"
  HASH="$(printf '%s' "$PASS" | openssl passwd -apr1 -stdin)"
  if [[ ! "$HASH" == '$apr1$'* ]]; then
    echo "openssl could not make an apr1 password hash. No password file was written." >&2
    exit 1
  fi
  install -d -m 755 /etc/nginx
  (umask 027; printf 'oleg:%s\n' "$HASH" > "$HTPASSWD")
  chmod 640 "$HTPASSWD"
  if getent group www-data >/dev/null 2>&1; then
    chown root:www-data "$HTPASSWD"
  else
    chmod 644 "$HTPASSWD"
  fi
  echo
  echo "Basic auth user: oleg"
  echo "Basic auth password (shown once; it is not stored on the Mac): $PASS"
  echo
fi

created=0
if [[ ! -f "$CONF" ]]; then
  cat > "$CONF" << 'NGINX'
# Alma only. Written by alma-site/deploy/setup.sh. Do not put other sites in this file.
server {
    listen 80;
    listen [::]:80;
    server_name alma.suvorav.com;

    root /var/www/alma;
    index index.html;

    add_header X-Robots-Tag "noindex, nofollow" always;

    location ^~ /.well-known/acme-challenge/ {
        auth_basic off;
    }

    location / {
        auth_basic "Alma";
        auth_basic_user_file /etc/nginx/alma.htpasswd;
        try_files $uri $uri/ =404;
    }
}
NGINX
  chmod 644 "$CONF"
  if [[ -n "$LINK" ]]; then
    if [[ -e "$LINK" || -L "$LINK" ]]; then
      echo "Refusing to replace existing $LINK. Removed the new vhost file." >&2
      rm -f "$CONF"
      exit 1
    fi
    ln -s "$CONF" "$LINK"
  fi
  created=1
  echo "Wrote nginx vhost $CONF"
else
  echo "nginx vhost already present at $CONF. Leaving it unchanged."
fi

if ! nginx -t; then
  echo "nginx -t failed. No other vhost was edited." >&2
  if [[ "$created" -eq 1 ]]; then
    rm -f "$CONF"
    if [[ -n "$LINK" ]]; then
      rm -f "$LINK"
    fi
    echo "Removed the new Alma vhost so nginx is unchanged." >&2
  fi
  exit 1
fi

systemctl reload nginx
echo "nginx reloaded."

if [[ -f "/etc/letsencrypt/live/$SITE/fullchain.pem" ]]; then
  echo "TLS certificate for $SITE is already installed."
  exit 0
fi

resolved="$(getent ahostsv4 "$SITE" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
if [[ "$resolved" != "$IP" ]]; then
  echo
  echo "DNS for $SITE does not resolve to $IP yet (got: ${resolved:-nothing})."
  echo "Add an A record: alma → $IP"
  echo "Wait until it resolves from this droplet, then run ./alma-site/deploy/setup.sh again."
  echo "The files and the HTTP vhost are in place. HTTPS is not."
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot is not installed on the droplet. Install it, then rerun setup.sh." >&2
  exit 1
fi

email_args=(--register-unsafely-without-email)
if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  email_args=(-m "$CERTBOT_EMAIL")
fi

if ! certbot --nginx -d "$SITE" --non-interactive --agree-tos --redirect "${email_args[@]}"; then
  echo "certbot failed. If Let's Encrypt cannot see $SITE at $IP, the A record is missing or not public yet." >&2
  echo "Fix DNS, then run ./alma-site/deploy/setup.sh again. The Alma vhost file was not rolled back." >&2
  exit 1
fi

echo "HTTPS is on for https://$SITE"
REMOTE

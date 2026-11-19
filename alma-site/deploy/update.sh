#!/usr/bin/env bash
# Later content updates, from the repo root on Oleg's Mac:
#   ./alma-site/deploy/update.sh
# Copies alma-site/ to the droplet. Does not touch nginx, TLS, or the password.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOST="mirality-droplet"
DEST="/var/www/alma"

if [[ ! -f "$ROOT/alma-site/index.html" ]]; then
  echo "Cannot find $ROOT/alma-site/index.html." >&2
  exit 1
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" true; then
  echo "Could not SSH to $HOST. Check the mirality-droplet alias on this Mac." >&2
  exit 1
fi

if ! ssh -o BatchMode=yes "$HOST" "test -d '$DEST'"; then
  echo "No $DEST on $HOST yet. Run ./alma-site/deploy/setup.sh first." >&2
  exit 1
fi

rsync -az --delete \
  --exclude 'deploy/' \
  --exclude '.DS_Store' \
  -e ssh \
  "$ROOT/alma-site/" "$HOST:$DEST/"

echo "Updated $DEST on $HOST."

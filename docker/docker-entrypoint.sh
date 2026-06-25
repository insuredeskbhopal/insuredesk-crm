#!/bin/bash
set -e
# Clean up stale singleton locks in persisted sessions
find /sessions -name 'Singleton*' -delete 2>/dev/null || true
# Exec original entrypoint with forwarded arguments
exec /usr/bin/dumb-init -- ./start.sh ./node_modules/@open-wa/wa-automate/bin/server.js --use-chrome --in-docker --qr-timeout 0 --popup --debug --force-port "$@"

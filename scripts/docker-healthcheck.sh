#!/bin/sh
# Docker health check for ReportForge.
# Curls the /api/health endpoint and exits 0 if healthy, 1 otherwise.
# Used in docker-compose.yml healthcheck config.

set -e

response=$(curl -sf http://localhost:3000/api/health) || exit 1

status=$(echo "$response" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

case "$status" in
  healthy|degraded)
    exit 0
    ;;
  *)
    exit 1
    ;;
esac

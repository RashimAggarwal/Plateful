#!/bin/sh
set -eu

api_url=${API_URL:-/api}
escaped_api_url=$(printf '%s' "$api_url" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf 'window.__PLATEFUL_CONFIG__ = { apiUrl: "%s" };\n' "$escaped_api_url" > /tmp/runtime-config.js

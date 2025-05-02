#!/bin/sh
# Strict mode
set -eu

# Substitute environment variables in the Nginx config template
# Input: /etc/nginx/templates/default.conf.template
# Output: /etc/nginx/conf.d/default.conf
# BACKEND_URL needs to be set as an environment variable
envsubst '$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Print the substituted config to logs for debugging
echo "--- Substituted Nginx Config (/etc/nginx/conf.d/default.conf) ---"
cat /etc/nginx/conf.d/default.conf
echo "-------------------------------------------------------------"

# Start Nginx in the foreground
exec nginx -g 'daemon off;' 

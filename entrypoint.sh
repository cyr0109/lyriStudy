#!/bin/bash

# Start Nginx in background
# We assume nginx.conf doesn't have 'daemon off;'
nginx

# Start Uvicorn in foreground
# Bind to localhost because Nginx will proxy to it locally
echo "Starting Uvicorn..."
uvicorn main:app --host 127.0.0.1 --port 8000
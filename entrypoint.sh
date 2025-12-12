#!/bin/bash

echo "Testing Nginx config..."
nginx -t

echo "Starting Nginx..."
nginx

# Start Uvicorn in foreground
# Bind to localhost because Nginx will proxy to it locally
echo "Starting Uvicorn..."
uvicorn main:app --host 127.0.0.1 --port 8000
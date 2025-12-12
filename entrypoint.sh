#!/bin/bash

echo "Testing Nginx config..."
nginx -t

echo "Starting Nginx..."
nginx

# Check DB connection type for logging
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  WARNING: DATABASE_URL is not set. Using SQLite (Data will be lost on redeploy)."
else
  echo "✅  DATABASE_URL is set. Using PostgreSQL."
fi

# Run simple migration
echo "Running migrations..."
python migrate.py

# Start Uvicorn in foreground
# Bind to localhost because Nginx will proxy to it locally
echo "Starting Uvicorn..."
uvicorn main:app --host 127.0.0.1 --port 8000
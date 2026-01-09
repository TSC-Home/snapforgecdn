#!/bin/sh
set -e

echo "Starting SnapForge CDN..."

# Initialize database if needed
echo "Checking database..."
node /app/scripts/init-db.js

# Start the application
echo "Starting application..."
exec node build

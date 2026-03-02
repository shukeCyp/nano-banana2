#!/bin/bash

# Ensure we are in the script directory
cd "$(dirname "$0")"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --prefix frontend
fi

# Build frontend
echo "Building frontend..."
npm run build --prefix frontend

# Start the server
echo "Starting NanoBanana2 server on port 3399..."
npm start

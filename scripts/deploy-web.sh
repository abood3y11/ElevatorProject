#!/bin/bash
# ELMS Web Admin Deployment Script

echo "================================"
echo "  Deploying ELMS Web Admin"
echo "================================"

cd web

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building Next.js application..."
npm run build

# Start the server
echo "Starting production server..."
npm start

cd ..


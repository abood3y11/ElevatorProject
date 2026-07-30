#!/bin/bash
# ELMS Backend Deployment Script

echo "================================"
echo "  Deploying ELMS Backend"
echo "================================"

cd backend

# Activate virtual environment
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Start the server with Gunicorn (production)
echo "Starting server..."
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app

cd ..


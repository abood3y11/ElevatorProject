#!/bin/bash
# ELMS Background Worker Deployment Script

echo "================================"
echo "  Deploying ELMS Worker"
echo "================================"

cd backend

source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Starting Redis-backed worker..."
python -m app.workers.redis_worker

cd ..

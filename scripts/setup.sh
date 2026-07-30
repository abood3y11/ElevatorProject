#!/bin/bash
# ELMS Project Setup Script

echo "================================"
echo "  ELMS Project Setup"
echo "================================"

# Backend setup
echo ""
echo "Setting up Backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Copy .env.example to .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Create upload directories
mkdir -p uploads/work_orders
mkdir -p storage

cd ..

# Web setup
echo ""
echo "Setting up Web Admin..."
cd web
npm install

cd ..

# Mobile setup
echo ""
echo "Setting up Mobile Worker App..."
cd mobile-worker
npm install

cd ..

echo ""
echo "================================"
echo "  Setup Complete!"
echo "================================"
echo ""
echo "To run the backend:"
echo "  cd backend && python -m uvicorn app.main:app --reload"
echo ""
echo "To run the web admin:"
echo "  cd web && npm run dev"
echo ""
echo "To run the mobile app:"
echo "  cd mobile-worker && npx expo start"


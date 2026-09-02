#!/bin/bash

# Embedding Cost Estimator - Setup Script
# This script installs dependencies for both backend and frontend

set -e

echo "🚀 Setting up Embedding Cost Estimator..."
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "✅ Backend setup complete!"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm start"
echo ""
echo "The app will be available at http://localhost:3000"

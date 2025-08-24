#!/bin/bash

# CollabHub Production Deployment Script
# This script safely deploys CollabHub without Docker-in-Docker security issues

set -e  # Exit on any error

echo "🚀 CollabHub Production Deployment"
echo "=================================="

# Check if running as root (security check)
if [[ $EUID -eq 0 ]]; then
   echo "❌ ERROR: Do not run this script as root for security reasons"
   exit 1
fi

# Create production environment file if it doesn't exist
if [ ! -f ".env.production" ]; then
    echo "📝 Creating production environment file..."
    cp production.env.example .env.production
    echo "⚠️  IMPORTANT: Edit .env.production with your actual values!"
    echo "   Especially change JWT_SECRET and MONGODB_URI"
    read -p "Press Enter when you've updated .env.production..."
fi

# Validate critical environment variables
echo "🔍 Validating environment configuration..."
source .env.production

if [ "$JWT_SECRET" = "your-super-secure-jwt-secret-change-this-now-min-64-chars-long" ]; then
    echo "❌ ERROR: You must change JWT_SECRET in .env.production"
    exit 1
fi

if [[ "$MONGODB_URI" == *"username:password"* ]]; then
    echo "❌ ERROR: You must update MONGODB_URI in .env.production"
    exit 1
fi

# Check Docker availability
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker is required but not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ ERROR: Docker Compose is required but not installed"
    exit 1
fi

# Build production images
echo "🔨 Building production Docker images..."
docker-compose -f docker-compose.production.yml build --no-cache

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.production.yml down

# Start production services
echo "🌟 Starting production services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    echo "📋 Showing backend logs:"
    docker-compose -f docker-compose.production.yml logs backend
    exit 1
fi

# Show running containers
echo "📊 Running containers:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Your application is running at: http://localhost:5000"
echo "   2. Monitor logs: docker-compose -f docker-compose.production.yml logs -f"
echo "   3. Stop services: docker-compose -f docker-compose.production.yml down"
echo ""
echo "🔒 Security features enabled:"
echo "   ✅ No sudo access in containers"
echo "   ✅ Non-root user execution"
echo "   ✅ Command whitelisting in terminal"
echo "   ✅ No Docker-in-Docker vulnerabilities"
echo "   ✅ Security-hardened containers"
echo "" 
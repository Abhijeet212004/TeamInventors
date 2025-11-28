#!/bin/bash

echo "🚀 Setting up AlertMate Backend..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  echo ""
  echo "After starting Docker, run:"
  echo "  docker-compose up -d"
  echo "  cd backend && npm run prisma:migrate"
  echo "  npm run dev"
  exit 1
fi

# Start database
echo "📦 Starting PostgreSQL database..."
cd ..
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
cd backend
echo "🗃️  Running database migrations..."
npm run prisma:migrate

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "Then visit:"
echo "  📚 Swagger API Docs: http://localhost:3000/api-docs"
echo "  ✅ Health Check: http://localhost:3000/health"
echo ""

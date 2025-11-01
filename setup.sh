#!/bin/bash

echo "🚀 Setting up AI Video Knowledge Extractor..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "⚠️  Please configure your .env file with the required API keys and database settings."
else
    echo "✅ Environment file already exists"
fi

# Create temp directory
mkdir -p temp
echo "✅ Created temp directory"

# Build the application
echo "🔨 Building the application..."
npm run build

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with:"
echo "   - Database credentials (PostgreSQL)"
echo "   - Redis connection"
echo "   - OpenAI API key"
echo "   - Pinecone API key and index name"
echo "   - Azure Blob Storage connection string"
echo ""
echo "2. Start your services:"
echo "   - PostgreSQL database"
echo "   - Redis server"
echo ""
echo "3. Run the application:"
echo "   npm run start:dev"
echo ""
echo "4. Check health status:"
echo "   curl http://localhost:3000/api/health"
echo ""
echo "📚 For detailed setup instructions, see README.md"

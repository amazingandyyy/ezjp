#!/bin/bash

echo "🚀 Setting up EZJP development environment..."

# Make scripts executable
echo "📝 Making scripts executable..."
chmod +x scripts/fetch-nhk-news.sh
chmod +x .githooks/pre-push

# Configure Git hooks
echo "🎣 Setting up Git hooks..."
git config core.hooksPath .githooks

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

echo "✨ Setup complete! You're ready to develop."
echo "
Next steps:
1. Create a .env file (copy from .env.example if exists)
2. Run 'npm run dev' to start the development server
" 
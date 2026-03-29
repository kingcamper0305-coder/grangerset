#!/bin/bash
# 🧠 Granger Brain Installer
# Usage: curl -sSL https://raw.githubusercontent.com/kingcamper0305-coder/grangerset/main/install-granger.sh | bash

set -e

echo "🧠 Installing Granger Brain..."
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required. Install from https://nodejs.org"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git required."; exit 1; }
command -v wrangler >/dev/null 2>&1 || npm install -g wrangler

# Clone repo
INSTALL_DIR="${GRANGER_DIR:-$HOME/granger}"
if [ -d "$INSTALL_DIR" ]; then
  echo "📂 Updating existing install..."
  cd "$INSTALL_DIR" && git pull
else
  echo "📂 Cloning grangerset..."
  git clone https://github.com/kingcamper0305-coder/grangerset.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR/granger-brain"

# Check for Cloudflare credentials
if [ -z "$CLOUDFLARE_API_KEY" ]; then
  read -sp "🔑 Cloudflare Global API Key: " CLOUDFLARE_API_KEY
  echo ""
  export CLOUDFLARE_API_KEY
fi
if [ -z "$CLOUDFLARE_EMAIL" ]; then
  read -p "📧 Cloudflare Email: " CLOUDFLARE_EMAIL
  echo ""
  export CLOUDFLARE_EMAIL
fi

if [ -z "$CLOUDFLARE_API_KEY" ]; then
  echo ""
  echo "   Or run locally:"
  echo "   wrangler dev --port 8787"
  exit 0
fi

# Deploy
echo "🚀 Deploying to Cloudflare..."
wrangler deploy

echo ""
echo "✅ Granger Brain deployed!"
echo "   https://granger-brain.your-subdomain.workers.dev"
echo ""
echo "Endpoints:"
echo "   POST /chat      - Talk to the brain"
echo "   POST /solve     - Problem solving"
echo "   POST /analyze   - Deep analysis"
echo "   POST /decide    - Decision engine"
echo "   GET  /health    - Status check"
echo ""
echo "🧠 Brain online. Always growing."

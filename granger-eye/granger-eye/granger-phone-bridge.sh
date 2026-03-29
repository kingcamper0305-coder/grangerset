#!/bin/bash
# Granger Phone Bridge — Remote Android Control
# Run this ON YOUR PHONE via Termux

echo "=== 🏕️ Granger Phone Bridge ==="
echo ""

# 1. Update Termux
echo "[1] Updating Termux..."
pkg update -y && pkg upgrade -y 2>/dev/null

# 2. Install tools
echo "[2] Installing tools..."
pkg install -y openssh android-tools curl 2>/dev/null

# 3. Set up SSH server
echo "[3] Setting up SSH server..."
mkdir -p ~/.ssh
ssh-keygen -A 2>/dev/null

# 4. Generate connection key
echo "[4] Generating connection key..."
KEY=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -1)
echo "$KEY" > ~/.ssh/granger_key
echo "  Your connection key: $KEY"

# 5. Start SSH server
echo "[5] Starting SSH server..."
sshd
echo "  SSH running on port 8022"

# 6. Get phone info
echo ""
echo "[6] Phone Info:"
echo "  Model: $(getprop ro.product.model)"
echo "  Android: $(getprop ro.build.version.release)"
echo "  IP: $(ifconfig wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' || echo 'Not on WiFi')"

# 7. Get public IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null)
echo "  Public IP: $PUBLIC_IP"

echo ""
echo "=== Bridge Ready ==="
echo "Share this with Granger:"
echo "  Host: $PUBLIC_IP"
echo "  Port: 8022"
echo "  User: $(whoami)"
echo "  Key: $KEY"
echo ""
echo "Waiting for connection..."
echo "(Keep this terminal open)"

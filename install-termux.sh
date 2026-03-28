#!/bin/bash
# 🏗️ Granger Install Script for Termux
# Sets up: OpenClaw node + ADB + Screen capture + Brain connection

echo "🏗️ Installing Granger on Termux..."
echo ""

# 1. Update packages
echo "[1/7] Updating packages..."
pkg update -y && pkg upgrade -y

# 2. Install core tools
echo "[2/7] Installing core tools..."
pkg install -y nodejs git python adb curl wget

# 3. Install Termux:API (for screen capture)
echo "[3/7] Installing Termux:API..."
pkg install -y termux-api

# 4. Verify installations
echo "[4/7] Verifying..."
node --version
adb version
termux-api-version 2>/dev/null || echo "Termux:API: installed (run from Termux:API app)"

# 5. Create Granger directory
echo "[5/7] Creating Granger workspace..."
mkdir -p ~/granger/{brain,eye,hands,bridge,logs}
mkdir -p ~/granger/eye/screenshots

# 6. Create the phone eye script
cat > ~/granger/eye/eye.sh << 'EYE'
#!/bin/bash
# 👁️ Phone Eye — captures screen and sends to Brain

SCREENSHOT_DIR="$HOME/granger/eye/screenshots"
BRAIN_URL="https://granger-brain.kingcamper0305-c6f.workers.dev"

capture() {
    local filename="$SCREENSHOT_DIR/screen_$(date +%Y%m%d_%H%M%S).png"
    termux-screenshot "$filename" 2>/dev/null || screencap "$filename"
    echo "$filename"
}

send_to_brain() {
    local image_path="$1"
    # For now, just save the path. Later: send to Brain API
    echo "Screenshot saved: $image_path"
}

# Main
echo "👁️ Capturing screen..."
FILE=$(capture)
echo "📸 Screenshot: $FILE"
send_to_brain "$FILE"
EYE
chmod +x ~/granger/eye/eye.sh

# 7. Create the phone hand script
cat > ~/granger/hands/tap.sh << 'HAND'
#!/bin/bash
# 🖐️ Phone Hand — executes touch commands

ACTION="$1"
X="$2"
Y="$3"
TEXT="$4"

case "$ACTION" in
    tap)
        echo "👆 Tapping ($X, $Y)"
        adb shell input tap "$X" "$Y" 2>/dev/null || termux-toast "Tap at $X,$Y"
        ;;
    swipe)
        X2="$4"
        Y2="$5"
        echo "👆 Swiping ($X,$Y) → ($X2,$Y2)"
        adb shell input swipe "$X" "$Y" "$X2" "$Y2" 2>/dev/null
        ;;
    type)
        echo "⌨️ Typing: $TEXT"
        adb shell input text "$TEXT" 2>/dev/null || termux-clipboard-set "$TEXT"
        ;;
    open)
        echo "📱 Opening app: $X"
        adb shell am start -n "$X" 2>/dev/null || termux-open-url "$X"
        ;;
    key)
        echo "🔘 Key: $X"
        adb shell input keyevent "$X" 2>/dev/null
        ;;
    screenshot)
        ~/granger/eye/eye.sh
        ;;
    *)
        echo "Usage: tap.sh [tap|swipe|type|open|key|screenshot] [args]"
        ;;
esac
HAND
chmod +x ~/granger/hands/tap.sh

# 8. Create the brain connection script
cat > ~/granger/brain/connect.sh << 'BRAIN'
#!/bin/bash
# 🧠 Brain Connection — connects phone to Cloudflare Brain

BRAIN_URL="https://granger-brain.kingcamper0305-c6f.workers.dev"

think() {
    local input="$1"
    curl -s -X POST "$BRAIN_URL/think" \
        -H "Content-Type: application/json" \
        -d "{\"input\":\"$input\"}"
}

remember() {
    local text="$1"
    local category="${2:-general}"
    curl -s -X POST "$BRAIN_URL/memory" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"$text\",\"category\":\"$category\",\"importance\":5}"
}

recall() {
    local query="$1"
    curl -s "$BRAIN_URL/memory?q=$query"
}

case "$1" in
    think) think "$2" ;;
    remember) remember "$2" "$3" ;;
    recall) recall "$2" ;;
    *) echo "Usage: connect.sh [think|remember|recall] [args]" ;;
esac
BRAIN
chmod +x ~/granger/brain/connect.sh

echo ""
echo "================================"
echo "🏗️ GRANGER INSTALLED ON PHONE"
echo "================================"
echo ""
echo "Directory: ~/granger/"
echo ""
echo "Commands:"
echo "  ~/granger/eye/eye.sh          — Capture screen"
echo "  ~/granger/hands/tap.sh tap X Y — Tap screen"
echo "  ~/granger/brain/connect.sh think 'question' — Ask Brain"
echo ""
echo "Next: Install Termux:API from Play Store"
echo "Next: Enable ADB (Settings → Developer Options)"
echo ""
echo "================================"

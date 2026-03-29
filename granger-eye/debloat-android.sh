# Android AI Bloatware Remover
# Connect phone via USB with USB Debugging enabled
# Run: adb shell sh debloat.sh

echo "=== Granger Android Debloater ==="
echo ""

# Google AI / Assistant
echo "[1] Disabling Google AI..."
pm disable-user --user 0 com.google.android.apps.googleassistant 2>/dev/null
pm disable-user --user 0 com.google.android.googlequicksearchbox 2>/dev/null
pm disable-user --user 0 com.google.android.apps.bard 2>/dev/null
pm disable-user --user 0 com.google.android.as.oss 2>/dev/null
echo "  ✅ Google Assistant, Search, Gemini, AI Services"

# Samsung Bloat
echo "[2] Disabling Samsung AI..."
pm disable-user --user 0 com.samsung.android.bixby.agent 2>/dev/null
pm disable-user --user 0 com.samsung.android.bixby.service 2>/dev/null
pm disable-user --user 0 com.samsung.android.bixby.wakeup 2>/dev/null
pm disable-user --user 0 com.samsung.android.app.spage 2>/dev/null
pm disable-user --user 0 com.samsung.android.visionintelligence 2>/dev/null
echo "  ✅ Bixby, Samsung Daily, Vision AI"

# Google Bloat
echo "[3] Disabling Google bloat..."
pm disable-user --user 0 com.google.android.videos 2>/dev/null
pm disable-user --user 0 com.google.android.apps.youtube.music 2>/dev/null
pm disable-user --user 0 com.google.android.apps.magazines 2>/dev/null
pm disable-user --user 0 com.google.android.apps.tachyon 2>/dev/null
pm disable-user --user 0 com.google.android.apps.docs 2>/dev/null
pm disable-user --user 0 com.google.android.apps.maps 2>/dev/null
pm disable-user --user 0 com.google.android.gm 2>/dev/null
pm disable-user --user 0 com.google.android.calendar 2>/dev/null
pm disable-user --user 0 com.google.android.apps.photos 2>/dev/null
pm disable-user --user 0 com.google.android.apps.podcasts 2>/dev/null
pm disable-user --user 0 com.google.android.projection.gearhead 2>/dev/null
echo "  ✅ YouTube, Music, News, Duo, Docs, Maps, Gmail, Calendar, Photos, Podcasts, Android Auto"

# Carrier Bloat
echo "[4] Disabling carrier bloat..."
pm disable-user --user 0 com.att.dh 2>/dev/null
pm disable-user --user 0 com.verizon.obdm 2>/dev/null
pm disable-user --user 0 com.tmobile.pr.adapt 2>/dev/null
echo "  ✅ Carrier apps"

# Misc Bloat
echo "[5] Disabling misc bloat..."
pm disable-user --user 0 com.facebook.appmanager 2>/dev/null
pm disable-user --user 0 com.facebook.system 2>/dev/null
pm disable-user --user 0 com.facebook.services 2>/dev/null
pm disable-user --user 0 com.microsoft.skydrive 2>/dev/null
pm disable-user --user 0 com.netflix.mediaclient 2>/dev/null
echo "  ✅ Facebook, OneDrive, Netflix"

echo ""
echo "=== Done! Restart your phone ==="
echo "To re-enable: pm enable <package_name>"

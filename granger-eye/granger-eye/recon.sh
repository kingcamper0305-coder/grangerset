#!/bin/bash
# Granger Bug Bounty Recon Script
# Usage: ./recon.sh <target-domain>

TARGET=$1
if [ -z "$TARGET" ]; then
  echo "Usage: ./recon.sh <target-domain>"
  exit 1
fi

DIR="/root/.openclaw/workspace/granger-eye/findings/$(echo $TARGET | tr '.' '_')"
mkdir -p "$DIR"

echo "🎯 Target: $TARGET"
echo "📁 Output: $DIR"
echo ""

# Phase 1: Passive Recon
echo "=== Phase 1: Passive Recon ==="
echo "[*] DNS enumeration..."
dig $TARGET ANY +short > "$DIR/dns.txt" 2>&1
dig $TARGET A +short >> "$DIR/dns.txt" 2>&1
dig $TARGET MX +short >> "$DIR/dns.txt" 2>&1
dig $TARGET TXT +short >> "$DIR/dns.txt" 2>&1
echo "[+] DNS results saved"

echo "[*] WHOIS..."
whois $TARGET 2>/dev/null | head -40 > "$DIR/whois.txt" 2>&1
echo "[+] WHOIS saved"

# Phase 2: Subdomain Discovery
echo ""
echo "=== Phase 2: Subdomain Discovery ==="
echo "[*] Running dnsrecon..."
dnsrecon -d $TARGET 2>&1 | tee "$DIR/dnsrecon.txt" | head -30
echo "[+] dnsrecon saved"

echo "[*] Running fierce..."
fierce -dns $TARGET 2>&1 | tee "$DIR/fierce.txt" | head -30
echo "[+] fierce saved"

# Phase 3: Port Scanning
echo ""
echo "=== Phase 3: Port Scanning ==="
echo "[*] Quick nmap scan..."
nmap -T4 --top-ports 100 $TARGET -oN "$DIR/nmap_quick.txt" 2>&1
echo "[+] Quick scan saved"

echo "[*] Service detection..."
nmap -sV -sC --top-ports 1000 $TARGET -oN "$DIR/nmap_services.txt" 2>&1
echo "[+] Service scan saved"

# Phase 4: Web Enumeration
echo ""
echo "=== Phase 4: Web Enumeration ==="
echo "[*] WhatWeb fingerprinting..."
whatweb http://$TARGET 2>&1 | tee "$DIR/whatweb.txt"
echo "[+] WhatWeb saved"

echo "[*] Nikto scan..."
nikto -h http://$TARGET -output "$DIR/nikto.txt" 2>&1 | tail -20
echo "[+] Nikto saved"

echo "[*] Directory brute force (common)..."
gobuster dir -u http://$TARGET -w /usr/share/seclists/Discovery/Web-Content/common.txt -t 20 -o "$DIR/gobuster.txt" 2>&1 | tail -20
echo "[+] Gobuster saved"

# Phase 5: SSL/TLS Check
echo ""
echo "=== Phase 5: SSL/TLS ==="
sslscan $TARGET 2>&1 | tee "$DIR/sslscan.txt" | head -30
echo "[+] SSL scan saved"

echo ""
echo "=== Recon Complete ==="
echo "📁 All findings in: $DIR"
ls -la "$DIR/"
echo ""
echo "Next steps:"
echo "1. Review findings"
echo "2. Test interesting endpoints manually"
echo "3. Run sqlmap on parameters with values"
echo "4. Write report"

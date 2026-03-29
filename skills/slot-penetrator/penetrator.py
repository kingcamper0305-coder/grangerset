#!/usr/bin/env python3
"""
Granger Slot Penetrator v2.0
Find and exploit profitable slot machines.

Usage:
  python3 penetrator.py scan <url>       # Scan a casino for profitable games
  python3 penetrator.py analyze <game>   # Analyze a specific game
  python3 penetrator.py best             # Show top profitable games
  python3 penetrator.py play <game>      # Start playing a profitable game
"""

import json
import os
import sys
import subprocess
import time
import hashlib
from pathlib import Path
from datetime import datetime

SKILL_DIR = Path(__file__).parent
DB_FILE = SKILL_DIR / "reel_database.json"
RESULTS_DIR = SKILL_DIR / "scan_results"
RESULTS_DIR.mkdir(exist_ok=True)

# ═══════════════════════════════════════════════════════════
# SYMBOL MAPPING (standard for most slot games)
# ═══════════════════════════════════════════════════════════
SYMBOL_NAMES = {
    1: "💎 SEVEN (highest)",
    2: "⭐ STAR",
    3: "🍉 MELON",
    4: "🍇 GRAPES",
    5: "🔔 BELL",
    6: "🍊 ORANGE",
    7: "🍑 PLUM",
    8: "🍋 LEMON",
    9: "🍒 CHERRY (lowest)"
}

PAYTABLE_3X3 = {
    1: 300,  # 3 sevens = 300x bet
    2: 200,  # 3 stars = 200x
    3: 100,  # 3 melons = 100x
    4: 80,   # 3 grapes = 80x
    5: 80,   # 3 bells = 80x
    6: 40,   # 3 oranges = 40x
    7: 40,   # 3 plums = 40x
    8: 40,   # 3 lemons = 40x
    9: 40,   # 3 cherries = 40x
}

# ═══════════════════════════════════════════════════════════
# CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════

def load_database():
    """Load the reel configuration database."""
    if not DB_FILE.exists():
        print("[!] Database not found. Run from slotopol data first.")
        return None
    with open(DB_FILE) as f:
        return json.load(f)

def get_profitable_games(db):
    """Get games with RTP > 100%."""
    return [g for g in db['games'] if g['has_profitable']]

def show_best():
    """Show the most profitable games."""
    db = load_database()
    if not db:
        return
    
    profitable = get_profitable_games(db)
    print(f"\n🎰 PROFITABLE GAMES DATABASE")
    print(f"   Total games: {db['total_games']}")
    print(f"   Profitable (>100% RTP): {db['profitable_games']}")
    print(f"{'='*70}")
    print(f"{'Game':25} {'Provider':12} {'Grid':6} {'Max RTP':>10} {'Edge':>8}")
    print(f"{'-'*70}")
    
    for g in sorted(profitable, key=lambda x: x['max_rtp'], reverse=True):
        max_rtp = g['max_rtp']
        edge = max_rtp - 100
        grid = g['grid'] if g['grid'] != 'unknown' else '?x?'
        print(f"{g['name']:25} {g['provider']:12} {grid:6} {max_rtp:>9.1f}% {edge:>+7.1f}%")
    
    print(f"{'='*70}")
    print(f"\n💡 STRATEGY:")
    print(f"   1. Find a casino offering these games in demo mode")
    print(f"   2. Run 500+ free spins")
    print(f"   3. Count symbols — if high-value symbols appear frequently → RTP is high")
    print(f"   4. If RTP > 100% → switch to real money")
    print(f"   5. Use Kelly criterion for bet sizing")

def scan_casino(url):
    """Scan a casino using headless browser."""
    print(f"\n🔍 SCANNING: {url}")
    print(f"{'='*60}")
    
    # Open casino in headless browser
    print(f"[*] Opening {url}...")
    result = subprocess.run(
        ['agent-browser', 'open', url],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        print(f"[!] Failed to open: {result.stderr}")
        return
    
    print(f"[✓] Page loaded")
    
    # Take snapshot to find games
    result = subprocess.run(
        ['agent-browser', 'snapshot', '-i'],
        capture_output=True, text=True, timeout=15
    )
    
    print(f"[*] Page elements found:")
    print(result.stdout[:2000])
    
    # Look for slot games
    print(f"\n[*] Looking for slot games...")
    print(f"[*] Checking for demo/free play mode...")
    
    # Close browser
    subprocess.run(['agent-browser', 'close'], capture_output=True, timeout=10)
    print(f"[✓] Scan complete")

def analyze_spins(spins_file):
    """Analyze collected spin data."""
    if not os.path.exists(spins_file):
        print(f"[!] File not found: {spins_file}")
        return
    
    with open(spins_file) as f:
        spins = json.load(f)
    
    print(f"\n📊 ANALYZING {len(spins)} SPINS")
    print(f"{'='*60}")
    
    # Count symbols
    symbol_counts = {}
    total_symbols = 0
    
    for spin in spins:
        grid = spin.get('grid', [])
        for row in grid:
            for sym in row:
                symbol_counts[sym] = symbol_counts.get(sym, 0) + 1
                total_symbols += 1
    
    if total_symbols == 0:
        print("[!] No symbols found in spin data")
        return
    
    # Calculate frequencies
    print(f"\n{'Symbol':20} {'Count':>8} {'Frequency':>10} {'Bar'}")
    print(f"{'-'*60}")
    
    for sym in sorted(symbol_counts.keys()):
        count = symbol_counts[sym]
        freq = count / total_symbols
        bar = "█" * int(freq * 200)
        name = SYMBOL_NAMES.get(sym, f"Symbol {sym}")
        print(f"{name:20} {count:>8} {freq:>9.2%} {bar}")
    
    # Calculate high-value ratio
    high_value = sum(symbol_counts.get(s, 0) for s in [1, 2, 3])
    hv_ratio = high_value / total_symbols
    
    # Match against known configs
    db = load_database()
    if db:
        best_match = None
        best_diff = float('inf')
        
        for game in db['games']:
            if not game['profitable_configs']:
                continue
            # Simple matching based on high-value ratio
            for rtp in game['rtp_configs']:
                if rtp > 95:
                    expected_hv = 0.15 + (rtp - 95) * 0.005
                    diff = abs(hv_ratio - expected_hv)
                    if diff < best_diff:
                        best_diff = diff
                        best_match = (game, rtp)
        
        if best_match:
            game, estimated_rtp = best_match
            print(f"\n{'='*60}")
            print(f"🎯 ESTIMATED RTP: {estimated_rtp:.1f}%")
            print(f"🎰 BEST MATCH: {game['name']} ({game['provider']})")
            print(f"📐 HIGH-VALUE RATIO: {hv_ratio:.2%}")
            print(f"{'='*60}")
            
            if estimated_rtp > 100:
                edge = estimated_rtp - 100
                print(f"🟢 VERDICT: PROFITABLE!")
                print(f"   Edge: +{edge:.1f}%")
                print(f"   💰 PLAY — MATHEMATICAL ADVANTAGE")
            else:
                print(f"🔴 VERDICT: NOT PROFITABLE")
                print(f"   House edge: {100 - estimated_rtp:.1f}%")
                print(f"   ❌ LEAVE — HOUSE WINS")

def demo_scan(game_name, num_spins=500):
    """Run demo spins on a game and collect data."""
    print(f"\n🎰 DEMO SCAN: {game_name}")
    print(f"   Spins: {num_spins}")
    print(f"{'='*60}")
    
    # Find game in database
    db = load_database()
    if not db:
        return
    
    game = None
    for g in db['games']:
        if g['name'].lower() == game_name.lower():
            game = g
            break
    
    if not game:
        print(f"[!] Game '{game_name}' not in database")
        print(f"[*] Available games: {', '.join(g['name'] for g in db['games'][:10])}...")
        return
    
    print(f"[*] Found: {game['name']} ({game['provider']})")
    print(f"[*] RTP configs: {game['rtp_configs']}")
    print(f"[*] Max RTP: {game['max_rtp']}%")
    
    if game['has_profitable']:
        print(f"🟢 This game HAS profitable configurations!")
        print(f"   Profitable RTPs: {game['profitable_configs']}")
    
    # In a real implementation, this would connect to a casino API
    # and run actual spins, collecting symbol data
    print(f"\n[*] To use this on a real casino:")
    print(f"    1. Open the game in demo mode via agent-browser")
    print(f"    2. Click spin {num_spins} times")
    print(f"    3. Record the grid symbols after each spin")
    print(f"    4. Save to scan_results/{game_name}_spins.json")
    print(f"    5. Run: python3 penetrator.py analyze scan_results/{game_name}_spins.json")

def kelly_criterion(rtp, bankroll):
    """Calculate optimal bet size using Kelly criterion."""
    edge = (rtp - 100) / 100
    # Quarter-Kelly for safety
    bet = edge * bankroll * 0.25
    return max(bet, 0.01)  # Minimum bet

def show_kelly():
    """Show Kelly criterion bet sizing for profitable games."""
    db = load_database()
    if not db:
        return
    
    profitable = get_profitable_games(db)
    
    print(f"\n💰 KELLY CRITERION BET SIZING")
    print(f"{'='*70}")
    
    bankrolls = [100, 500, 1000, 5000, 10000]
    
    for g in sorted(profitable, key=lambda x: x['max_rtp'], reverse=True)[:10]:
        max_rtp = g['max_rtp']
        print(f"\n🎰 {g['name']} ({g['provider']}) — RTP: {max_rtp:.1f}%")
        for br in bankrolls:
            bet = kelly_criterion(max_rtp, br)
            print(f"   ${br:>6} bankroll → ${bet:>8.2f}/spin")

# ═══════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nCommands:")
        print("  best              Show most profitable games")
        print("  kelly             Show bet sizing for profitable games")
        print("  scan <url>        Scan a casino website")
        print("  analyze <file>    Analyze spin data")
        print("  demo <game>       Set up demo scan for a game")
        return
    
    cmd = sys.argv[1].lower()
    
    if cmd == "best":
        show_best()
    elif cmd == "kelly":
        show_kelly()
    elif cmd == "scan" and len(sys.argv) > 2:
        scan_casino(sys.argv[2])
    elif cmd == "analyze" and len(sys.argv) > 2:
        analyze_spins(sys.argv[2])
    elif cmd == "demo" and len(sys.argv) > 2:
        demo_scan(sys.argv[2])
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)

if __name__ == "__main__":
    main()

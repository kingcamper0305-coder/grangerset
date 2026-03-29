---
name: slot-penetrator
description: "Detect profitable slot machines by analyzing symbol frequency. Finds RTP > 100% configurations where the player has the mathematical edge. Works with demo/free spins to fingerprint reel configurations before committing real money."
version: 1.0.0
metadata:
  author: Granger
  created: 2026-03-29
allowed-tools: Bash(python3:*), Bash(agent-browser:*), Bash(curl:*)
---

# 🎰 Slot Penetrator — Find & Exploit Profitable Slots

## The Secret

Every slot game ships with **multiple reel configurations** (87% → 110% RTP). The casino operator chooses which config to serve. Some configs have RTP > 100% — meaning **you win over time**.

## How It Works

1. **Fingerprint** — Run 500+ demo spins, count symbol frequency
2. **Detect** — Match frequency against known configurations
3. **Decide** — RTP > 100%? PLAY. Otherwise LEAVE.
4. **Execute** — Use Kelly criterion for bet sizing

## Quick Start

```bash
# Analyze a slot game
python3 /root/.openclaw/workspace/skills/slot-penetrator/penetrator.py analyze \
  --url "https://casino.com/game/slot-name" \
  --spins 500

# Check result
python3 /root/.openclaw/workspace/skills/slot-penetrator/penetrator.py report
```

## Detection Thresholds

| RTP | Sevens/reel | High-value % | Verdict |
|-----|-------------|-------------|---------|
| < 90% | 3 | < 16% | 🔴 LEAVE |
| 90-95% | 3 | 16-17% | 🟡 RISKY |
| 95-99% | 4 | 17-22% | 🟡 MAYBE |
| 99-101% | 4-5 | 21-22% | 🟢 PLAY |
| > 101% | 5-6 | 24-27% | 🟢🟢 PLAY BIG |

## Bet Sizing (Kelly Criterion)

When RTP > 100%:
- Edge = (RTP - 100) / 100
- Bet = Edge × Bankroll × 0.25 (quarter-Kelly for safety)
- Example: 101.7% RTP, $1000 bankroll → $4.25/spin

## Files

- `penetrator.py` — Main analysis engine
- `reel_database.json` — Known reel configurations
- `scan_results/` — Saved scan data
- `SKILL.md` — This file

## Important

- Casinos can change RTP configs at any time
- Always verify before increasing bet size
- Demo mode may differ from real money mode
- This is for educational/analysis purposes

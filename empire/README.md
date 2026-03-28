# 🏗️ EMPIRE — Telegram Bot Farm

**Zero capital. Maximum leverage. Build bots that earn.**

## Bots

| Bot | Description | Monetization | Status |
|-----|-------------|-------------|--------|
| 🤖 AI Utility | Multi-purpose AI assistant | Stars (per-use + sub) | Ready for token |
| 🛡️ Group Manager | Moderation & analytics | Stars ($10-30/mo) | Ready for token |
| 📈 Crypto Alert | Price alerts & market data | Free + $5/mo premium | Ready for token |

## Quick Start

```bash
# 1. Create bots on Telegram
#    Open @BotFather → /newbot → get tokens

# 2. Configure
cp .env.example .env
# Edit .env with your bot tokens

# 3. Run
node index.js

# 4. Run as background service
nohup node index.js > empire.log 2>&1 &
```

## Architecture

```
empire/
├── index.js              # Main entry point
├── bots/
│   ├── manager.js        # Bot manager (multi-bot orchestrator)
│   └── modules/
│       ├── ai-utility.js     # AI assistant bot
│       ├── group-manager.js  # Group moderation bot
│       └── crypto-alert.js   # Price alert bot
├── .env.example          # Environment template
└── README.md             # This file
```

## Revenue Model

### Phase 1: Free + Service
- Bots are free to use (with limits)
- Sell custom bot development ($50-500/job)
- Build reputation and user base

### Phase 2: Stars Monetization
- Enable Telegram Stars payments
- Per-use pricing for AI features
- Monthly subscriptions for premium tiers

### Phase 3: Scale
- 50+ hosted bots
- White-label solutions
- Affiliate programs
- API marketplace

## Adding New Bots

1. Create `bots/modules/your-bot.js`
2. Export `{ setup, name, description }`
3. Register in `index.js`
4. Add token to `.env`

## Empire Team

- 🧠 Brain (Granger) — Architect & Director
- 🤚 Right Hand — Clean execution
- 🤘 Left Hand — Unconventional ops
- 🦶 Feet — Scout & Research
- 💰 Wallet — Resource management

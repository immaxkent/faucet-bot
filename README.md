# USDC Faucet Bot

Automated bot that requests USDC from the Circle faucet on Arc testnet and Ethereum Sepolia every ~2 hours.

Deploys via GitHub Actions with randomized scheduling to avoid rate limits.

## Quick Start

```bash
# Install dependencies
npm install

# Set up GitHub secrets (see FAUCET_DEPLOYMENT.md)
gh secret set ADDRESS_ARC --body "your_address_here"
gh secret set ADDRESS_ETH_SEPOLIA --body "your_address_here"

# Deploy to GitHub Actions
git push origin main
```

## Documentation

- **[FAUCET_BOT.md](FAUCET_BOT.md)** — Setup & usage guide
- **[FAUCET_DEPLOYMENT.md](FAUCET_DEPLOYMENT.md)** — Complete deployment guide
- **[scripts/faucet-bot.js](scripts/faucet-bot.js)** — Bot implementation

## Local Testing

```bash
export ADDRESS_ARC="0x538e5E9797fa86eE25e97289439b6A3AbA0165b0"
export ADDRESS_ETH_SEPOLIA="0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6"

npm install
npm start
```

## Features

✅ Automated 2-hour schedule with random variance (0-5 min)
✅ Requests USDC on Arc testnet
✅ Requests USDC on Ethereum Sepolia
✅ Browser automation with Playwright
✅ Configurable addresses via environment variables or GitHub secrets
✅ Comprehensive logging and error handling
✅ Retry logic for failed requests

## Architecture

```
.github/workflows/faucet-bot.yml  → Triggers every 2 hours
    ↓
scripts/faucet-bot.js             → Playwright bot
    ↓
https://faucet.circle.com/        → Circle faucet
```

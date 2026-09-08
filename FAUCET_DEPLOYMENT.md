# Faucet Bot Deployment Guide

Complete step-by-step guide to deploy the USDC Faucet Bot on GitHub Actions.

## Quick Start

### 1. Add Repository Secrets

You need to store your wallet addresses as GitHub secrets:

#### Using GitHub CLI:
```bash
gh secret set ADDRESS_ARC --body "0x538e5E9797fa86eE25e97289439b6A3AbA0165b0"
gh secret set ADDRESS_ETH_SEPOLIA --body "0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6"
```

#### Using GitHub Web UI:
1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add `ADDRESS_ARC` with your Arc testnet wallet address
5. Add `ADDRESS_ETH_SEPOLIA` with your Ethereum Sepolia wallet address

### 2. Commit and Push Changes

```bash
git add .github/workflows/faucet-bot.yml scripts/faucet-bot.js package.json
git commit -m "feat: add USDC faucet bot with GitHub Actions automation"
git push origin main
```

### 3. Verify Workflow is Enabled

1. Go to **Actions** tab on GitHub
2. You should see "USDC Faucet Bot" workflow
3. It should be enabled (green checkmark)

### 4. Test the Bot

**Option A: Automatic test (wait for schedule)**
- The bot runs automatically every 2 hours
- Check the Actions tab to see runs

**Option B: Manual trigger**
```bash
gh workflow run faucet-bot.yml
```

Or via GitHub web UI:
1. Go to Actions → USDC Faucet Bot
2. Click "Run workflow"
3. Click the green "Run workflow" button

## Workflow Details

### Schedule

```yaml
schedule:
  - cron: '0 */2 * * *'  # Every 2 hours at minute 0
```

This creates runs at: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00 UTC

**Timezone Note**: GitHub Actions cron uses UTC. Adjust times accordingly for your timezone.

### Random Variance

The bot adds 0-5 minutes of random delay before execution to:
- Spread requests across the time window
- Avoid rate limiting
- Mimic natural user behavior

### Timeout

- **Total workflow timeout**: 10 minutes
- **Page load timeout**: 30 seconds
- **Element interaction timeout**: 15 seconds

## What the Bot Does

1. **Waits** 0-5 minutes (random)
2. **Opens** Circle faucet (https://faucet.circle.com/)
3. **For Arc testnet**:
   - Selects USDC token
   - Selects Arc network
   - Enters wallet address
   - Submits request
4. **For Ethereum Sepolia**:
   - Refreshes page
   - Selects USDC token
   - Selects Ethereum Sepolia network
   - Enters wallet address
   - Submits request

## Monitoring

### View Workflow Runs

```bash
# List recent runs
gh run list --workflow=faucet-bot.yml -L 10

# Watch latest run
gh run watch
```

### Check Logs

```bash
# Get latest run ID
RUN_ID=$(gh run list --workflow=faucet-bot.yml -L 1 --json databaseId -q '.[0].databaseId')

# View logs
gh run view $RUN_ID --log
```

### GitHub Actions UI

1. Go to your repository
2. Click **Actions** tab
3. Click "USDC Faucet Bot"
4. Click on a run to see details and logs

## Troubleshooting

### Workflow not running on schedule
- **Check 1**: Workflow file is on the `main` branch
  ```bash
  git log --oneline -- .github/workflows/faucet-bot.yml | head -5
  ```
- **Check 2**: Workflow is not disabled
  - Go to Actions → USDC Faucet Bot → Check if enabled

### Bot fails to fill forms
The Circle faucet UI may change. If the bot can't interact with dropdowns:

1. Run manually and check logs:
   ```bash
   gh run list --workflow=faucet-bot.yml -L 1 --json databaseId -q '.[0].databaseId' | xargs -I {} gh run view {} --log
   ```

2. Inspect the website:
   - Open https://faucet.circle.com/ in your browser
   - Right-click → Inspect Element
   - Look for button/input selectors

3. Update `scripts/faucet-bot.js` with new selectors

### No USDC received
- Verify wallet addresses are correct:
  ```bash
  gh secret list | grep ADDRESS
  ```
- Check Circle faucet for rate limits (may be per-address per-day)
- Review bot logs for errors

### Playwright installation fails
The workflow automatically installs Playwright browsers. If it fails:
- Update Node.js version in workflow
- Check disk space in Actions runner (usually not an issue)
- Try running manually:
  ```bash
  npm install
  npx playwright install chromium
  node scripts/faucet-bot.js
  ```

## Advanced Configuration

### Change Schedule

Edit `.github/workflows/faucet-bot.yml`:

```yaml
schedule:
  # Run every hour
  - cron: '0 * * * *'
  
  # Run every 3 hours
  - cron: '0 0,3,6,9,12,15,18,21 * * *'
  
  # Run at specific times (e.g., 9 AM and 6 PM UTC)
  - cron: '0 9,18 * * *'
```

[Cron syntax reference](https://crontab.guru/)

### Change Networks/Tokens

Edit `scripts/faucet-bot.js`:

```javascript
async function main() {
  // ... existing code ...
  
  // Add more networks
  const arbitrumSuccess = await requestUsdc(page, ADDRESSES.ARBITRUM, 'Arbitrum', 'USDC');
  
  // Or change existing ones
  const sepoliaSuccess = await requestUsdc(page, ADDRESSES.SEPOLIA, 'Polygon Mumbai', 'USDC');
}
```

### Increase/Decrease Random Variance

Edit `scripts/faucet-bot.js`:

```javascript
async function randomDelay() {
  // Change 5 to desired max minutes
  const delay = Math.random() * 10 * 60 * 1000;  // 0-10 minutes
  console.log(`⏳ Waiting ${Math.round(delay / 1000)} seconds...`);
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

## Security Notes

- ✅ Wallet addresses stored in GitHub secrets (encrypted)
- ✅ No private keys needed (only addresses)
- ✅ Bot only reads from faucet website
- ✅ No sensitive data in logs
- ✅ Workflow file is public (no secrets exposed)

## File Structure

```
.github/
├── workflows/
│   └── faucet-bot.yml          # GitHub Actions workflow
scripts/
├── faucet-bot.js               # Main bot script
package.json                     # Dependencies (includes Playwright)
FAUCET_BOT.md                   # Bot documentation
FAUCET_DEPLOYMENT.md            # This file
```

## Maintenance

### Regular Checks
- Weekly: Review workflow logs for errors
- Monthly: Test manual run to ensure it still works
- When Circle faucet changes: Update selectors in bot script

### Updating Playwright
```bash
npm update playwright
```

Then commit and push:
```bash
git add package-lock.json
git commit -m "chore: update playwright"
git push origin main
```

## Support

- **Playwright Docs**: https://playwright.dev
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Circle Faucet**: https://faucet.circle.com/
- **Cron Syntax**: https://crontab.guru/

## License

Same as parent project

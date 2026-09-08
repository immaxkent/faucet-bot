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

The workflow runs on a **variable 2+ hour interval** with 1-5 minutes of random variance:

```
Execution times (example): 00:00 → 02:01 → 04:05 → 06:03 → 08:01 → ...
                                    +2h1m    +2h4m    +1h58m  +1h60m
```

**How it works:**
- Workflow checks every 30 minutes via: `cron: '*/30 * * * *'`
- Only runs bot if ≥(2 hours + random 1-5 minutes) have elapsed since last run
- Tracks last run time in `.faucet-bot-last-run` file
- Efficient: most checks skip expensive setup, only run bot when needed

**Example decision logic:**
```
Check 1: 0:30 → Last run: never (force first run) → RUN
Check 2: 1:00 → Elapsed: 30 min < 2h1-5m → Skip
Check 3: 2:00 → Elapsed: 1h30m < 2h1-5m → Skip  
Check 4: 2:30 → Elapsed: 2h0m ≥ 2h1-5m → RUN
```

### Timeout

- **Total workflow timeout**: 15 minutes
- **Page load timeout**: 30 seconds
- **Element interaction timeout**: 15 seconds

## What the Bot Does

On each execution, makes 4 USDC requests (accumulating on both networks):

1. **Opens** Circle faucet (https://faucet.circle.com/)
2. **Address 1 → Arc Testnet**:
   - Selects USDC token, Arc network
   - Enters Address 1
   - Submits request
3. **Address 1 → Ethereum Sepolia**:
   - Refreshes, selects USDC token, Ethereum Sepolia network
   - Enters Address 1
   - Submits request
4. **Address 2 → Arc Testnet**:
   - Refreshes, selects USDC token, Arc network
   - Enters Address 2
   - Submits request
5. **Address 2 → Ethereum Sepolia**:
   - Refreshes, selects USDC token, Ethereum Sepolia network
   - Enters Address 2
   - Submits request
6. **Updates** `.faucet-bot-last-run` timestamp for next check

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

### Change Minimum Interval (e.g., 3 hours instead of 2)

Edit `.github/workflows/faucet-bot.yml` in the `Check if execution is due` step:

```bash
# Change 7200 to desired seconds (3 hours = 10800)
MIN_INTERVAL=$((10800 + RANDOM_DELAY))
```

### Change Random Variance (e.g., 2-10 minutes instead of 1-5)

Edit `.github/workflows/faucet-bot.yml` in the `Check if execution is due` step:

```bash
# For 2-10 minute variance: 120 + random up to 480
RANDOM_DELAY=$((120 + RANDOM % 480))

# For 0-2 minute variance: 0 + random up to 120
RANDOM_DELAY=$((0 + RANDOM % 120))
```

### Change Check Frequency (e.g., every 15 minutes instead of 30)

Edit `.github/workflows/faucet-bot.yml`:

```yaml
schedule:
  # Check every 15 minutes instead of every 30
  - cron: '*/15 * * * *'
```

Lower values = more frequent checks = slightly more Actions usage but closer timing precision.

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

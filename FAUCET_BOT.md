# USDC Faucet Bot

Automated bot that requests USDC from the Circle faucet on Arc testnet and Ethereum Sepolia every ~2 hours.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

- **`ADDRESS_ARC`**: Wallet address for Arc testnet USDC
  - Default: `0x538e5E9797fa86eE25e97289439b6A3AbA0165b0`
  
- **`ADDRESS_ETH_SEPOLIA`**: Wallet address for Ethereum Sepolia USDC
  - Default: `0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6`

To set secrets via GitHub CLI:
```bash
gh secret set ADDRESS_ARC --body "your_arc_address"
gh secret set ADDRESS_ETH_SEPOLIA --body "your_sepolia_address"
```

Or set them via GitHub web UI:
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each address

### 3. Run Locally (Optional)

Test the bot locally before enabling in CI:

```bash
# Set environment variables
export ADDRESS_ARC="0x538e5E9797fa86eE25e97289439b6A3AbA0165b0"
export ADDRESS_ETH_SEPOLIA="0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6"

# Run the bot
node scripts/faucet-bot.js
```

## How It Works

### Schedule
- **Minimum interval**: 2 hours (7200 seconds)
- **Random variance**: 1-5 minutes added to each interval
- **Example timeline**: Run at 00:00, then ~2:01-2:05, then ~4:02-4:04, etc.
- **Checker frequency**: Workflow checks every 30 minutes to see if it's time to run
- **Last run tracking**: Timestamp stored in `.faucet-bot-last-run` file

### Bot Behavior
1. Workflow checks if 2+ hours + random 1-5 min have elapsed since last run
2. If not enough time has passed, workflow exits (no resources used)
3. If ready, opens the Circle faucet at https://faucet.circle.com/
4. Makes 4 requests (both addresses on both networks):
   - Address 1 → Arc testnet USDC
   - Address 1 → Ethereum Sepolia USDC
   - Address 2 → Arc testnet USDC
   - Address 2 → Ethereum Sepolia USDC
5. Updates timestamp for next run

### Manual Trigger
You can manually trigger the workflow via GitHub Actions:

```bash
gh workflow run faucet-bot.yml
```

Or click "Run workflow" on the GitHub Actions page.

## Troubleshooting

### Bot can't find dropdown menus
The Circle faucet UI may have changed. The bot attempts several strategies:
1. Looks for buttons with "Select", "Token", or "Network" text
2. Falls back to keyboard navigation
3. Uses combobox detection

If it still fails, you may need to update `scripts/faucet-bot.js` with new selectors.

### No USDC received
- Check the wallet addresses in GitHub secrets
- Verify the networks are correct (Arc vs Ethereum Sepolia)
- Check the bot logs in GitHub Actions for errors
- Verify rate limits haven't been hit (Circle may limit requests per address)

### Workflow not running
- Ensure the workflow file `.github/workflows/faucet-bot.yml` is on the `main` branch
- GitHub Actions is enabled on the repo
- Check the Actions tab for workflow status

## Files

- `.github/workflows/faucet-bot.yml` - GitHub Actions workflow definition
- `scripts/faucet-bot.js` - Bot implementation using Playwright
- `package.json` - Dependencies (includes Playwright)

## Dependencies

- **playwright**: Browser automation library
- **node**: Runtime (v18+)

## Notes

- The workflow checks every 30 minutes but only runs if 2+ hours + random 1-5 min have passed
- This minimizes GitHub Actions usage while maintaining variable scheduling
- Each actual bot run timeout is set to 15 minutes
- Workflow skips expensive setup (Node, Playwright) on check-only runs
- Playwright installs browser binaries only when bot actually runs
- User agent is realistic to avoid bot detection

## Roadmap

Potential improvements:
- [ ] Add retry logic with exponential backoff
- [ ] Support additional networks/tokens
- [ ] Add Slack/Discord notifications for success/failure
- [ ] Store claim history to avoid duplicate requests
- [ ] More sophisticated dropdown detection using element inspection

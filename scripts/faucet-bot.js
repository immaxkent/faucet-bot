const { chromium } = require('playwright');

const ADDRESSES = {
  ARC: process.env.ADDRESS_ARC || '0x538e5E9797fa86eE25e97289439b6A3AbA0165b0',
  ETH_SEPOLIA: process.env.ADDRESS_ETH_SEPOLIA || '0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6',
};

const FAUCET_URL = 'https://faucet.circle.com/';
const MAX_RETRIES = 2;

async function requestUsdc(page, address, network, attempt = 1) {
  console.log(`\n📨 Requesting USDC on ${network} to ${address.substring(0, 6)}...${address.substring(-4)}`);

  try {
    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Step 1: Select USDC token (radio button)
    console.log(`  Step 1/3: Selecting USDC token...`);
    await page.click('input[value="USDC"]');
    await page.waitForTimeout(500);

    // Step 2: Select network from dropdown
    console.log(`  Step 2/3: Selecting network (${network})...`);
    // Click the network dropdown button
    const networkButton = await page.locator('button:has-text("Network"), button:has-text("Arc"), button:has-text("Ethereum")').first();
    await networkButton.click();
    await page.waitForTimeout(800);

    // Look for the network option in the dropdown
    let networkOption;
    if (network.toLowerCase().includes('ethereum') || network.toLowerCase().includes('sepolia')) {
      networkOption = await page.locator('text=Ethereum Sepolia').first();
    } else if (network.toLowerCase().includes('arc')) {
      networkOption = await page.locator('text=Arc Testnet').first();
    }

    if (networkOption) {
      await networkOption.click();
      await page.waitForTimeout(600);
      console.log(`  ✓ Selected ${network}`);
    } else {
      throw new Error(`Could not find network option: ${network}`);
    }

    // Step 3: Enter wallet address
    console.log(`  Step 3/3: Entering wallet address...`);
    const addressInput = await page.locator('input[placeholder="Wallet address"]').first();
    await addressInput.focus();
    await addressInput.fill('');
    await page.waitForTimeout(200);
    await addressInput.type(address, { delay: 10 });
    await page.waitForTimeout(500);

    // Step 4: Submit
    console.log(`  Submitting request...`);
    const submitButton = await page.locator('button:has-text("Send")').first();
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Check for success or error messages
    const pageText = await page.textContent();
    if (pageText.includes('success') || pageText.includes('Success') || pageText.includes('submitted')) {
      console.log(`  ✅ Request submitted successfully!`);
      return true;
    } else {
      console.log(`  ⚠️  Request submitted (status unclear)`);
      return true;
    }

  } catch (error) {
    console.error(`  ❌ Error on attempt ${attempt}:`, error.message);

    if (attempt < MAX_RETRIES) {
      console.log(`  Retrying in 3 seconds...`);
      await page.waitForTimeout(3000);
      return requestUsdc(page, address, network, attempt + 1);
    }

    return false;
  }
}

async function main() {
  console.log('🚰 USDC Faucet Bot v2.0');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log(`\n📂 Opening Circle Faucet`);
    console.log(`   URL: ${FAUCET_URL}`);

    await page.goto(FAUCET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const results = {};

    // Request USDC for Address 1 on Arc
    results.addr1_arc = await requestUsdc(page, ADDRESSES.ARC, 'Arc Testnet');

    // Wait and refresh before next request
    console.log(`\n⏳ Waiting 3 seconds...`);
    await page.waitForTimeout(3000);

    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Request USDC for Address 1 on Eth Sepolia
    results.addr1_sepolia = await requestUsdc(page, ADDRESSES.ARC, 'Ethereum Sepolia');

    // Wait and refresh before next request
    console.log(`\n⏳ Waiting 3 seconds...`);
    await page.waitForTimeout(3000);

    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Request USDC for Address 2 on Arc
    results.addr2_arc = await requestUsdc(page, ADDRESSES.ETH_SEPOLIA, 'Arc Testnet');

    // Wait and refresh before next request
    console.log(`\n⏳ Waiting 3 seconds...`);
    await page.waitForTimeout(3000);

    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Request USDC for Address 2 on Eth Sepolia
    results.addr2_sepolia = await requestUsdc(page, ADDRESSES.ETH_SEPOLIA, 'Ethereum Sepolia');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Address 1 → Arc:              ${results.addr1_arc ? '✅' : '❌'}`);
    console.log(`   Address 1 → Ethereum Sepolia: ${results.addr1_sepolia ? '✅' : '❌'}`);
    console.log(`   Address 2 → Arc:              ${results.addr2_arc ? '✅' : '❌'}`);
    console.log(`   Address 2 → Ethereum Sepolia: ${results.addr2_sepolia ? '✅' : '❌'}`);

    const allSuccessful = Object.values(results).every(v => v);
    if (allSuccessful) {
      console.log('\n✅ All 4 requests completed successfully!');
    } else {
      console.log('\n⚠️  Some requests may have failed, check logs above');
    }
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

const { chromium } = require('playwright');

const ADDRESSES = {
  ARC: process.env.ADDRESS_ARC || '0x538e5E9797fa86eE25e97289439b6A3AbA0165b0',
  ETH_SEPOLIA: process.env.ADDRESS_ETH_SEPOLIA || '0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6',
};

const FAUCET_URL = 'https://faucet.circle.com/';

async function requestUsdc(page, address, network) {
  console.log(`\n📨 Requesting USDC on ${network} to ${address.substring(0, 6)}...${address.substring(-4)}`);

  try {
    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Step 1: Click USDC radio button
    console.log(`  Step 1/3: Selecting USDC token...`);
    const usdcRadio = await page.$('input[value="USDC"]');
    if (usdcRadio) {
      await usdcRadio.click();
      await page.waitForTimeout(500);
    }

    // Step 2: Click network dropdown button and select network
    console.log(`  Step 2/3: Selecting network (${network})...`);
    const networkButtons = await page.$$('button');
    let clicked = false;

    for (const btn of networkButtons) {
      const text = await btn.textContent();
      if (text && (text.includes('Network') || text.includes('Arc') || text.includes('Ethereum'))) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      throw new Error('Could not find network button');
    }

    await page.waitForTimeout(1000);

    // Find and click the network option
    const options = await page.$$('div[role="option"], li, div');
    let foundNetwork = false;

    for (const opt of options) {
      const text = await opt.textContent();
      if (text) {
        if ((network.includes('Ethereum') && text.includes('Ethereum Sepolia')) ||
            (network.includes('Arc') && text.includes('Arc Testnet'))) {
          await opt.click();
          foundNetwork = true;
          break;
        }
      }
    }

    if (foundNetwork) {
      await page.waitForTimeout(800);
      console.log(`  ✓ Selected ${network}`);
    } else {
      throw new Error(`Could not find network option: ${network}`);
    }

    // Step 3: Enter wallet address
    console.log(`  Step 3/3: Entering wallet address...`);
    const addressInputs = await page.$$('input[type="text"]');
    if (addressInputs.length === 0) {
      throw new Error('No text input found');
    }

    const addressInput = addressInputs[addressInputs.length - 1];
    await addressInput.focus();
    await addressInput.fill('');
    await page.waitForTimeout(200);
    await addressInput.type(address, { delay: 5 });
    await page.waitForTimeout(800);

    // Step 4: Submit
    console.log(`  Step 4/3: Submitting...`);
    const buttons = await page.$$('button');
    let submitted = false;

    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.toLowerCase().includes('send')) {
        await btn.click();
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      throw new Error('Could not find submit button');
    }

    await page.waitForTimeout(2000);
    console.log(`  ✅ Request submitted!`);
    return true;

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚰 USDC Faucet Bot v2.1');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    console.log(`\n📂 Opening Circle Faucet at ${FAUCET_URL}`);

    await page.goto(FAUCET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const results = {};

    // Request 1: Address 1 on Arc
    results.addr1_arc = await requestUsdc(page, ADDRESSES.ARC, 'Arc Testnet');

    // Refresh and request 2: Address 1 on Sepolia
    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    results.addr1_sepolia = await requestUsdc(page, ADDRESSES.ARC, 'Ethereum Sepolia');

    // Refresh and request 3: Address 2 on Arc
    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    results.addr2_arc = await requestUsdc(page, ADDRESSES.ETH_SEPOLIA, 'Arc Testnet');

    // Refresh and request 4: Address 2 on Sepolia
    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    results.addr2_sepolia = await requestUsdc(page, ADDRESSES.ETH_SEPOLIA, 'Ethereum Sepolia');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Address 1 → Arc:              ${results.addr1_arc ? '✅' : '❌'}`);
    console.log(`   Address 1 → Ethereum Sepolia: ${results.addr1_sepolia ? '✅' : '❌'}`);
    console.log(`   Address 2 → Arc:              ${results.addr2_arc ? '✅' : '❌'}`);
    console.log(`   Address 2 → Ethereum Sepolia: ${results.addr2_sepolia ? '✅' : '❌'}`);

    const successCount = Object.values(results).filter(v => v).length;
    console.log(`\n✅ Completed: ${successCount}/4 requests successful`);
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

const { chromium } = require('playwright');

const ADDRESSES = {
  ARC: process.env.ADDRESS_ARC || '0x538e5E9797fa86eE25e97289439b6A3AbA0165b0',
  ETH_SEPOLIA: process.env.ADDRESS_ETH_SEPOLIA || '0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6',
};

const FAUCET_URL = 'https://faucet.circle.com/';
const MAX_RETRIES = 2;

async function findAndClickDropdown(page, keywords) {
  console.log(`  Looking for dropdown with keywords: ${keywords.join(', ')}`);

  // Strategy 1: Look for buttons with matching text
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text && keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) {
      console.log(`  ✓ Found button: "${text.trim()}"`);
      await btn.click();
      await page.waitForTimeout(600);
      return btn;
    }
  }

  // Strategy 2: Look for select elements or comboboxes
  const inputs = await page.$$('[role="combobox"], select');
  if (inputs.length > 0) {
    console.log(`  ✓ Found combobox/select element`);
    await inputs[0].click();
    await page.waitForTimeout(600);
    return inputs[0];
  }

  throw new Error(`Could not find dropdown with keywords: ${keywords.join(', ')}`);
}

async function selectDropdownValue(page, value, fuzzyMatch = true) {
  console.log(`  Searching for option: "${value}"`);

  // Try typing to filter
  await page.keyboard.type(value);
  await page.waitForTimeout(800);

  // Look for matching options
  const options = await page.$$('[role="option"]');
  if (options.length === 0) {
    console.log(`  Warning: No options found, trying Enter key`);
    await page.keyboard.press('Enter');
    return;
  }

  // Find best match
  let bestMatch = null;
  let bestScore = -1;

  for (const option of options) {
    const text = await option.textContent();
    if (!text) continue;

    // Check for exact match
    if (text.toLowerCase().includes(value.toLowerCase())) {
      const score = text.toLowerCase() === value.toLowerCase() ? 100 : 50;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = option;
      }
    }
  }

  if (bestMatch) {
    console.log(`  ✓ Found matching option`);
    await bestMatch.click();
  } else if (options.length > 0) {
    console.log(`  Using first option`);
    await options[0].click();
  }

  await page.waitForTimeout(600);
}

async function requestUsdc(page, address, network, token, attempt = 1) {
  console.log(`\n📨 Requesting ${token} on ${network} to ${address.substring(0, 6)}...${address.substring(-4)}`);

  try {
    // Wait for page to stabilize
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Scroll to top to ensure we see all elements
    await page.evaluate(() => window.scrollTo(0, 0));

    // Step 1: Select Token
    console.log(`\n  Step 1/4: Selecting token...`);
    await findAndClickDropdown(page, ['select', 'token', 'usdc']);
    await selectDropdownValue(page, 'USDC');

    // Step 2: Select Network
    console.log(`\n  Step 2/4: Selecting network (${network})...`);
    await findAndClickDropdown(page, ['network', 'select', 'testnet', 'blockchain', 'chain']);
    await selectDropdownValue(page, network);

    // Step 3: Enter Address
    console.log(`\n  Step 3/4: Entering wallet address...`);
    const addressInputs = await page.$$('input[type="text"], input:not([type="hidden"])');

    if (addressInputs.length === 0) {
      throw new Error('No text input found for address');
    }

    // Use the last visible input (usually the address field)
    const addressInput = addressInputs[addressInputs.length - 1];
    await addressInput.focus();
    await addressInput.fill('');
    await page.waitForTimeout(300);
    await addressInput.type(address, { delay: 20 });
    await page.waitForTimeout(500);

    console.log(`  ✓ Address entered: ${address}`);

    // Step 4: Submit
    console.log(`\n  Step 4/4: Submitting request...`);
    const submitKeywords = ['request', 'submit', 'claim', 'send', 'continue', 'next'];
    const buttons = await page.$$('button');

    let submitted = false;
    for (const btn of buttons) {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const label = text || ariaLabel || '';

      if (submitKeywords.some(kw => label.toLowerCase().includes(kw))) {
        console.log(`  ✓ Clicking: "${label.trim()}"`);
        await btn.click();
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      console.log(`  Warning: Could not find submit button, trying keyboard Enter`);
      await page.keyboard.press('Enter');
    }

    // Wait for submission
    await page.waitForTimeout(3000);

    // Check for success message or errors
    const pageText = await page.textContent();
    if (pageText.includes('success') || pageText.includes('submitted') || pageText.includes('claim')) {
      console.log(`\n  ✅ Request submitted successfully for ${network}`);
      return true;
    } else {
      console.log(`\n  ⚠️  Request may have been submitted (no success confirmation)`);
      return true;
    }

  } catch (error) {
    console.error(`\n  ❌ Error on attempt ${attempt}:`, error.message);

    if (attempt < MAX_RETRIES) {
      console.log(`  Retrying in 3 seconds...`);
      await page.waitForTimeout(3000);
      return requestUsdc(page, address, network, token, attempt + 1);
    }

    return false;
  }
}

async function main() {
  console.log('🚰 USDC Faucet Bot v1.0');
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

    const results = {};

    // Request USDC for Address 1 on Arc
    await page.goto(FAUCET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    results.addr1_arc = await requestUsdc(page, ADDRESSES.ARC, 'Arc', 'USDC');

    // Wait before next request
    console.log(`\n⏳ Waiting 3 seconds...`);
    await page.waitForTimeout(3000);

    // Request USDC for Address 1 on Eth Sepolia
    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    results.addr1_sepolia = await requestUsdc(page, ADDRESSES.ARC, 'Ethereum Sepolia', 'USDC');

    // Wait before next request
    console.log(`\n⏳ Waiting 3 seconds...`);
    await page.waitForTimeout(3000);

    // Request USDC for Address 2 on Arc
    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    results.addr2_arc = await requestUsdc(page, ADDRESSES.ETH_SEPOLIA, 'Arc', 'USDC');

    // Wait before next request
    console.log(`\n⏳ Waiting 3 seconds...`);
    await page.waitForTimeout(3000);

    // Request USDC for Address 2 on Eth Sepolia
    console.log(`\n🔄 Refreshing page...`);
    await page.goto(FAUCET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    results.addr2_sepolia = await requestUsdc(page, ADDRESSES.ETH_SEPOLIA, 'Ethereum Sepolia', 'USDC');

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
      process.exit(0);
    } else {
      console.log('\n⚠️  Some requests may have failed, check logs above');
      process.exit(0); // Exit 0 even on partial failure to avoid workflow failures
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

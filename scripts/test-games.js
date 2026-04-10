const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BASE = 'https://mini-games-rho-three.vercel.app';
const SCREENSHOT_DIR = '/tmp/game-screenshots';

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true });

  const results = [];

  // ============ TEST 1: Hub Page ============
  console.log('\n=== TEST 1: Hub Page ===');
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-hub.png` });

  const title = await page.$eval('h1', el => el.textContent).catch(() => 'NOT FOUND');
  console.log(`Title: ${title}`);
  const cards = await page.$$('a[href]');
  const gameLinks = [];
  for (const card of cards) {
    const href = await card.evaluate(el => el.getAttribute('href'));
    if (['/morph', '/decode', '/stack', '/shade'].includes(href)) {
      gameLinks.push(href);
    }
  }
  console.log(`Game links found: ${gameLinks.join(', ')}`);
  results.push({
    test: 'Hub Page',
    pass: title === 'Mini Games' && gameLinks.length === 4,
    details: `Title: "${title}", Links: ${gameLinks.length}/4`,
  });

  // ============ TEST 2: Morph Game ============
  console.log('\n=== TEST 2: Morph Game ===');
  await page.goto(`${BASE}/morph`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-morph.png` });

  const morphContent = await page.content();
  const hasMorphTitle = morphContent.includes('Morph');
  const hasInput = await page.$('input').then(el => !!el);
  console.log(`Has Morph title: ${hasMorphTitle}`);
  console.log(`Has input field: ${hasInput}`);

  // Check for word display
  const morphText = await page.evaluate(() => document.body.innerText);
  console.log(`Page text preview: ${morphText.substring(0, 300)}`);
  results.push({
    test: 'Morph Game',
    pass: hasMorphTitle,
    details: `Title: ${hasMorphTitle}, Input: ${hasInput}`,
  });

  // ============ TEST 3: Decode Game ============
  console.log('\n=== TEST 3: Decode Game ===');
  await page.goto(`${BASE}/decode`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-decode.png` });

  const decodeText = await page.evaluate(() => document.body.innerText);
  const hasDecodeTitle = decodeText.includes('Decode');
  const hasKeyboard = await page.$$('button').then(buttons => buttons.length > 10);
  console.log(`Has Decode title: ${hasDecodeTitle}`);
  console.log(`Has keyboard (>10 buttons): ${hasKeyboard}`);
  console.log(`Page text preview: ${decodeText.substring(0, 300)}`);
  results.push({
    test: 'Decode Game',
    pass: hasDecodeTitle && hasKeyboard,
    details: `Title: ${hasDecodeTitle}, Keyboard: ${hasKeyboard}`,
  });

  // ============ TEST 4: Stack Game ============
  console.log('\n=== TEST 4: Stack Game ===');
  await page.goto(`${BASE}/stack`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-stack.png` });

  const hasCanvas = await page.$('canvas').then(el => !!el);
  const stackText = await page.evaluate(() => document.body.innerText);
  const hasStackTitle = stackText.includes('Stack');
  console.log(`Has Stack title: ${hasStackTitle}`);
  console.log(`Has canvas: ${hasCanvas}`);
  console.log(`Page text preview: ${stackText.substring(0, 300)}`);

  // Try tapping to start the game
  if (hasCanvas) {
    await page.click('canvas');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-stack-playing.png` });
    // Tap a few more times to stack blocks
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 400));
      await page.click('canvas');
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-stack-stacked.png` });
    console.log('Played 5 rounds of Stack');
  }
  results.push({
    test: 'Stack Game',
    pass: hasStackTitle && hasCanvas,
    details: `Title: ${hasStackTitle}, Canvas: ${hasCanvas}`,
  });

  // ============ TEST 5: Shade Game ============
  console.log('\n=== TEST 5: Shade Game ===');
  await page.goto(`${BASE}/shade`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-shade.png` });

  const shadeText = await page.evaluate(() => document.body.innerText);
  const hasShadeTitle = shadeText.includes('Shade');
  // Check for grid cells
  const gridCells = await page.$$('[style*="grid"]').then(els => els.length);
  console.log(`Has Shade title: ${hasShadeTitle}`);
  console.log(`Grid elements: ${gridCells}`);
  console.log(`Page text preview: ${shadeText.substring(0, 300)}`);
  results.push({
    test: 'Shade Game',
    pass: hasShadeTitle,
    details: `Title: ${hasShadeTitle}, Grid elements: ${gridCells}`,
  });

  // ============ TEST 6: Navigation ============
  console.log('\n=== TEST 6: Navigation (back to hub) ===');
  // Click back link
  const backLink = await page.$('a[href="/"]');
  if (backLink) {
    await backLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-back-to-hub.png` });
    const backUrl = page.url();
    console.log(`Navigated back to: ${backUrl}`);
    results.push({
      test: 'Navigation',
      pass: backUrl.endsWith('/'),
      details: `Back URL: ${backUrl}`,
    });
  }

  // ============ SUMMARY ============
  console.log('\n========== TEST RESULTS ==========');
  let allPass = true;
  for (const r of results) {
    const icon = r.pass ? 'PASS' : 'FAIL';
    console.log(`${icon}: ${r.test} — ${r.details}`);
    if (!r.pass) allPass = false;
  }
  console.log(`\nOverall: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log(`Screenshots saved to ${SCREENSHOT_DIR}/`);

  await page.close();
}

run().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});

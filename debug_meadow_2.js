const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL');
    process.exit(1);
  }
  await page.goto(url);

  await page.fill('#name', 'Fern');
  await page.click('#solo');
  await page.waitForSelector('.player', { timeout: 5000 });

  console.log('--- Initial State ---');
  const initialState = await page.evaluate(() => {
    return {
      meadow: typeof game !== 'undefined' ? game.map.meadow : 'undefined',
      meadowText: document.getElementById('meadow')?.textContent.trim()
    };
  });
  console.log(initialState);

  // Perform Gather
  console.log('--- Performing Gather ---');
  await page.click('button[onclick*="gather"]');
  await page.waitForTimeout(2000);

  const afterGatherState = await page.evaluate(() => {
    return {
      meadow: typeof game !== 'undefined' ? game.map.meadow : 'undefined',
      meadowText: document.getElementById('meadow')?.textContent.trim()
    };
  });
  console.log(afterGatherState);

  await browser.close();
})();

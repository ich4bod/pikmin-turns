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

  const meadowValue = await page.evaluate(() => {
    // Since game is a global variable in app.js
    return typeof game !== 'undefined' ? game.map.meadow : 'undefined';
  });
  console.log(`DEBUG: game.map.meadow is: ${meadowValue}`);

  const meadowText = await page.$eval('#meadow', el => el.textContent.trim());
  console.log(`DEBUG: #meadow textContent is: ${meadowText}`);

  await browser.close();
})();

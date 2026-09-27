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

  const ownerFunctionSource = await page.evaluate(() => {
    return owner.toString();
  });
  console.log(`DEBUG: owner function source: ${ownerFunctionSource}`);

  await browser.close();
})();

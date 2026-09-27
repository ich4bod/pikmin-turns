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

  // 1. Start solo game
  await page.fill('#name', 'Fern');
  await page.click('#solo');

  // Wait for game to start
  await page.waitForSelector('.player', { timeout: 5000 });
  
  // Wait for the human's turn
  await page.waitForFunction(() => {
    const status = document.getElementById('status').textContent;
    return status.includes('Fern\'s turn') || document.querySelector('.player.you');
  }, { timeout: 5000 });

  // 2. Record initial last-move text
  const initialLastMove = await page.$eval('#last-move', el => el.textContent);
  
  // 3. Play Gather
  const gatherButton = await page.$('button[onclick*="act(\'gather\')"]');
  if (!gatherButton) throw new Error('Gather button not found');
  await gatherButton.click();

  // 4. Wait for Sprout response and polling
  // We wait for the last-move text to change.
  await page.waitForFunction((initial) => {
    const el = document.getElementById('last-move');
    return el && el.textContent !== initial && el.textContent.trim() !== '';
  }, initialLastMove, { timeout: 10000 });

  const newLastMove = await page.$eval('#last-move', el => el.textContent);
  
  if (!newLastMove || newLastMove === initialLastMove) {
    throw new Error(`Last move text did not change. Initial: "${initialLastMove}", New: "${newLastMove}"`);
  }

  console.log('last move recap verified after a solo turn');
  await browser.close();
})();

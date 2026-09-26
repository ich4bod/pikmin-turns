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

  // 2. Confirm two players, one is Sprout
  // The game might take a moment to initialize
  await page.waitForSelector('.player', { timeout: 5000 });
  const players = await page.$$('.player');
  if (players.length !== 2) throw new Error(`Expected 2 players, got ${players.length}`);
  
  const playerNames = await Promise.all(players.map(async p => {
    return await p.$eval('b', el => el.textContent.split(' ·')[0].trim());
  }));
  
  if (!playerNames.includes('Sprout')) throw new Error(`Sprout not found among players: ${playerNames.join(', ')}`);

  // 3. Play until end
  while (true) {
    const actionsDiv = await page.$('#actions');
    const display = await actionsDiv.evaluate(el => window.getComputedStyle(el).display);
    if (display === 'none') break;

    const orderButtons = await page.$$('.order:not(:disabled)');
    if (orderButtons.length === 0) {
      // If no buttons are enabled, it might be the bot's turn or waiting for polling.
      // We wait and check again.
      await page.waitForTimeout(1000);
      // Check if it's actually the end or just waiting
      const status = await page.$eval('#status', el => el.textContent);
      if (status.includes('wins') || status.includes('A tie')) break;
      continue;
    }
    
    await orderButtons[0].click();
    // Wait for the result of the action (polling takes 400ms)
    await page.waitForTimeout(1000); 
  }

  // 4. Check winner/tie
  const status = await page.$eval('#status', el => el.textContent);
  if (!status.includes('wins') && !status.includes('A tie')) {
    throw new Error(`Expected winner or tie in status, got: ${status}`);
  }

  console.log('solo verified against Sprout through a complete match');
  await browser.close();
})();

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

  // 1. Start solo game as Fern
  await page.fill('#name', 'Fern');
  await page.click('#solo');
  await page.waitForSelector('.player', { timeout: 5000 });

  // 2. Check initial meters
  const initialMeters = await page.$$eval('.haul-meter', meters => 
    meters.map(m => m.textContent.trim())
  );
  if (!initialMeters.every(m => m.includes('HAUL 0/12'))) {
    throw new Error(`Expected HAUL 0/12, got: ${initialMeters.join(', ')}`);
  }

  // 3. Perform actions to earn haul
  let haulChanged = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    
    const actionTexts = await page.$$eval('.order:not(:disabled)', els => els.map(el => {
      const b = el.querySelector('b');
      return b ? b.textContent.trim() : '';
    }));

    // Heuristic: 
    // 1. If 'Swarm bridge' is available, click it.
    // 2. If 'Carry relic' is available, click it.
    // 3. Otherwise, click 'Gather' or 'Scout' or 'Grow Pikmin'.
    
    let actionToClick = null;
    if (actionTexts.includes('Swarm bridge')) actionToClick = 'Swarm bridge';
    else if (actionTexts.includes('Carry relic')) actionToClick = 'Carry relic';
    else if (actionTexts.includes('Gather')) actionToClick = 'Gather';
    else if (actionTexts.includes('Scout')) actionToClick = 'Scout';
    else if (actionTexts.includes('Grow Pikmin')) actionToClick = 'Grow Pikmin';

    if (actionToClick) {
      const btn = await page.$(`.order:has-text("${actionToClick}")`);
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1500); // Wait for poll
        
        const currentMeters = await page.$$eval('.haul-meter', meters => 
          meters.map(m => m.textContent.trim())
        );
        if (!currentMeters.every(m => m.includes('HAUL 0/12'))) {
          haulChanged = true;
          break;
        }
      }
    } else {
      // Nothing available (maybe Sprout's turn or waiting), wait
      await page.waitForTimeout(1000);
    }
  }

  if (!haulChanged) {
    throw new Error('Haul meter did not change after many turns');
  }

  console.log('haul race meter verified in a solo game');
  await browser.close();
})();

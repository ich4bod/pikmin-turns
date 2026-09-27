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

  // 2. Wait for game to start
  await page.waitForSelector('.player', { timeout: 5000 });
  console.log('Game started');

  async function getStats() {
    return await page.$eval('.player.you', el => {
      const nectar = el.textContent.match(/🌼 ([\d]+) nectar/)?.[1];
      const routes = el.textContent.match(/🧭 ([\d]+) routes/)?.[1];
      const squad = el.textContent.match(/🔴(\d+) 🔵(\d+) 🟡(\d+)/);
      const s = squad ? parseInt(squad[1]) + parseInt(squad[2]) + parseInt(squad[3]) : 0;
      return { nectar: parseInt(nectar), routes: parseInt(routes), squad: s };
    });
  }

  // 3. Make Gather, Scout, and Carry legal in order
  // Gather
  console.log('Performing Gather...');
  await page.click('button[onclick*="gather"]');
  await page.waitForTimeout(1500);
  console.log('Stats after gather:', await getStats());

  // Scout
  console.log('Performing Scout...');
  await page.click('button[onclick*="scout"]');
  await page.waitForTimeout(1500);
  console.log('Stats after scout:', await getStats());

  // Skirmish (to claim bridge)
  console.log('Performing Skirmish...');
  await page.click('button[onclick*="skirmish"]');
  await page.waitForTimeout(1500);
  console.log('Stats after skirmish:', await getStats());

  // Carry
  console.log('Waiting for Carry button to be enabled...');
  try {
    await page.waitForSelector('button[onclick*="carry"]:not([disabled])', { timeout: 5000 });
    console.log('Carry button enabled');
  } catch (e) {
    console.log('Current stats:', await getStats());
    const isEnabled = await page.$eval('button[onclick*="carry"]', el => !el.disabled);
    console.log('Is carry button enabled?', isEnabled);
    throw e;
  }
  await page.click('button[onclick*="carry"]');
  await page.waitForTimeout(1500);

  // 4. Assert chip texts
  console.log('Asserting chip texts...');
  const meadowText = await page.$eval('#meadow', el => el.textContent.trim());
  console.log(`Meadow text: ${meadowText}`);
  if (meadowText !== 'Fern controls this') throw new Error(`Expected 'Fern controls this' for meadow, got '${meadowText}'`);

  const bridgeText = await page.$eval('#bridge', el => el.textContent.trim());
  console.log(`Bridge text: ${bridgeText}`);
  if (bridgeText !== 'Fern controls this') throw new Error(`Expected 'Fern controls this' for bridge, got '${bridgeText}'`);

  const relicText = await page.$eval('#relic', el => el.textContent.trim());
  console.log(`Relic text: ${relicText}`);
  if (relicText !== 'Fern controls this') throw new Error(`Expected 'Fern controls this' for relic, got '${relicText}'`);

  console.log('garden claim chips verified from meadow through relic');
  await browser.close();
})();

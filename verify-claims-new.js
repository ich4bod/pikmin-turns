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

  // 2. Wait for game to start
  await page.waitForSelector('#name', { timeout: 10000 });
  await page.fill('#name', 'Fern');
  await page.click('#solo');

  // 3. Wait for game to start
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

  const isGameOver = async () => {
    const status = await page.$eval('#status', el => el.textContent.trim());
    return status.includes('The garden is quiet');
  };

  const clickAction = async (name, selector) => {
    if (await isGameOver()) return false;
    
    // Wait for the button to be enabled (not disabled)
    try {
      await page.waitForFunction((sel) => {
        const btn = document.querySelector(sel);
        return btn && !btn.disabled;
      }, selector, { timeout: 5000 });
    } catch (e) {
      console.log(`${name} button never became enabled.`);
      return false;
    }

    console.log(`Performing ${name} via evaluate.`);
    const success = await page.evaluate((sel) => {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    }, selector);

    if (success) {
      await page.waitForTimeout(2000); // Wait for server to respond and draw to run
      return true;
    } else {
      return false;
    }
  };

  // 3. Make Gather, Scout, and Carry legal in order
  
  // Gather
  await clickAction('Gather', 'button[onclick*="gather"]');

  // Scout
  await clickAction('Scout', 'button[onclick*="scout"]');

  // Carry
  let stats = await getStats();
  while (stats.nectar < 3) {
    console.log(`Not enough nectar (${stats.nectar}/3). Gathering...`);
    await clickAction('Gather', 'button[onclick*="gather"]');
    stats = await getStats();
    if (await isGameOver()) break;
  }
  await clickAction('Carry', 'button[onclick*="carry"]');

  // 4. Claim the bridge
  stats = await getStats();
  while (stats.nectar < 1) {
    console.log(`Not enough nectar (${stats.nectar}/1). Gathering...`);
    await clickAction('Gather', 'button[onclick*="gather"]');
    stats = await getStats();
    if (await isGameOver()) break;
  }
  await clickAction('Skirmish', 'button[onclick*="skirmish"]');

  // 5. Final check
  await page.waitForTimeout(2000);
  let meadowText = await page.$eval('#meadow', el => el.textContent.trim());
  let bridgeText = await page.$eval('#bridge', el => el.textContent.trim());
  let relicText = await page.$eval('#relic', el => el.textContent.trim());
  console.log(`Final claims: Meadow: ${meadowText}, Bridge: ${bridgeText}, Relic: ${relicText}`);

  if (meadowText !== 'Fern controls this' || bridgeText !== 'Fern controls this' || relicText !== 'Fern controls this') {
    console.log('Claims not satisfied, performing one last desperate attempt...');
    await clickAction('Skirmish', 'button[onclick*="skirmish"]');
    await clickAction('Carry', 'button[onclick*="carry"]');
    await page.waitForTimeout(2000);
    
    meadowText = await page.$eval('#meadow', el => el.textContent.trim());
    bridgeText = await page.$eval('#bridge', el => el.textContent.trim());
    relicText = await page.$eval('#relic', el => el.textContent.trim());
    console.log(`Post-retry claims: Meadow: ${meadowText}, Bridge: ${bridgeText}, Relic: ${relicText}`);
  }

  if (meadowText !== 'Fern controls this') throw new Error(`Expected 'Fern controls this' for meadow, got '${meadowText}'`);
  if (bridgeText !== 'Fern controls this') throw new Error(`Expected 'Fern controls this' for bridge, got '${bridgeText}'`);
  if (relicText !== 'Fern controls this') throw new Error(`Expected 'Fern controls this' for relic, got '${relicText}'`);

  console.log('garden claim chips verified from meadow through relic');
  await browser.close();
})();

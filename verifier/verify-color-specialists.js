const { chromium } = require('playwright-core');
const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net/';
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    async function assertProgress(page, expected, readyColors = []) {
      for (const [color, text] of Object.entries(expected)) {
        const line = page.locator('#specialist-' + color);
        if ((await line.textContent()).trim() !== text) throw Error(`wrong ${color} specialist progress`);
        if ((await line.evaluate(element => element.classList.contains('specialist-ready'))) !== readyColors.includes(color)) throw Error(`wrong ${color} ready class`);
      }
    }
    async function garden(color, orderName, dispatch) {
      const page = await browser.newPage();
      await page.goto(url); await page.locator('#name').fill('Specialist Tester');
      await page.getByRole('button', { name: 'Play solo' }).click();
      await page.waitForResponse(r => r.url().includes('/api/solo') && r.status() === 201);
      await assertProgress(page, { red:'2/4 Red for stronger Swarm.', blue:'2/4 Blue for stronger Gather.', yellow:'2/4 Yellow for stronger Scout.' });
      await page.getByRole('button', { name: 'Gather' }).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      await page.locator('#grow-' + color).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const p = await page.evaluate(() => window.game.players.find(p => p.name === window.commander));
      if (p.units[color] !== 4) throw Error(`${color} did not grow to 4`);
      await assertProgress(page, { red:color==='red'?'Red specialist ready.':'2/4 Red for stronger Swarm.', blue:color==='blue'?'Blue specialist ready.':'2/4 Blue for stronger Gather.', yellow:color==='yellow'?'Yellow specialist ready.':'2/4 Yellow for stronger Scout.' }, [color]);
      await page.getByRole('button', { name: 'Gather' }).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      await page.locator('#grow-' + color).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const grown = await page.evaluate(() => window.game.players.find(p => p.name === window.commander));
      if (grown.units[color] !== 6) throw Error(`${color} did not grow to 6`);
      await assertProgress(page, { red:color==='red'?'Red specialist ready.':'2/4 Red for stronger Swarm.', blue:color==='blue'?'Blue specialist ready.':'2/4 Blue for stronger Gather.', yellow:color==='yellow'?'Yellow specialist ready.':'2/4 Yellow for stronger Scout.' }, [color]);
      await page.getByRole('button', { name: orderName }).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const state = await page.evaluate(() => window.game);
      if (state.players.find(p => p.name === 'Specialist Tester').units[color] !== 6) throw Error(`${color} units were spent`);
      if (!state.log.some(line => line === dispatch)) throw Error(`missing dispatch: ${dispatch}`);
      await page.close();
    }
    await garden('red', 'Swarm bridge', 'Specialist Tester sent 5 Red Pikmin across Mossy Bridge (+2 haul; Sprout loses 1 nectar).');
    await garden('blue', 'Gather', 'Specialist Tester sent 5 Blue Pikmin to Nectar Meadow (+3 nectar).');
    await garden('yellow', 'Scout', 'Specialist Tester sent 5 Yellow Pikmin to Lookout Ridge (+2 routes).');
    const finished = await browser.newPage(); await finished.goto(url); await finished.locator('#name').fill('Finished Tester');
    await finished.getByRole('button', { name: 'Play solo' }).click(); await finished.waitForResponse(r => r.url().includes('/api/solo') && r.status() === 201);
    for (let i = 0; i < 8; i++) { await finished.getByRole('button', { name: 'Gather' }).click(); await finished.waitForResponse(r => r.url().includes('/action') && r.status() === 200); }
    if (await finished.evaluate(() => window.game.status) !== 'finished') throw Error('solo game did not finish');
    await assertProgress(finished, { red:'', blue:'', yellow:'' });
    await finished.close();
    const page = await browser.newPage(); await page.goto(url);
    if (await page.locator('.bridge .place-reward').textContent() !== 'Swarm: +1 haul (4+ Red: +2)') throw Error('Red reward copy changed');
    await page.close();
    console.log('four-Pikmin specialist rewards verified for every color');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.stack || e.message); process.exitCode = 1; });

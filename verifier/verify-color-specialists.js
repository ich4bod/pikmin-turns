const { chromium } = require('playwright-core');
const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net/';
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    async function garden(color, orderName, dispatch) {
      const page = await browser.newPage();
      await page.goto(url); await page.locator('#name').fill('Specialist Tester');
      await page.getByRole('button', { name: 'Play solo' }).click();
      await page.waitForResponse(r => r.url().includes('/api/solo') && r.status() === 201);
      await page.getByRole('button', { name: 'Gather' }).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      await page.locator('#grow-' + color).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const p = await page.evaluate(() => window.game.players.find(p => p.name === window.commander));
      if (p.units[color] !== 4) throw Error(`${color} did not grow to 4`);
      await page.getByRole('button', { name: orderName }).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const state = await page.evaluate(() => window.game);
      if (state.players.find(p => p.name === 'Specialist Tester').units[color] !== 4) throw Error(`${color} units were spent`);
      if (!state.log.some(line => line === dispatch)) throw Error(`missing dispatch: ${dispatch}`);
      await page.close();
    }
    await garden('blue', 'Gather', 'Specialist Tester sent 4 Blue Pikmin to Nectar Meadow (+3 nectar).');
    await garden('yellow', 'Scout', 'Specialist Tester sent 4 Yellow Pikmin to Lookout Ridge (+2 routes).');
    const page = await browser.newPage(); await page.goto(url);
    if (await page.locator('.bridge .place-reward').textContent() !== 'Swarm: +1 haul (4+ Red: +2)') throw Error('Red reward copy changed');
    await page.close();
    console.log('four-Pikmin specialist rewards verified for every color');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.stack || e.message); process.exitCode = 1; });

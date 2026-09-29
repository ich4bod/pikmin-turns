const { chromium } = require('playwright-core');

(async () => {
  const url = process.argv[2];
  if (!url) throw new Error('URL required');
  const browser = await chromium.launch({ headless: true });
  try {
    const hostContext = await browser.newContext();
    const joinContext = await browser.newContext();
    const host = await hostContext.newPage();
    const join = await joinContext.newPage();
    await host.goto(url);
    await host.fill('#name', 'Fern');
    await host.click('button:has-text("Plant a landing site")');
    await host.waitForSelector('.player');
    const code = await host.locator('#code-value').textContent();
    await join.goto(url);
    await join.fill('#name', 'Moss');
    await join.fill('#code', code);
    await join.click('button:has-text("Land here")');
    await join.waitForSelector('.player');
    await host.waitForFunction(() => window.game?.status === 'playing');

    const reward = await host.locator('#lookout .place-reward').count();
    if (reward !== 0) throw new Error('lookout reward selector unexpectedly found inside owner');
    const lookoutReward = await host.locator('.lookout .place-reward').textContent();
    if (lookoutReward.trim() !== 'Scout: +1 route (4+ Yellow: +2)') throw new Error('exact Lookout reward missing');
    if (await host.locator('#lookout').textContent() !== 'Unclaimed') throw new Error('Lookout should begin unclaimed');

    async function act(page, name) {
      const button = page.locator('.order').filter({ hasText: name }).first();
      await button.waitFor({ state: 'visible' });
      await page.waitForFunction(buttonName => [...document.querySelectorAll('.order')].some(b => b.innerText.includes(buttonName) && !b.disabled), name);
      const response = await Promise.all([
        page.waitForResponse(r => r.url().includes('/action')),
        button.click()
      ]).then(([r]) => r);
      if (response.status() !== 200) throw new Error(`action ${name} returned ${response.status()}: ${await response.text()}`);
      await page.waitForTimeout(150);
    }
    await act(host, 'Scout');
    await host.waitForFunction(() => window.game.map.lookout === 'Fern');
    await join.waitForFunction(() => window.game?.map.lookout === 'Fern');
    await act(join, 'Gather');
    await act(host, 'Gather');
    await act(join, 'Scout');
    await host.waitForFunction(() => window.game.map.lookout === 'Moss');
    await join.waitForFunction(() => window.game.map.lookout === 'Moss');
    for (const page of [host, join]) {
      if (await page.locator('#lookout').textContent() !== 'Moss controls this') throw new Error('both clients did not show Moss');
      const state = await page.evaluate(() => window.game);
      if (state.players.find(p => p.name === 'Fern').insight !== 1 || state.players.find(p => p.name === 'Moss').insight !== 1) throw new Error('route reward changed');
      if (state.players.some(p => p.score !== 0)) throw new Error('unexpected haul reward');
    }

    await host.setViewportSize({ width: 390, height: 844 });
    await host.reload();
    await host.waitForSelector('.lookout', { state: 'attached' });
    await host.waitForFunction(() => getComputedStyle(document.querySelector('.map')).display !== 'none');
    const geometry = await host.evaluate(() => {
      const map = document.querySelector('.map').getBoundingClientRect();
      return [...document.querySelectorAll('.place')].map(el => { const r = el.getBoundingClientRect(); return { left:r.left-map.left, top:r.top-map.top, right:r.right-map.left, bottom:r.bottom-map.top }; });
    });
    for (const r of geometry) {
      if (r.left < 0 || r.top < 0 || r.right > 390 || r.bottom > 430) throw new Error('place outside phone map');
    }
    for (let i = 0; i < geometry.length; i++) for (let j = i + 1; j < geometry.length; j++) {
      const a = geometry[i], b = geometry[j];
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) throw new Error('place cards overlap on phone');
    }
    console.log('Lookout Ridge claim verified for both commanders and phone map');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack || error.message); process.exit(1); });

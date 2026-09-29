const { chromium } = require('playwright-core');

(async () => {
  const url = process.argv[2];
  if (!url) throw new Error('URL required');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  async function finishSolo(p) {
    await p.goto(url);
    await p.fill('#name', 'Fern');
    await p.click('#solo-btn');
    for (let i = 0; i < 30; i++) {
      await p.waitForTimeout(100);
      if ((await p.$eval('#status', e => e.textContent)).includes('wins')) break;
      const buttons = await p.$$('.order:not(:disabled)');
      if (!buttons.length) continue;
      let chosen = buttons[0];
      for (const b of buttons) if ((await b.$eval('b', e => e.textContent)).toLowerCase().includes('carry')) { chosen = b; break; }
      await Promise.all([p.waitForResponse(r => r.url().includes('/action') && r.status() === 200), chosen.click()]);
    }
    await p.waitForSelector('#solo-again', { state: 'visible', timeout: 5000 });
  }
  await finishSolo(page);
  const before = JSON.parse(await page.evaluate(() => sessionStorage.getItem('pikmin')));
  const posts = [];
  page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/api/solo')) posts.push(r); });
  await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/solo') && r.status() === 201), page.evaluate(() => { const b = document.querySelector('#solo-again'); b.click(); b.click(); })]);
  await page.waitForTimeout(250);
  if (posts.length !== 1) throw new Error(`expected one solo POST, got ${posts.length}`);
  const state = JSON.parse(await page.evaluate(() => sessionStorage.getItem('pikmin')));
  if (state.commander !== 'Fern' || state.code === before.code) throw new Error('new code or commander mismatch');
  const fresh = await page.evaluate(() => ({ status: game.status, mode: game.mode, round: game.round, players: game.players, map: game.map, log: game.log }));
  if (fresh.status !== 'playing' || fresh.mode !== 'solo' || fresh.round !== 1) throw new Error('fresh game status mismatch');
  const fern = fresh.players.find(p => p.name === 'Fern');
  if (!fern || fern.score !== 0 || fern.nectar !== 1 || fern.insight !== 0 || fern.squad !== 6) throw new Error('starting resources mismatch');
  if (Object.values(fresh.map).some(Boolean) || fresh.log.length !== 1) throw new Error('fresh map or dispatch mismatch');
  if (await page.$eval('#solo-again', e => getComputedStyle(e).display) !== 'none' || await page.$eval('#rematch', e => getComputedStyle(e).display) !== 'none') throw new Error('repeat buttons not hidden while playing');
  if ((await page.$eval('#phase', e => e.textContent)) !== 'Dawn — grow your squad') throw new Error('not Dawn');

  const duelContext = await browser.newContext();
  const a = await duelContext.newPage(), b = await duelContext.newPage();
  // A hosted duel is deliberately tested through the public lobby flow.
  await a.goto(url); await a.fill('#name', 'Fern'); await a.click('button:not(#solo-btn)');
  await a.waitForFunction(() => document.querySelector('#code-value').textContent.length === 6);
  const code = await a.$eval('#code-value', e => e.textContent);
  await b.goto(url + '?join=' + code); await b.fill('#name', 'Moss'); await b.click('button:text("Land here")');
  await b.waitForFunction(() => document.querySelector('#status').textContent.includes('Round'));
  if (await a.$eval('#solo-again', e => getComputedStyle(e).display) !== 'none') throw new Error('solo-again shown for duel');
  await browser.close();
  console.log('solo Sprout rematch verified with fresh garden and preserved commander');
})().catch(async e => { console.error(e); process.exit(1); });

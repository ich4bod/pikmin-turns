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
    async function assertSummaries(page, expected) {
      const actual = await page.locator('.specialist-summary').evaluateAll(elements => elements.map(element => ({ text: element.textContent.trim(), className: element.className })));
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error(`wrong specialist summaries: ${JSON.stringify(actual)}`);
    }
    async function act(page, action) {
      await page.locator(`button[onclick="act('${action}')"]`).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
    }
    async function waitForTurn(page, name) {
      await page.waitForFunction(expected => window.game?.turnName === expected, name);
    }
    async function garden(color, orderName, dispatch) {
      const page = await browser.newPage();
      await page.goto(url); await page.locator('#name').fill('Specialist Tester');
      await page.getByRole('button', { name: 'Play solo' }).click();
      await page.waitForResponse(r => r.url().includes('/api/solo') && r.status() === 201);
      await assertProgress(page, { red:'2/4 Red for stronger Swarm.', blue:'2/4 Blue for stronger Gather.', yellow:'2/4 Yellow for stronger Scout.' });
      await assertSummaries(page, [
        { text:'No specialist crew yet.', className:'specialist-summary local' },
        { text:'No specialist crew yet.', className:'specialist-summary rival' },
      ]);
      await page.locator('button[onclick="act(\'gather\')"]').click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      await page.locator('#grow-' + color).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const p = await page.evaluate(() => window.game.players.find(p => p.name === window.commander));
      if (p.units[color] !== 4) throw Error(`${color} did not grow to 4`);
      await assertProgress(page, { red:color==='red'?'Red specialist ready.':'2/4 Red for stronger Swarm.', blue:color==='blue'?'Blue specialist ready.':'2/4 Blue for stronger Gather.', yellow:color==='yellow'?'Yellow specialist ready.':'2/4 Yellow for stronger Scout.' }, [color]);
      await assertSummaries(page, [
        { text:`${color === 'red' ? 'Red' : color === 'blue' ? 'Blue' : 'Yellow'} can strengthen ${color === 'red' ? 'Swarm' : color === 'blue' ? 'Gather' : 'Scout'}.`, className:'specialist-summary local' },
        { text:'No specialist crew yet.', className:'specialist-summary rival' },
      ]);
      await page.locator('button[onclick="act(\'gather\')"]').click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      await page.locator('#grow-' + color).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const grown = await page.evaluate(() => window.game.players.find(p => p.name === window.commander));
      if (grown.units[color] !== 6) throw Error(`${color} did not grow to 6`);
      await assertProgress(page, { red:color==='red'?'Red specialist ready.':'2/4 Red for stronger Swarm.', blue:color==='blue'?'Blue specialist ready.':'2/4 Blue for stronger Gather.', yellow:color==='yellow'?'Yellow specialist ready.':'2/4 Yellow for stronger Scout.' }, [color]);
      await assertSummaries(page, [
        { text:`${color === 'red' ? 'Red' : color === 'blue' ? 'Blue' : 'Yellow'} can strengthen ${color === 'red' ? 'Swarm' : color === 'blue' ? 'Gather' : 'Scout'}.`, className:'specialist-summary local' },
        { text:'No specialist crew yet.', className:'specialist-summary rival' },
      ]);
      const orderAction = { Gather:'gather', Scout:'scout', 'Swarm bridge':'skirmish' }[orderName];
      await page.locator('button[onclick="act(\'' + orderAction + '\')"]').click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const state = await page.evaluate(() => window.game);
      if (state.players.find(p => p.name === 'Specialist Tester').units[color] !== 6) throw Error(`${color} units were spent`);
      if (!state.log.some(line => line === dispatch)) throw Error(`missing dispatch: ${dispatch}`);
      await page.close();
    }
    await garden('red', 'Swarm bridge', 'Specialist Tester sent 5 Red Pikmin across Mossy Bridge (+2 haul; Sprout loses 1 nectar).');
    await garden('blue', 'Gather', 'Specialist Tester sent 5 Blue Pikmin to Nectar Meadow (+3 nectar).');
    await garden('yellow', 'Scout', 'Specialist Tester sent 5 Yellow Pikmin to Lookout Ridge (+2 routes).');
    const host = await browser.newPage(); await host.goto(url); await host.locator('#name').fill('Host Specialist');
    await host.getByRole('button', { name: 'Plant a landing site' }).click();
    await host.waitForResponse(r => r.url().includes('/api/lobbies') && r.status() === 201);
    const code = await host.locator('#code-value').textContent();
    const guest = await browser.newPage(); await guest.goto(url); await guest.locator('#name').fill('Guest Specialist'); await guest.locator('#code').fill(code);
    await guest.getByRole('button', { name: 'Land here' }).click();
    await guest.waitForResponse(r => r.url().includes('/api/lobbies/') && r.status() === 200);
    await host.waitForFunction(() => window.game?.status === 'playing' && window.game.players.filter(Boolean).length === 2);
    await assertSummaries(host, [
      { text:'No specialist crew yet.', className:'specialist-summary local' },
      { text:'No specialist crew yet.', className:'specialist-summary rival' },
    ]);
    await act(host, 'gather'); await waitForTurn(guest, 'Guest Specialist');
    await act(guest, 'gather'); await waitForTurn(host, 'Host Specialist');
    await act(host, 'grow-red');
    await assertSummaries(host, [
      { text:'Red can strengthen Swarm.', className:'specialist-summary local' },
      { text:'No specialist crew yet.', className:'specialist-summary rival' },
    ]);
    await waitForTurn(guest, 'Guest Specialist'); await act(guest, 'grow-blue'); await waitForTurn(host, 'Host Specialist');
    await assertSummaries(host, [
      { text:'Red can strengthen Swarm.', className:'specialist-summary local' },
      { text:'Blue can strengthen Gather.', className:'specialist-summary rival' },
    ]);
    await act(host, 'gather'); await waitForTurn(guest, 'Guest Specialist');
    await act(guest, 'gather'); await waitForTurn(host, 'Host Specialist');
    await act(host, 'grow-blue');
    await assertSummaries(host, [
      { text:'Red can strengthen Swarm. Blue can strengthen Gather.', className:'specialist-summary local' },
      { text:'Blue can strengthen Gather.', className:'specialist-summary rival' },
    ]);
    await host.close(); await guest.close();
    const finished = await browser.newPage(); await finished.goto(url); await finished.locator('#name').fill('Finished Tester');
    await finished.getByRole('button', { name: 'Play solo' }).click(); await finished.waitForResponse(r => r.url().includes('/api/solo') && r.status() === 201);
    for (let i = 0; i < 8; i++) { await finished.locator('button[onclick="act(\'gather\')"]').click(); await finished.waitForResponse(r => r.url().includes('/action') && r.status() === 200); }
    if (await finished.evaluate(() => window.game.status) !== 'finished') throw Error('solo game did not finish');
    await assertProgress(finished, { red:'', blue:'', yellow:'' });
    await assertSummaries(finished, []);
    await finished.close();
    const page = await browser.newPage(); await page.goto(url);
    if (await page.locator('.bridge .place-reward').evaluate(element => element.firstChild.textContent) !== 'Swarm: +1 haul (4+ Red: +2)') throw Error('Red reward copy changed');
    await page.close();
    console.log('four-Pikmin specialist rewards verified for every color');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.stack || e.message); process.exitCode = 1; });

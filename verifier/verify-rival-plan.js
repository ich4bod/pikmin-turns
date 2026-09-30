const { chromium } = require('playwright-core');
const { server, createSolo } = require('../server');

const url = process.argv[2];
if (!url) throw new Error('URL required');

(async () => {
  const browser = await chromium.launch({ headless: true });
  let localPage;
  try {
    const publicPage = await browser.newPage();
    await publicPage.goto(url, { waitUntil: 'domcontentloaded' });
    await publicPage.locator('#name').fill('Plan Tester');
    await Promise.all([
      publicPage.waitForResponse(response => response.url().includes('/api/solo') && response.status() === 201),
      publicPage.locator('#solo-btn').click()
    ]);
    await publicPage.locator('#rival-plan').waitFor({ state: 'visible' });
    if ((await publicPage.locator('#rival-plan').textContent()).trim() !== 'Sprout is planning: Map a route.') throw Error('initial Sprout plan was not public');
    await Promise.all([
      publicPage.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
      publicPage.locator('button[onclick="act(\'gather\')"]').click()
    ]);
    if ((await publicPage.locator('#rival-plan').textContent()).trim() !== 'Sprout is planning: Gather nectar.') throw Error('next Sprout plan was not public');

    const prepared = createSolo('Prepared Human');
    const sprout = prepared.players[1];
    sprout.units = { red: 6, blue: 2, yellow: 0 };
    sprout.nectar = 3;
    sprout.insight = 0;
    await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', error => error ? reject(error) : resolve()));
    const port = server.address().port;
    localPage = await browser.newPage();
    await localPage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await localPage.evaluate(state => sessionStorage.setItem('pikmin', JSON.stringify(state)), { code: prepared.code, token: prepared.token, commander: 'Prepared Human' });
    await localPage.reload({ waitUntil: 'networkidle' });
    await localPage.locator('#rival-plan').waitFor({ state: 'visible' });
    if ((await localPage.locator('#rival-plan').textContent()).trim() !== 'Sprout is planning: reassigning 2 Red as Blue to ready Gather.') throw Error('prepared reassignment plan was not public');
    await Promise.all([
      localPage.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
      localPage.locator('button[onclick="act(\'gather\')"]').click()
    ]);
    const state = await localPage.evaluate(() => ({
      plan: document.querySelector('#rival-plan').textContent.trim(),
      log: [...document.querySelectorAll('.logline')].map(line => line.textContent),
      sprout: window.game.players.find(player => player.name === 'Sprout'),
      turnName: window.game.turnName,
      round: window.game.round
    }));
    if (state.plan !== 'Sprout is planning: Swarm Mossy Bridge.') throw Error('post-reassignment plan was not public');
    if (!state.log.includes('Sprout reassigned 2 Red Pikmin as Blue.')) throw Error('reassignment was not executed through the action log');
    if (state.sprout.units.red !== 4 || state.sprout.units.blue !== 4 || state.sprout.units.yellow !== 0) throw Error('prepared reassignment changed the wrong crew');
    if (state.turnName !== 'Prepared Human' || state.round !== 2) throw Error('reassignment did not advance the normal turn');

    const fortified = createSolo('Fortify Human');
    const fortifiedSprout = fortified.players[1];
    const fortifiedHuman = fortified.players[0];
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`http://127.0.0.1:${port}/api/lobbies/${fortified.code}/action`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: fortified.token, action: 'gather' })
      });
      if (!response.ok) throw Error(`could not prepare round 6: ${response.status}`);
    }
    fortified.map.meadow = 'Sprout';
    fortifiedSprout.nectar = 1;
    fortifiedHuman.units.blue = 4;
    await localPage.evaluate(state => sessionStorage.setItem('pikmin', JSON.stringify(state)), { code: fortified.code, token: fortified.token, commander: 'Fortify Human' });
    await localPage.reload({ waitUntil: 'networkidle' });
    await localPage.locator('#rival-plan').waitFor({ state: 'visible' });
    if ((await localPage.locator('#rival-plan').textContent()).trim() !== 'Sprout is planning: fortifying Nectar Meadow against one takeover.') throw Error('prepared meadow fortification plan was not public');
    await Promise.all([
      localPage.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
      localPage.locator('button[onclick="act(\'reassign-red-blue\')"]').click()
    ]);
    const fortifiedState = await localPage.evaluate(() => ({
      shield: window.game.fortified.meadow,
      log: [...document.querySelectorAll('.logline')].map(line => line.textContent),
      plan: document.querySelector('#rival-plan').textContent.trim()
    }));
    if (fortifiedState.shield !== 'Sprout') throw Error('meadow fortification shield was not public after execution');
    if (!fortifiedState.log.includes('Sprout fortified Nectar Meadow with 1 nectar.')) throw Error('fortification was not executed through the action log');
    if (fortifiedState.plan !== 'Sprout is planning: Gather nectar.') throw Error('post-fortification plan was not public');
    await browser.close();
    console.log('Sprout plan is public before every solo response');
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve));
    if (browser.isConnected()) await browser.close();
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

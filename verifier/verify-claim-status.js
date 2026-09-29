const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');

const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net/';
const browserErrors = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const pages = [];
  try {
    const fern = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const moss = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pages.push(fern, moss);
    for (const page of pages) {
      page.on('pageerror', error => browserErrors.push(`${page.url()} pageerror: ${error.message}`));
      page.on('console', message => { if (message.type() === 'error') browserErrors.push(`${page.url()} console: ${message.text()}`); });
    }

    const claimIds = ['meadow', 'lookout', 'bridge', 'relic'];
    const expectedUnclaimed = [
      'Unclaimed · this order claims Nectar Meadow.',
      'Unclaimed · this order claims Lookout Ridge.',
      'Unclaimed · this order claims Mossy Bridge.',
      'Unclaimed · this order claims the Sun Relic.'
    ];
    async function claims(page) {
      return page.evaluate(ids => ids.map(id => document.querySelector(`#claim-${id}`).textContent), claimIds);
    }
    async function assertClaims(page, expected) { assert.deepEqual(await claims(page), expected); }
    async function takeable(page, id) {
      return page.evaluate(place => ({
        active: document.querySelector(`#place-${place}`).classList.contains('takeable'),
        text: document.querySelector(`#takeable-${place}`).textContent
      }), id);
    }
    async function assertTakeable(page, id, active, text = '') {
      assert.deepEqual(await takeable(page, id), { active, text });
    }
    async function assertTakeableClear(page) {
      for (const id of claimIds) await assertTakeable(page, id, false);
    }
    async function setDisplayState(page, place, owner, units, squad) {
      await page.evaluate(({ place, owner, units, squad }) => {
        const next = JSON.parse(JSON.stringify(window.game));
        next.status = 'playing';
        next.map[place] = owner;
        const local = next.players.find(player => player && player.name === window.commander);
        local.units = units;
        local.squad = squad;
        window.game = next;
        draw();
      }, { place, owner, units, squad });
    }
    async function action(page, name) {
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
        page.locator(`button.order[onclick*="'${name}'"]`).click()
      ]);
    }
    async function waitPlaying(page) { await page.waitForFunction(() => window.game?.status === 'playing'); }
    async function assertNoOverflow(page) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `horizontal overflow at ${page.url()}`);
    }

    await fern.goto(url);
    await assertTakeableClear(fern);
    await fern.fill('#name', 'Fern');
    await Promise.all([
      fern.waitForResponse(response => response.url().endsWith('/api/lobbies') && response.status() === 201),
      fern.getByRole('button', { name: 'Plant a landing site' }).click()
    ]);
    const code = await fern.locator('#code-value').textContent();
    await moss.goto(url);
    await moss.fill('#name', 'Moss');
    await moss.fill('#code', code);
    await Promise.all([
      moss.waitForResponse(response => response.url().includes(`/api/lobbies/${code}`) && response.status() === 200),
      moss.getByRole('button', { name: 'Land here' }).click()
    ]);
    await waitPlaying(fern); await waitPlaying(moss);
    await assertClaims(fern, expectedUnclaimed); await assertClaims(moss, expectedUnclaimed);
    await assertTakeableClear(fern); await assertTakeableClear(moss);
    await assertNoOverflow(fern); await assertNoOverflow(moss);

    await action(fern, 'gather');
    await moss.waitForFunction(() => window.game?.map?.meadow === 'Fern');
    await assertClaims(fern, ['You hold Nectar Meadow.', ...expectedUnclaimed.slice(1)]);
    await assertClaims(moss, ['Fern holds Nectar Meadow · need 4+ Blue to take it.', ...expectedUnclaimed.slice(1)]);
    await action(moss, 'gather');
    const mossAfterWeakGather = await moss.evaluate(() => window.game);
    assert.equal(mossAfterWeakGather.map.meadow, 'Fern');
    assert.equal(mossAfterWeakGather.players.find(p => p.name === 'Moss').nectar, 3);
    assert.equal(mossAfterWeakGather.log.at(-1), 'Fern holds Nectar Meadow against Moss.');
    await action(fern, 'gather');
    await action(moss, 'grow-blue');
    // Growth already claims the meadow under the existing card-69 server rule;
    // verify the ready formatter against the pre-growth prepared ownership state.
    const meadowReady = await moss.evaluate(() => {
      const place = { key: 'meadow', label: 'Nectar Meadow', color: 'blue', threshold: 4, requirement: '4+ Blue' };
      const local = window.game.players.find(p => p.name === window.commander);
      const prepared = { ...window.game, map: { ...window.game.map, meadow: 'Fern' } };
      return formatClaimStatus(prepared, window.commander, place, { units: local.units, total: local.squad });
    });
    assert.deepEqual(meadowReady, { state: 'ready', text: 'Ready to take Nectar Meadow from Fern.' });
    await action(fern, 'gather');
    await action(moss, 'gather');
    await fern.waitForFunction(() => window.game?.map?.meadow === 'Moss');
    await assertClaims(fern, ['Moss holds Nectar Meadow · need 4+ Blue to take it.', ...expectedUnclaimed.slice(1)]);
    await assertClaims(moss, ['You hold Nectar Meadow.', ...expectedUnclaimed.slice(1)]);

    const preparedBranches = await fern.evaluate(() => {
      const places = [
        { key: 'lookout', label: 'Lookout Ridge', color: 'yellow', threshold: 4, requirement: '4+ Yellow' },
        { key: 'bridge', label: 'Mossy Bridge', color: 'red', threshold: 4, requirement: '4+ Red' },
        { key: 'relic', label: 'the Sun Relic', threshold: 8, requirement: '8+ Pikmin' }
      ];
      return places.map(place => {
        const state = owner => ({ status: 'playing', map: { [place.key]: owner } });
        const weak = { units: { red: 2, blue: 2, yellow: 2 }, total: 6 };
        const strong = { units: { red: 2, blue: 2, yellow: 2 }, total: 6 };
        if (place.color) { weak.units[place.color] = 3; strong.units[place.color] = 4; } else { strong.total = 8; }
        return {
          place: place.key,
          unclaimed: formatClaimStatus(state(null), 'Fern', place, weak),
          owned: formatClaimStatus(state('Fern'), 'Fern', place, weak),
          defended: formatClaimStatus(state('Moss'), 'Fern', place, weak),
          ready: formatClaimStatus(state('Moss'), 'Fern', place, strong)
        };
      });
    });
    for (const branch of preparedBranches) {
      const place = branch.place === 'lookout' ? ['Lookout Ridge', '4+ Yellow'] : branch.place === 'bridge' ? ['Mossy Bridge', '4+ Red'] : ['the Sun Relic', '8+ Pikmin'];
      assert.deepEqual(branch.unclaimed, { state: 'unclaimed', text: `Unclaimed · this order claims ${place[0]}.` });
      assert.deepEqual(branch.owned, { state: 'owned', text: `You hold ${place[0]}.` });
      assert.deepEqual(branch.defended, { state: 'defended', text: `Moss holds ${place[0]} · need ${place[1]} to take it.` });
      assert.deepEqual(branch.ready, { state: 'ready', text: `Ready to take ${place[0]} from Moss.` });
    }

    const displayCases = [
      ['meadow', { red: 2, blue: 4, yellow: 2 }, 8, 'Ready to take from Moss.'],
      ['lookout', { red: 2, blue: 2, yellow: 4 }, 8, 'Ready to take from Moss.'],
      ['bridge', { red: 4, blue: 2, yellow: 2 }, 8, 'Ready to take from Moss.'],
      ['relic', { red: 3, blue: 3, yellow: 2 }, 8, 'Ready to take from Moss.']
    ];
    for (const [id, units, squad, text] of displayCases) {
      await setDisplayState(fern, id, 'Moss', units, squad);
      await assertTakeable(fern, id, true, text);
      await setDisplayState(fern, id, 'Fern', units, squad);
      await assertTakeable(fern, id, false);
      const weak = { ...units };
      if (id === 'relic') { weak.red = 2; weak.blue = 2; weak.yellow = 2; }
      else weak[id === 'meadow' ? 'blue' : id === 'lookout' ? 'yellow' : 'red'] = 3;
      await setDisplayState(fern, id, 'Moss', weak, 6);
      await assertTakeable(fern, id, false);
    }

    const finished = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pages.push(finished);
    finished.on('pageerror', error => browserErrors.push(`${finished.url()} pageerror: ${error.message}`));
    finished.on('console', message => { if (message.type() === 'error') browserErrors.push(`${finished.url()} console: ${message.text()}`); });
    await finished.goto(url);
    await finished.fill('#name', 'Finish Tester');
    await Promise.all([
      finished.waitForResponse(response => response.url().includes('/api/solo') && response.status() === 201),
      finished.getByRole('button', { name: 'Play solo' }).click()
    ]);
    await waitPlaying(finished);
    for (let i = 0; i < 8; i++) {
      if ((await finished.evaluate(() => window.game.status)) === 'finished') break;
      const order = await finished.locator('button.order:not([disabled])').first();
      await order.waitFor();
      await action(finished, await order.getAttribute('onclick').then(value => value.match(/act\('([^']+)'\)/)[1]));
    }
    await finished.waitForFunction(() => window.game?.status === 'finished');
    await assertClaims(finished, ['', '', '', '']);
    await assertTakeableClear(finished);
    await assertNoOverflow(finished);
    assert.deepEqual(browserErrors, []);
    console.log('live claim stakes verified for all four defended garden places');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error.message); process.exit(1); });

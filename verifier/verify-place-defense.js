const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const { create, join, action, claimPlace } = require('../server');
const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    assert.equal(await page.locator('#control-rule').textContent(), 'Claim places for dusk. A specialist crew can take one from a rival; every place you still control is worth 1 haul.');
    assert.equal(await page.locator('#goal').count(), 1);
    for (const text of ['Rival claim: 4+ Blue', 'Rival claim: 4+ Yellow', 'Rival claim: 4+ Red', 'Rival claim: 8+ Pikmin']) assert.equal(await page.locator('.defense-rule', { hasText: text }).count(), 1);
    await page.close();

    // Exercise the public game actions for the requested Fern/Moss meadow story.
    const fern = create('Fern'); const game = fern; const mossToken = join(game, 'Moss');
    action(game, fern.token, 'gather');
    const moss = game.players[1];
    action(game, mossToken, 'gather');
    assert.equal(moss.nectar, 3); assert.equal(game.map.meadow, 'Fern');
    assert.equal(game.log.at(-1), 'Fern holds Nectar Meadow against Moss.');
    action(game, fern.token, 'gather');
    action(game, mossToken, 'grow-blue');
    action(game, fern.token, 'gather');
    action(game, mossToken, 'gather');
    assert.equal(moss.units.blue, 4); assert.equal(game.map.meadow, 'Moss');

    // Focused authoritative checks for all four places, including exact thresholds.
    for (const [place, color, weak, strong, label] of [
      ['meadow', 'blue', 3, 4, 'Nectar Meadow'], ['lookout', 'yellow', 3, 4, 'Lookout Ridge'],
      ['bridge', 'red', 3, 4, 'Mossy Bridge'], ['relic', null, 6, 8, 'the Sun Relic']
    ]) {
      const r = create('Fern'); const g = r; join(g, 'Moss'); g.map[place] = 'Fern';
      const p = g.players[1]; if (color) p.units[color] = weak; else p.units = { red: 2, blue: 2, yellow: 2 };
      claimPlace(g, p, place, color, color ? 4 : 8);
      assert.equal(g.map[place], 'Fern'); assert.equal(g.log.at(-1), `Fern holds ${label} against Moss.`);
      if (color) p.units[color] = strong; else p.units = { red: 3, blue: 3, yellow: 2 };
      claimPlace(g, p, place, color, color ? 4 : 8);
      assert.equal(g.map[place], 'Moss');
    }
    console.log('specialist defense verified for all four dusk places');
  } finally { await browser.close(); }
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });

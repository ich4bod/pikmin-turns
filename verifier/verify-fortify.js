const { chromium } = require('playwright-core');
const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    async function action(page, name) {
      const response = page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      await page.locator(`button[onclick="act('${name}')"]`).click();
      await response;
    }
    async function turn(page, name) {
      await page.waitForFunction(expected => window.game?.turnName === expected, name);
    }
    async function state(page) {
      return page.evaluate(() => window.game);
    }
    async function assertAvailability(page, place, text) {
      const line = page.locator(`#availability-fortify-${place}`);
      if ((await line.textContent()).trim() !== text) throw Error(`wrong ${place} availability`);
      if (await line.evaluate(element => element.closest('button').disabled) !== (text !== 'Ready')) {
        throw Error(`wrong ${place} disabled state`);
      }
    }

    const host = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await host.goto(url);
    await host.locator('#name').fill('Fortify Host');
    const hostCreate = host.waitForResponse(r => r.url().includes('/api/lobbies') && r.status() === 201);
    await host.getByRole('button', { name: 'Plant a landing site' }).click();
    await hostCreate;
    await host.waitForFunction(() => document.querySelector('#code-value').textContent.trim());
    const code = await host.locator('#code-value').textContent();

    const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await guest.goto(url);
    await guest.locator('#name').fill('Fortify Guest');
    await guest.locator('#code').fill(code);
    const guestJoin = guest.waitForResponse(r => r.url().includes('/api/lobbies/') && r.status() === 200);
    await guest.getByRole('button', { name: 'Land here' }).click();
    await guestJoin;
    await host.waitForFunction(() => window.game?.status === 'playing' && window.game.players.filter(Boolean).length === 2);

    await assertAvailability(host, 'meadow', 'Needs control');
    await assertAvailability(host, 'lookout', 'Needs control');
    await action(host, 'gather');
    await turn(guest, 'Fortify Guest');
    await action(guest, 'gather');
    await turn(host, 'Fortify Host');
    await action(host, 'grow-blue');
    await turn(guest, 'Fortify Guest');
    await action(guest, 'grow-blue');
    await turn(host, 'Fortify Host');
    await action(host, 'gather');
    await turn(guest, 'Fortify Guest');
    await action(guest, 'scout');
    await turn(host, 'Fortify Host');

    await assertAvailability(host, 'meadow', 'Ready');
    await action(host, 'fortify-meadow');
    const fortified = await state(host);
    const hostPlayer = fortified.players.find(player => player.name === 'Fortify Host');
    if (fortified.fortified.meadow !== 'Fortify Host') throw Error('fortification was not stored');
    if (hostPlayer.nectar !== 3) throw Error(`fortify resource cost was wrong: ${hostPlayer.nectar}`);
    if (fortified.turnName !== 'Fortify Guest') throw Error('turn did not pass after fortifying');
    if (!fortified.log.includes('Fortify Host fortified Nectar Meadow with 1 nectar.')) throw Error('missing fortification log');
    const shield = host.locator('#fortified-meadow');
    if ((await shield.textContent()).trim() !== '🛡 Fortified by Fortify Host · blocks one strong takeover.') throw Error('wrong public shield text');
    if (await shield.evaluate(element => element.hidden)) throw Error('public shield is hidden');
    await guest.waitForFunction(() => window.game?.fortified?.meadow === 'Fortify Host');
    if (await guest.locator('#fortified-meadow').textContent() !== '🛡 Fortified by Fortify Host · blocks one strong takeover.') throw Error('rival cannot see public shield');
    await assertAvailability(guest, 'meadow', 'Needs control');

    const geometry = await host.evaluate(() => {
      const buttons = [...document.querySelectorAll('.fortify-order')];
      const rects = buttons.map(button => button.getBoundingClientRect());
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        oneColumn: new Set(rects.map(rect => Math.round(rect.top))).size === 4,
        minHeight: rects.every(rect => rect.height >= 48),
      };
    });
    if (geometry.overflow || !geometry.oneColumn || !geometry.minHeight) throw Error(`phone geometry failed: ${JSON.stringify(geometry)}`);
    await action(guest, 'gather');
    const held = await state(guest);
    if (held.map.meadow !== 'Fortify Host' || held.fortified.meadow !== null) throw Error('strong challenge did not hold and remove shield');
    if (!held.log.includes("Fortify Host's fortification held Nectar Meadow against Fortify Guest.")) throw Error('missing defense log');
    await host.waitForFunction(() => window.game?.fortified?.meadow === null);
    if ((await host.locator('#fortified-meadow').textContent()) !== '') throw Error('shield remained after strong challenge');
    await turn(host, 'Fortify Host');
    await action(host, 'gather');
    await turn(guest, 'Fortify Guest');
    await action(guest, 'gather');
    const taken = await state(guest);
    if (taken.map.meadow !== 'Fortify Guest' || taken.fortified.meadow !== null) throw Error('later strong challenge did not take place');
    await host.close(); await guest.close();
    console.log('fortified garden places resist one strong takeover for both commanders');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

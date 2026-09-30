const { chromium } = require('playwright-core');

const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net/';
const labels = [
  ['reassign-red-blue', 'Red → Blue'],
  ['reassign-red-yellow', 'Red → Yellow'],
  ['reassign-blue-red', 'Blue → Red'],
  ['reassign-blue-yellow', 'Blue → Yellow'],
  ['reassign-yellow-red', 'Yellow → Red'],
  ['reassign-yellow-blue', 'Yellow → Blue']
];
const waitFor = (page, predicate, message) => page.waitForFunction(predicate, null, { timeout: 10000 }).catch(() => { throw Error(message); });
async function gotoReady(page, target) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('#name').waitFor({ state: 'visible', timeout: 10000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();

    await gotoReady(host, url);
    await host.locator('#name').fill('Reassign Host');
    await host.locator('button[onclick="host()"]').click();
    await host.waitForResponse(response => response.url().includes('/api/lobbies') && response.status() === 201);
    const code = await host.locator('#code-value').textContent();

    await gotoReady(guest, `${url}?join=${code}`);
    await guest.locator('#name').fill('Reassign Rival');
    await guest.locator('button[onclick="join()"]').click();
    await guest.waitForResponse(response => response.url().includes('/api/lobbies/') && response.status() === 200);
    await host.waitForFunction(() => window.game?.players?.length === 2);

    const assertLabels = async page => {
      for (const [action, label] of labels) {
        const button = page.locator(`#${action}`);
        if ((await button.count()) !== 1) throw Error(`missing ${label} button`);
        if (!(await button.textContent()).trim().startsWith(label)) throw Error(`wrong label for ${action}`);
        if ((await button.locator('.reassign-dot').count()) !== 1) throw Error(`missing source dot for ${action}`);
      }
    };
    await assertLabels(host);
    const help = await host.locator('#reassign-help').textContent();
    if (help !== 'Spend this order to move two Pikmin from one color to another.') throw Error('wrong reassignment help');
    const card = host.locator('.reassign-card');
    if ((await card.locator('h2').textContent()).trim() !== 'Reassign two Pikmin') throw Error('wrong reassignment heading');
    for (const [action] of labels) if (await host.locator(`#${action}`).isDisabled()) throw Error(`${action} unexpectedly disabled at start`);

    const before = await host.evaluate(() => {
      const p = window.game.players.find(player => player.name === window.commander);
      return { units: { ...p.units }, nectar: p.nectar, insight: p.insight, score: p.score, map: { ...window.game.map } };
    });
    await host.locator('#reassign-red-blue').click();
    await host.waitForResponse(response => response.url().includes('/action') && response.status() === 200);
    const after = await host.evaluate(() => {
      const p = window.game.players.find(player => player.name === window.commander);
      return { units: { ...p.units }, nectar: p.nectar, insight: p.insight, score: p.score, map: { ...window.game.map }, turnName: window.game.turnName };
    });
    if (after.units.red !== before.units.red - 2 || after.units.blue !== before.units.blue + 2) throw Error('wrong Red to Blue transfer');
    for (const color of ['yellow']) if (after.units[color] !== before.units[color]) throw Error(`${color} changed during reassignment`);
    for (const resource of ['nectar', 'insight', 'score']) if (after[resource] !== before[resource]) throw Error(`${resource} changed during reassignment`);
    if (JSON.stringify(after.map) !== JSON.stringify(before.map)) throw Error('map changed during reassignment');
    if (!(await host.locator('.logline').allTextContents()).some(text => text.includes('Reassign Host reassigned 2 Red Pikmin as Blue.'))) throw Error('wrong reassignment log');

    await waitFor(guest, () => window.game?.turnName === 'Reassign Rival' && window.game.log.some(line => line === 'Reassign Host reassigned 2 Red Pikmin as Blue.'), 'rival did not poll the reassignment');
    await assertLabels(guest);
    await guest.locator('#reassign-blue-red').click();
    await guest.waitForResponse(response => response.url().includes('/action') && response.status() === 200);
    await waitFor(host, () => window.game?.turnName === 'Reassign Host' && window.game.log.some(line => line === 'Reassign Rival reassigned 2 Blue Pikmin as Red.'), 'host did not poll the rival reassignment');
    if (!(await host.locator('#reassign-red-blue').isDisabled())) throw Error('invalid Red source order should be disabled');
    if ((await host.locator('#availability-reassign-red-blue').textContent()).trim() !== 'Needs 2 Red') throw Error('wrong invalid Red availability');
    for (const action of ['reassign-red-yellow']) if (!(await host.locator(`#${action}`).isDisabled())) throw Error(`${action} should be disabled with no Red Pikmin`);
    for (const action of ['reassign-blue-red', 'reassign-blue-yellow', 'reassign-yellow-red', 'reassign-yellow-blue']) if (await host.locator(`#${action}`).isDisabled()) throw Error(`${action} should be ready`);

    const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phone = await phoneContext.newPage();
    await gotoReady(phone, url);
    await phone.locator('#name').fill('Phone Reassign');
    await phone.locator('button[onclick="solo()"]').click();
    await phone.waitForResponse(response => response.url().includes('/api/solo') && response.status() === 201);
    await phone.waitForFunction(() => window.game?.status === 'playing');
    const geometry = await phone.evaluate(() => {
      const grid = document.querySelector('.reassign-grid');
      const buttons = [...document.querySelectorAll('.reassign-order')];
      const rects = buttons.map(button => button.getBoundingClientRect());
      return { overflow: document.documentElement.scrollWidth > 390, columns: getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length, heights: rects.map(rect => rect.height), tops: rects.map(rect => rect.top), width: grid.getBoundingClientRect().width };
    });
    if (geometry.overflow) throw Error('phone page has horizontal overflow');
    if (geometry.columns !== 1) throw Error(`phone reassignment grid is not one column: ${geometry.columns}`);
    if (geometry.heights.some(height => height < 48)) throw Error('reassignment button is shorter than 48px');
    if (geometry.tops.some((top, index) => index && top <= geometry.tops[index - 1])) throw Error('phone reassignment buttons overlap');
    if (geometry.width <= 0) throw Error('phone reassignment grid has no width');

    await browser.close();
    console.log('two-Pikmin color reassignment verified across turns resources and phone UI');
  } finally {
    if (!browser.isConnected()) return;
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

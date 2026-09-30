const { chromium } = require('playwright-core');

const url = process.argv[2];
if (!url) {
  console.error('Usage: node verifier/verify-dusk-forecast.js <url>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const hostName = '<b>Fern</b>';
  const guestName = 'Moss & <i>Oak</i>';

  async function action(page, kind) {
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
      page.locator(`button[onclick="act('${kind}')"]`).click()
    ]);
  }

  async function waitForTurn(page, name) {
    await page.waitForFunction(expected => window.game?.status === 'playing' && window.game.turnName === expected, name);
  }

  async function waitForGame(page, predicate, message) {
    await page.waitForFunction(predicate, null, { polling: 100 });
    if (message) {
      const ok = await page.evaluate(predicate);
      if (!ok) throw new Error(message);
    }
  }

  function forecast(name1, score1, places1, name2, score2, places2) {
    const label = count => count === 1 ? 'place' : 'places';
    return `If dusk fell now: ${name1} ${score1} + ${places1} ${label(places1)} = ${score1 + places1} haul · ${name2} ${score2} + ${places2} ${label(places2)} = ${score2 + places2} haul.`;
  }

  try {
    const host = await browser.newPage();
    await host.goto(url);
    await host.fill('#name', hostName);
    await host.click('button:has-text("Plant a landing site")');
    await host.waitForSelector('#game', { state: 'visible' });
    const code = await host.locator('#code-value').textContent();

    if (await host.locator('#dusk-forecast').evaluate(el => getComputedStyle(el).display !== 'none')) {
      throw new Error('forecast should be hidden in the lobby');
    }

    const guest = await browser.newPage();
    await guest.goto(url);
    await guest.fill('#name', guestName);
    await guest.fill('#code', code);
    await guest.click('button:has-text("Land here")');
    await host.waitForFunction(() => window.game?.status === 'playing');
    await guest.waitForFunction(() => window.game?.status === 'playing');

    const zero = forecast(hostName, 0, 0, guestName, 0, 0);
    for (const page of [host, guest]) {
      if (await page.locator('#dusk-forecast').textContent() !== zero) throw new Error('zero-ownership forecast mismatch');
      const safe = await page.locator('#dusk-forecast').evaluate(el => ({ children: el.children.length, html: el.innerHTML }));
      if (safe.children !== 0 || safe.html.includes('<b>') || safe.html.includes('<i>')) throw new Error('commander text was interpreted as markup');
    }

    // Round 1: give each commander one place, then wait for the rival poll.
    await waitForTurn(host, hostName);
    await action(host, 'gather');
    await waitForTurn(guest, guestName);
    await action(guest, 'scout');
    await host.waitForFunction(() => window.game?.map.meadow === '<b>Fern</b>' && window.game?.map.lookout === 'Moss & <i>Oak</i>');
    const split = forecast(hostName, 0, 1, guestName, 0, 1);
    if (await host.locator('#dusk-forecast').textContent() !== split) throw new Error('split-ownership forecast mismatch');

    // Round 2: build both specialist crews without changing the split.
    await waitForTurn(host, hostName);
    await action(host, 'grow-red');
    await waitForTurn(guest, guestName);
    await action(guest, 'gather');
    await host.waitForFunction(() => window.game?.turnName === '<b>Fern</b>' && window.game?.map.meadow === '<b>Fern</b>');

    // Round 3: score and let the guest take the meadow with a grown crew.
    await action(host, 'skirmish');
    await waitForTurn(guest, guestName);
    await action(guest, 'grow-yellow');
    await host.waitForFunction(() => window.game?.map.meadow === 'Moss & <i>Oak</i>' && window.game?.players[0]?.score === 2);
    const takeover = forecast(hostName, 2, 1, guestName, 0, 2);
    if (await host.locator('#dusk-forecast').textContent() !== takeover) throw new Error('takeover or updated-haul forecast mismatch');

    // Finish all eight rounds with legal non-scoring orders.
    const rounds = [
      ['gather', 'scout'],
      ['gather', 'gather'],
      ['gather', 'gather'],
      ['gather', 'gather'],
      ['gather', 'gather']
    ];
    for (const [hostAction, guestAction] of rounds) {
      await waitForTurn(host, hostName);
      await action(host, hostAction);
      await waitForTurn(guest, guestName);
      await action(guest, guestAction);
      if (hostAction !== 'gather' || guestAction !== 'gather') {
        await host.waitForFunction(() => window.game?.status === 'playing' || window.game?.status === 'finished');
      }
    }

    await host.waitForFunction(() => window.game?.status === 'finished');
    await guest.waitForFunction(() => window.game?.status === 'finished');
    for (const page of [host, guest]) {
      const hidden = await page.locator('#dusk-forecast').evaluate(el => ({ text: el.textContent, display: getComputedStyle(el).display }));
      if (hidden.text !== '' || hidden.display !== 'none') throw new Error('forecast should be removed from the final recap');
    }

    console.log('live dusk forecast combines haul and map control for both commanders');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});

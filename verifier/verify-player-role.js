const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(process.argv[2] || 'http://pikmin-turns-web-1:3000');
    await page.fill('#name', 'Fern');
    await page.click('button:has-text("Play solo")');
    await page.waitForSelector('.player-role');

    const roles = () => page.locator('.player').evaluateAll(cards =>
      Object.fromEntries(cards.map(card => [card.querySelector('b').textContent.replace(' · active', ''), card.querySelector('.player-role').textContent]))
    );
    const assertRoles = async (expected) => {
      const actual = await roles();
      for (const [name, role] of Object.entries(expected)) {
        if (actual[name] !== role) throw new Error(`${name} role was ${JSON.stringify(actual[name])}, expected ${JSON.stringify(role)}; all roles: ${JSON.stringify(actual)}`);
      }
    };
    const skirmish = async () => {
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
        page.click('button:has-text("Swarm bridge")')
      ]);
    };

    await assertRoles({ Fern: 'Giving orders now', Sprout: 'Watching the garden' });
    await skirmish();
    await assertRoles({ Fern: 'Giving orders now', Sprout: 'Watching the garden' });

    for (let i = 0; i < 5; i++) await skirmish();
    await page.waitForSelector('#rematch', { state: 'visible' });
    await assertRoles({ Fern: 'Watching the garden', Sprout: 'Watching the garden' });

    console.log('player roles verified for turn and finished states');
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

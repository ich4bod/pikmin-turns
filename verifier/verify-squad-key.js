const { chromium } = require('playwright-core');

const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net';
const text = '🔴 red + 🔵 blue + 🟡 yellow = your squad';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const solo = await browser.newPage();
    await solo.goto(url);
    await solo.locator('#name').fill('Squad Verifier');
    await solo.getByRole('button', { name: 'Play solo' }).click();
    const key = solo.locator('#squad-key');
    await key.waitFor({ state: 'visible' });
    if (await key.textContent() !== text) throw Error(`expected visible squad key: ${text}`);

    const act = async name => {
      await Promise.all([
        solo.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
        solo.getByRole('button', { name }).click()
      ]);
    };
    for (const action of ['Scout', 'Gather', 'Carry relic', 'Scout', 'Gather', 'Gather', 'Carry relic', 'Scout', 'Gather', 'Carry relic']) await act(action);
    await solo.locator('#rematch').waitFor({ state: 'visible' });
    if (await key.isVisible()) throw Error('squad key remains visible after finish');

    const lobby = await browser.newPage();
    await lobby.goto(url);
    await lobby.locator('#name').fill('Lobby Verifier');
    await lobby.getByRole('button', { name: 'Plant a landing site' }).click();
    const lobbyKey = lobby.locator('#squad-key');
    await lobbyKey.waitFor({ state: 'hidden' });
    if (await lobbyKey.isVisible()) throw Error('squad key is visible in a hosted lobby');

    console.log('colored squad key verified for playing and nonplaying states');
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

const { chromium } = require('playwright-core');

const host = 'pikmin-turns.ichabod-crane.net';
const url = `https://${host}/`;

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.fill('#name', 'Phase Verifier');
    await page.click('#solo-btn');
    await page.waitForSelector('#game', { state: 'visible' });

    const assertNote = async text => {
      const note = page.locator('#phase-note');
      if (await note.textContent() !== text) throw new Error(`Expected phase note: ${text}`);
      if (!(await note.isVisible())) throw new Error('Expected phase note to be visible.');
    };
    const act = async action => {
      await page.locator(`button[onclick="act('${action}')"]`).click();
      await page.waitForTimeout(100);
    };

    await assertNote('Build a crew before the garden gets crowded.');
    await act('scout');
    await act('gather');
    await assertNote('Choose between supplies, routes, and the bridge.');
    await act('carry');
    await act('scout');
    await act('gather');
    await assertNote('Turn your preparation into haul before sunset.');
    await act('gather');
    await act('carry');
    await act('scout');
    await act('gather');
    await act('gather');
    await act('carry');

    const note = page.locator('#phase-note');
    if (await note.isVisible()) throw new Error('Expected phase note to be hidden after the game finishes.');
    console.log('garden phase notes verified from dawn through dusk');
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

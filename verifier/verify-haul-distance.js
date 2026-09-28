const { chromium } = require('playwright-core');

const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url);
    await page.locator('#name').fill('Fern');
    await page.getByRole('button', { name: 'Play solo' }).click();
    const distance = page.locator('#haul-distance');
    const expected = n => `You need ${n} more haul to fill the ship signal.`;
    await distance.waitFor({ state: 'visible' });
    if (await distance.textContent() !== expected(12)) throw Error(`expected ${expected(12)}`);

    const act = async name => {
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
        page.getByRole('button', { name }).click()
      ]);
    };
    await act('Scout');
    await act('Gather');
    await act('Carry relic');
    if (await distance.textContent() !== expected(8)) throw Error(`expected ${expected(8)}`);

    await act('Scout');
    await act('Gather');
    await act('Gather');
    await act('Carry relic');
    await act('Scout');
    await act('Gather');
    await act('Carry relic');
    if (await distance.isVisible()) throw Error('haul distance remains visible after finish');

    console.log('live haul distance verified through relic carry and finish');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

const { chromium } = require('playwright-core');

const url = 'https://pikmin-turns.ichabod-crane.net';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const host = await browser.newPage();
    const guest = await browser.newPage();

    await host.goto(url, { waitUntil: 'networkidle' });
    await host.locator('#name').fill('Count Host');
    await host.getByRole('button', { name: 'Plant a landing site' }).click();
    await host.locator('#game').waitFor({ state: 'visible' });
    const count = async page => (await page.locator('#dispatch-count').textContent()).trim();
    if (await count(host) !== '1 dispatch this garden') throw new Error(`Expected one dispatch after hosting, got "${await count(host)}".`);

    const code = (await host.locator('#code-value').textContent()).trim();
    await guest.goto(`${url}/?join=${code}`, { waitUntil: 'networkidle' });
    await guest.locator('#name').fill('Count Guest');
    await guest.getByRole('button', { name: 'Land here' }).click();
    await guest.locator('#game').waitFor({ state: 'visible' });
    if (await count(guest) !== '2 dispatches this garden') throw new Error(`Expected two dispatches after joining, got "${await count(guest)}".`);

    await host.waitForFunction(() => document.querySelector('#status').textContent.includes('Round 1 / 8'));
    await host.locator('button[onclick="act(\'scout\')"]').click();
    await host.waitForFunction(() => document.querySelector('#dispatch-count').textContent.trim() === '3 dispatches this garden');
    if (await count(host) !== '3 dispatches this garden') throw new Error(`Expected three dispatches after an order, got "${await count(host)}".`);

    console.log('dispatch count verified from landing through an order');
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

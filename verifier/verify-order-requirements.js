const { chromium } = require('playwright-core');

const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net';
const expected = [
  'Needs 2 Pikmin',
  'Needs 1 Pikmin',
  'Needs 3 Pikmin',
  'Needs 4 Pikmin · 3 nectar · 1 route',
  'Needs 2 nectar'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url);
    await page.locator('#name').fill('Fern');
    await page.getByRole('button', { name: 'Play solo' }).click();
    const labels = page.locator('.order-requirement');
    const assertLabels = async state => {
      const actual = await labels.allTextContents();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw Error(`${state}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    };
    await assertLabels('solo');

    const act = async name => {
      await Promise.all([
        page.waitForResponse(response => response.url().includes('/action') && response.status() === 200),
        page.getByRole('button', { name }).click()
      ]);
    };
    await act('Gather');
    await assertLabels('after Gather');

    await act('Scout');
    await act('Carry relic');
    await act('Scout');
    await act('Gather');
    await act('Gather');
    await act('Carry relic');
    await act('Scout');
    await act('Gather');
    await act('Carry relic');
    await page.locator('#final-recap').waitFor({ state: 'visible' });
    await assertLabels('finished');

    console.log('fixed order requirement labels verified across game states');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

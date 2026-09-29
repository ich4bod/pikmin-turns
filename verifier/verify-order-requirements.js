const { chromium } = require('playwright-core');

const url = process.argv[2] || 'http://127.0.0.1:3000';
const expected = [
  'Needs 2 Blue',
  'Needs 1 Yellow',
  'Needs 3 Red',
  'Needs 4 total · 3 nectar · 1 route',
  'Needs 2 nectar'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  try {
    await page.goto(url);
    await page.locator('#name').fill('Fern');
    await page.getByRole('button', { name: 'Solo' }).click();
    
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    // Wait a bit for the solo call to complete and the logs to be populated
    await page.waitForTimeout(2000);
    console.log('Captured BROWSER CONSOLE logs:', logs);

    const isH = await page.evaluate(() => {
      const mine = window.game.players.find(p => p.name === window.commander);
      return window.game.turn === window.commander;
    });
    console.log('Is human turn?', isH);
    const gameCode = await page.evaluate(() => window.game?.code);
    if (!gameCode) throw Error('Game code not found in browser!');
    console.log('Game code:', gameCode);
    const errorText = await page.$eval('#error', el => el.textContent);
    if (errorText) console.log('Error element text:', errorText);
    const labels = page.locator('.order-requirement');
    const assertLabels = async state => {
      const actual = await labels.allTextContents();
      console.log(`${state} actual labels: ${JSON.stringify(actual)}`);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw Error(`${state}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    };
    await assertLabels('solo');

    const act = async name => {
      const buttons = await page.locator('button').allTextContents();
      console.log('Available button texts:', buttons);
      await page.getByRole('button', { name: new RegExp(name) }).click();
      await page.waitForResponse(response => response.url().includes('/action') && response.status() === 200, { timeout: 10000 });
    };
    await act('Gather');
    await assertLabels('after Gather');

    await act('Scout');
    await assertLabels('after Scout');

    await act('Carry relic');
    await assertLabels('after Carry');

    const isFinished = await page.evaluate(() => window.game.status === 'finished');
    if (isFinished) {
      await assertLabels('finished');
    } else {
      console.log('Game not finished yet, skipping final assertLabels');
    }

    console.log('fixed order requirement labels verified across game states');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

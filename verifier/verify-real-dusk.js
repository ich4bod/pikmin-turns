const { chromium } = require('playwright-core');

(async () => {
  const host = 'pikmin-turns.ichabod-crane.net';
  const url = `https://${host}/?v=4`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.fill('#name', 'Verifier');
    await page.click('#solo-btn');
    await page.waitForSelector('#game', { state: 'visible' });

    const getStatus = async () => (await page.$eval('#status', el => el.textContent)).trim();
    const getRound = async () => {
        const status = await getStatus();
        const match = status.match(/Round (\d+)/);
        return match ? parseInt(match[1]) : null;
    };
    const getClockCellStatus = async (index) => await page.$eval(`#dusk-clock span:nth-child(${index})`, el => el.className);
    const getLog = async () => (await page.$eval('#log', el => el.textContent));

    // Play until round 8
    for (let r = 1; r < 8; r++) {
        // To avoid reaching 12 haul too early, try to gather nectar
        let btn = page.locator('button[onclick="act(\'gather\')"]');
        if (!(await btn.isEnabled())) {
            btn = page.locator('button.order:not(:disabled)').first();
        }
        await btn.click();
        await page.waitForTimeout(1500);
    }

    // Round 8 start
    const roundBefore = await getRound();
    if (roundBefore !== 8) throw new Error(`Expected round 8, got ${roundBefore}`);
    const statusBefore = await getStatus();
    if (!statusBefore.includes('Round 8')) throw new Error(`Expected status to indicate Round 8, got '${statusBefore}'`);

    // The order that ends the game
    const btn8 = page.locator('button.order:not(:disabled)').first();
    await btn8.click();
    await page.waitForTimeout(1500);

    // Finished
    const statusAfter = await getStatus();
    if (!statusAfter.includes('finished') && !statusAfter.includes('wins') && !statusAfter.includes('A tie')) {
        throw new Error(`Expected status finished or a winner, got '${statusAfter}'`);
    }
    
    if (!(statusAfter.includes('finished') || statusAfter.includes('wins') || statusAfter.includes('A tie'))) {
        const roundAfter = await getRound();
        if (roundAfter !== 8) throw new Error(`Expected round 8, got ${roundAfter}`);
    }


    // Clock cells
    for (let i = 1; i <= 8; i++) {
        const cls = await getClockCellStatus(i);
        if (cls !== 'done') throw new Error(`Expected cell ${i} to be 'done', got '${cls}'`);
    }

    // Dispatch log
    const log = await getLog();
    if (!log.includes('Dusk has reached the garden.')) {
        throw new Error(`Log does not include 'Dusk has reached the garden.'. Log: ${log}`);
    }

    // Final recap
    const recapText = await page.$eval('#final-recap', el => el.textContent);
    if (!recapText) throw new Error('Final recap is empty');
    if (!/\d+ haul/.test(recapText)) {
        throw new Error(`Final recap doesn't seem to match payload: ${recapText}`);
    }

    console.log('real round-eight dusk resolution verified');
    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
})();

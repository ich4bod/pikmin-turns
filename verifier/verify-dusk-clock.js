const { chromium } = require('playwright-core');

(async () => {
  const host = 'pikmin-turns.ichabod-crane.net';
  const url = `https://${host}/?v=4`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Starting solo game...');
    await page.goto(url, { waitUntil: 'networkidle' });
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.fill('#name', 'Verifier');
    await page.click('#solo-btn');
    
    console.log('Waiting for #game to be visible...');
    await page.waitForSelector('#game', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('#status');

    const getSpanClass = async (index) => await page.$eval(`#dusk-clock span:nth-child(${index})`, el => el.className);
    const getRoundNumber = async () => {
        const status = await page.$eval('#status', el => el.textContent);
        const match = status.match(/Round (\d+)/);
        return match ? parseInt(match[1]) : null;
    };
    const isFinished = async () => (await page.$eval('#status', el => el.textContent)).includes('wins');

    // 1. Assert Round 1
    console.log('Step 1: Asserting Round 1...');
    let round = await getRoundNumber();
    if (round !== 1) throw new Error(`Expected round 1, got ${round}`);
    
    const s1 = await getSpanClass(1);
    if (s1 !== 'now') throw new Error(`Expected span 1 to be 'now', got '${s1}'`);

    // 2. Play until finished or round 8
    console.log('Step 2: Playing...');
    let lastRound = 0;
    while (true) {
        const finished = await isFinished();
        const currentRound = await getRoundNumber();
        
        if (finished) {
            console.log('Game finished!');
            for (let i = 1; i <= 8; i++) {
                const cls = await getSpanClass(i);
                if (cls !== 'done') throw new Error(`Expected span ${i} to be 'done' in finished state, got '${cls}'`);
            }
            break;
        }

        if (currentRound) {
            console.log(`Checking Round ${currentRound}...`);
            for (let i = 1; i <= 8; i++) {
                const cls = await getSpanClass(i);
                if (i < currentRound) {
                    if (cls !== 'done') throw new Error(`Expected span ${i} to be 'done' in round ${currentRound}, got '${cls}'`);
                } else if (i === currentRound) {
                    if (cls !== 'now') throw new Error(`Expected span ${i} to be 'now' in round ${currentRound}, got '${cls}'`);
                } else {
                    if (cls !== '') throw new Error(`Expected span ${i} to be empty in round ${currentRound}, got '${cls}'`);
                }
            }

            if (currentRound >= 8) {
                console.log('eight-round dusk clock verified through game end');
                await browser.close();
                return;
            }
        }

        // Perform an action
        const allButtons = await page.$$('button.order');
        let acted = false;
        for (const b of allButtons) {
            const isReady = await b.evaluate(el => !el.disabled);
            if (isReady) {
                await b.click();
                acted = true;
                break;
            }
        }

        if (!acted) {
            console.log('No actions available, waiting...');
            await page.waitForTimeout(2000);
            const status = await page.$eval('#status', el => el.textContent);
            if (status.includes('Finished')) break;
        }

        await page.waitForTimeout(1000);
        
        if (currentRound && currentRound === lastRound && !acted) {
            console.log('No progress made. Breaking.');
            break;
        }
        lastRound = currentRound;
    }

    throw new Error('Game ended without reaching round 8 or finishing.');

  } catch (err) {
    console.error('VERIFICATION FAILED:', err.message);
    await browser.close();
    process.exit(1);
  }
})();

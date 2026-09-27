const { chromium } = require('playwright-core');

(async () => {
  const host = 'pikmin-turns-web-1';
  const port = '3000';
  const url = `http://${host}:${port}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Starting solo game...');
    await page.goto(url);
    await page.fill('#name', 'Verifier');
    await page.click('button:has-text("Play solo")');
    await page.waitForSelector('#status');

    const getSpanClass = async (index) => await page.$eval(`#dusk-clock span:nth-child(${index})`, el => el.className);

    // 1. Assert one current cell (Round 1)
    console.log('Step 1: Asserting Round 1 current cell...');
    await page.waitForTimeout(2000); // Wait for draw
    const span1Class = await getSpanClass(1);
    if (span1Class !== 'now') {
      throw new Error(`Expected span 1 to have class "now", but got "${span1Class}"`);
    }

    // 2. Make one legal action (Gather)
    console.log('Step 2: Performing Gather...');
    await page.click('button:has-text("Gather")');
    await page.waitForTimeout(2000); // Wait for round advancement

    // 3. Assert one completed plus one current cell (Round 2)
    console.log('Step 3: Asserting Round 2 (1 done, 1 now)...');
    const s1Class = await getSpanClass(1);
    const s2Class = await getSpanClass(2);
    if (s1Class !== 'done' || s2Class !== 'now') {
      throw new Error(`Expected span 1="done" and span 2="now", but got span 1="${s1Class}" and span 2="${s2Class}"`);
    }

    // 4. Complete the solo game
    console.log('Step 4: Completing the solo game...');
    let attempts = 0;
    while (attempts < 50) {
      const statusText = await page.$eval('#status', el => el.textContent);
      console.log('Current status:', statusText);
      
      if (!statusText.includes('Round')) {
        console.log('Game finished.');
        break;
      }

      const actionBtn = await page.$('button.order:not(:disabled)');
      if (actionBtn) {
        await actionBtn.click();
      } else {
        const nextMove = await page.$eval('#next-move', el => el.textContent);
        if (nextMove.includes('The garden is quiet')) {
          console.log('Game finished via next-move check.');
          break;
        }
        console.log('No actions available, waiting...');
      }
      
      await page.waitForTimeout(1500);
      attempts++;
    }

    if (attempts >= 50) {
      throw new Error('Game did not finish in time.');
    }

    // 5. Assert eight completed cells
    console.log('Step 5: Asserting eight completed cells...');
    for (let i = 1; i <= 8; i++) {
      const className = await getSpanClass(i);
      if (className !== 'done') {
        throw new Error(`Expected span ${i} to have class "done", but got "${className}"`);
      }
    }

    console.log('eight-round dusk clock verified through game end');
    await browser.close();

  } catch (err) {
    console.error('VERIFICATION FAILED:', err.message);
    await browser.close();
    process.exit(1);
  }
})();

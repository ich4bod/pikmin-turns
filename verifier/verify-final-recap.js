const { chromium } = require('playwright-core');

(async () => {
  console.log('Starting verifier...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL');
    process.exit(1);
  }
  console.log(`Navigating to ${url}`);
  await page.goto(url);

  // 1. Start solo game
  console.log('Starting solo game as Fern...');
  await page.fill('#name', 'Fern');
  await page.click('#solo');

  // 2. Play until end
  console.log('Playing game...');
  let roundsPlayed = 0;
  const maxRoundsToTry = 1000;

  while (roundsPlayed < maxRoundsToTry) {
    try {
      await page.waitForTimeout(500);
      
      const statusText = await page.$eval('#status', el => el.textContent);
      console.log(`Status: ${statusText}`);
      
      if (statusText.includes('wins') || statusText.includes('A tie')) {
        console.log('Game ended.');
        break;
      }

      const orderButtons = await page.$$('.order:not(:disabled)');
      if (orderButtons.length === 0) {
        console.log('No enabled order buttons. Waiting for turn change...');
        await page.waitForTimeout(1000);
        continue;
      }

      // Strategy: 
      // 1. If 'carry' is available, do it.
      // 2. Else if 'recruit' is available and we need more pikmin, do it.
      // 3. Else if 'gather' is available and we need nectar, do it.
      // 4. Else just click the first available.

      let targetButton = null;

      // Check for Carry
      for (const btn of orderButtons) {
        const text = await btn.$eval('b', el => el.textContent.toLowerCase());
        if (text.includes('carry')) {
          targetButton = btn;
          break;
        }
      }

      // Check for Recruit if no carry
      if (!targetButton) {
        for (const btn of orderButtons) {
          const text = await btn.$eval('b', el => el.textContent.toLowerCase());
          if (text.includes('grow')) {
            targetButton = btn;
            break;
          }
        }
      }

      // Check for Gather if no carry or recruit
      if (!targetButton) {
        for (const btn of orderButtons) {
          const text = await btn.$eval('b', el => el.textContent.toLowerCase());
          if (text.includes('gather')) {
            targetButton = btn;
            break;
          }
        }
      }

      // If still no target, pick the first available
      if (!targetButton) {
        targetButton = orderButtons[0];
      }

      console.log(`Action: clicking button...`);
      
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/action') && res.status() === 200),
        targetButton.click()
      ]);
      
      roundsPlayed++;
    } catch (e) {
      console.error('Error during game loop:', e.message);
      const statusText = await page.$eval('#status', el => el.textContent).catch(() => 'unknown');
      if (statusText.includes('wins') || statusText.includes('A tie')) break;
      throw e;
    }
  }
  
  if (roundsPlayed >= maxRoundsToTry) {
    throw new Error(`Game did not end after ${maxRoundsToTry} rounds`);
  }

  // 3. Assert visible Fern and Sprout lines match the final player payload fields exactly
  console.log('Verifying final recap...');
  await page.waitForSelector('#final-recap', { state: 'visible', timeout: 10000 });
  
  const verificationResult = await page.evaluate(async () => {
    const recap = document.getElementById('final-recap');
    const recapText = recap.innerText;

    const session = JSON.parse(sessionStorage.getItem('pikmin'));
    if (!session) return { error: 'No session found' };
    
    const response = await fetch(`/api/lobbies/${session.code}`);
    const game = await response.json();
    
    const expectedLines = game.players.map(p => `${p.name}: ${p.score} haul · ${p.insight} routes · ${p.squad} Pikmin`);
    const expectedText = expectedLines.join('\n');

    if (recapText.trim() === expectedText.trim()) {
      return { success: true };
    } else {
      return { success: false, expected: expectedText, actual: recapText };
    }
  });

  if (!verificationResult.success) {
    throw new Error(`Recap mismatch! Expected:\n${verificationResult.expected}\nActual:\n${verificationResult.actual}`);
  }
  console.log('Recap content verified.');

  // 4. Click Plant again (rematch)
  console.log('Looking for rematch button...');
  await page.waitForSelector('#rematch', { state: 'visible', timeout: 10000 });
  const rematchBtn = await page.$('#rematch');
  console.log('Clicking rematch button...');
  await rematchBtn.click();

  // 5. Assert it is hidden
  console.log('Verifying recap is hidden...');
  await page.waitForTimeout(1000);
  const isVisible = await page.$eval('#final-recap', el => getComputedStyle(el).display !== 'none');
  if (isVisible) {
    throw new Error('Expected #final-recap to be hidden, but it is still visible.');
  }
  console.log('Recap is hidden.');

  console.log('finished game final tally verified for both commanders');

  await browser.close();
})();

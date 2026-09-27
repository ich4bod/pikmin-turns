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
  console.log('Starting solo game...');
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

      // Find all enabled order buttons
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

  // 3. Click Plant again
  console.log('Looking for rematch button...');
  await page.waitForSelector('#rematch', { state: 'visible', timeout: 10000 });
  const rematchBtn = await page.$('#rematch');
  console.log('Clicking rematch button...');
  await rematchBtn.click();

  // 4. Assertions
  console.log('Verifying lobby state...');
  await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);

  const lobbyTitle = await page.$eval('#lobby-title', el => el.textContent);
  console.log(`Lobby title: ${lobbyTitle}`);
  if (lobbyTitle !== 'Sunspill Garden is waiting.') {
    throw new Error(`Expected lobby title "Sunspill Garden is waiting.", got: ${lobbyTitle}`);
  }

  const sessionData = await page.evaluate(() => {
    return JSON.stringify(sessionStorage.getItem('pikmin'));
  });
  console.log(`sessionStorage pikmin: ${sessionData}`);
  if (sessionData !== 'null') {
    throw new Error(`Expected sessionStorage 'pikmin' to be null, got: ${sessionData}`);
  }

  console.log('finished solo game returns cleanly to the lobby');

  await browser.close();
})();

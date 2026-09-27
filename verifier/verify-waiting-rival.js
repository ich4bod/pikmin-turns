const { chromium } = require('playwright-core');

(async () => {
  const host = 'pikmin-turns-web-1';
  const port = '3000';
  const url = `http://${host}:${port}`;

  const browser = await chromium.launch();
  const contextHost = await browser.newContext();
  const pageHost = await contextHost.newPage();
  
  const contextGuest = await browser.newContext();
  const pageGuest = await contextGuest.newPage();

  try {
    // 1. Host as Olimar
    console.log('Step 1: Hosting as Olimar...');
    await pageHost.goto(url);
    await pageHost.fill('#name', 'Olimar');
    await pageHost.click('button:has-text("Plant a landing site")');
    await pageHost.waitForSelector('#status');

    // 2. Assert wording and code
    console.log('Step 2: Asserting waiting-rival panel...');
    const codeText = await pageHost.$eval('#code-value', el => el.textContent.trim());
    const waitingText = await pageHost.$eval('#waiting-rival', el => el.textContent.trim());
    
    const expectedText = `Waiting for a second commander at seed ${codeText}.`;
    if (waitingText !== expectedText) {
      throw new Error(`Expected panel text "${expectedText}", but got "${waitingText}"`);
    }
    console.log('Step 2: Panel text verified:', waitingText);

    // 3. Join as Louie
    console.log('Step 3: Joining as Louie...');
    const joinCode = codeText;
    await pageGuest.goto(`${url}/?join=${joinCode}`);
    await pageGuest.fill('#name', 'Louie');
    await pageGuest.click('button:has-text("Land here")');
    
    // Wait for the duel to start (status becomes 'playing')
    await pageGuest.waitForSelector('#status');
    // Wait a bit for the host's page to update too
    await pageHost.waitForTimeout(2000);

    // 4. Assert both host and guest hide the panel
    console.log('Step 4: Asserting waiting-rival is hidden for both...');
    const hostPanelVisible = await pageHost.evaluate(() => {
      const el = document.getElementById('waiting-rival');
      return el.style.display !== 'none';
    });
    const guestPanelVisible = await pageGuest.evaluate(() => {
      const el = document.getElementById('waiting-rival');
      return el.style.display !== 'none';
    });

    if (hostPanelVisible || guestPanelVisible) {
      throw new Error(`Waiting-rival panel should be hidden. Host visible: ${hostPanelVisible}, Guest visible: ${guestPanelVisible}`);
    }
    console.log('Step 4: Panel hidden for both.');

    // 5. Start solo and assert it remains hidden
    console.log('Step 5: Starting solo game...');
    const contextSolo = await browser.newContext();
    const pageSolo = await contextSolo.newPage();
    await pageSolo.goto(url);
    await pageSolo.fill('#name', 'SoloPlayer');
    await pageSolo.click('button:has-text("Play solo")');
    await pageSolo.waitForSelector('#status');

    const soloPanelVisible = await pageSolo.evaluate(() => {
      const el = document.getElementById('waiting-rival');
      return el.style.display !== 'none';
    });

    if (soloPanelVisible) {
      throw new Error('Waiting-rival panel should be hidden in solo mode!');
    }
    console.log('Step 5: Panel hidden in solo mode.');

    console.log('hosted lobby waiting panel verified through second arrival');
    await browser.close();

  } catch (err) {
    console.error('VERIFICATION FAILED:', err.message);
    await browser.close();
    process.exit(1);
  }
})();

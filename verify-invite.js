const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const guestContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const baseUrl = process.argv[2];
  if (!baseUrl) {
    console.error('Missing base URL');
    process.exit(1);
  }

  try {
    // 1. Host as Olimar
    await hostPage.goto(baseUrl);
    await hostPage.fill('#name', 'Olimar');
    await hostPage.click('button:has-text("Plant a landing site")');
    
    // Wait for game to start (status changes or code appears)
    await hostPage.waitForSelector('#code-value');
    const code = await hostPage.$eval('#code-value', el => el.textContent);
    
    // Click copy
    await hostPage.click('#copy-invite');
    
    // Wait for the "Copied!" feedback if we want to be sure, 
    // but clipboard read should be fast.
    await hostPage.waitForTimeout(500);

    // Read back the exact URL from clipboard
    const copiedUrl = await hostPage.evaluate(async () => await navigator.clipboard.readText());
    
    if (!copiedUrl || !copiedUrl.includes('?join=' + code)) {
      console.error(`Clipboard did not contain the expected URL. Got: ${copiedUrl}`);
      process.exit(1);
    }

    // 2. Guest joins as Louie
    await guestPage.goto(copiedUrl);
    
    const prefilledCode = await guestPage.$eval('#code', el => el.value);
    if (prefilledCode !== code) {
      console.error(`Code not prefilled. Expected ${code}, got ${prefilledCode}`);
      process.exit(1);
    }

    // Assert name field is focused. 
    // We'll check if we can type into it or if it has focus.
    const isFocused = await guestPage.evaluate(() => document.activeElement.id === 'name');
    if (!isFocused) {
      console.error('Name field was not focused');
      process.exit(1);
    }

    await guestPage.fill('#name', 'Louie');
    await guestPage.click('button:has-text("Land here")');

    // Wait for Round 1 / 8 on both pages
    await hostPage.locator('text=Round 1 / 8').waitFor();
    await guestPage.locator('text=Round 1 / 8').waitFor();

    // 3. Invalid code test
    await guestPage.goto(`${baseUrl}?join=NOT-A-CODE`);
    const emptyCode = await guestPage.$eval('#code', el => el.value);
    if (emptyCode !== '') {
      console.error('Code field was not empty for invalid join code');
      process.exit(1);
    }

    // Start solo as Fern
    await guestPage.fill('#name', 'Fern');
    await guestPage.click('button:has-text("Play solo")');

    // Wait for game to start
    await guestPage.waitForSelector('#game', { timeout: 5000 });

    // Assert no invite button is visible
    const inviteButton = await guestPage.$('#copy-invite');
    if (inviteButton) {
      const isVisible = await inviteButton.isVisible();
      if (isVisible) {
        console.error('Invite button is visible in solo mode');
        process.exit(1);
      }
    }

    console.log('invite link verified from host clipboard through guest landing');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

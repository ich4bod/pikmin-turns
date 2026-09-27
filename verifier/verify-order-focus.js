const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = process.argv[2];
  if (!url) {
    console.error('Please provide a URL');
    process.exit(1);
  }
  await page.goto(url);

  const NAME = 'Focus Tester';

  // 1. Start solo game
  await page.fill('#name', NAME);
  await page.click('#solo');

  // 2. Wait for game to start
  await page.waitForSelector('.player', { timeout: 5000 });
  console.log('Game started');

  // 3. Tab to an enabled order
  await page.click('body');
  
  const enabledOrderSelector = 'button.order:not([disabled])';
  await page.waitForSelector(enabledOrderSelector);

  let focusedButton = null;
  // Press Tab until we hit an enabled order button
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    focusedButton = await page.$(':focus');
    if (focusedButton) {
      const isOrder = await focusedButton.evaluate(el => el.classList.contains('order'));
      const isDisabled = await focusedButton.evaluate(el => el.disabled);
      if (isOrder && !isDisabled) {
        break;
      }
    }
  }

  if (!focusedButton) {
    throw new Error('Could not focus an enabled order button via Tab');
  }

  // 4. Check outline width 3px and offset 3px
  const outlineInfo = await focusedButton.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      width: style.outlineWidth,
      offset: style.outlineOffset
    };
  });

  if (outlineInfo.width !== '3px') {
    throw new Error(`Expected outline width 3px, got ${outlineInfo.width}`);
  }
  if (outlineInfo.offset !== '3px') {
    throw new Error(`Expected outline offset 3px, got ${outlineInfo.offset}`);
  }

  // 5. Confirm a disabled Carry button cannot receive focus
  const carryButtonSelector = 'button[onclick*="carry"]';
  const carryButton = await page.$(carryButtonSelector);
  if (!carryButton) throw new Error('Carry button not found');
  
  const isDisabled = await carryButton.evaluate(el => el.disabled);
  if (!isDisabled) throw new Error('Carry button is not disabled');

  // Tab more to see if focus somehow lands on it (it shouldn't)
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const activeElement = await page.$(':focus');
    if (activeElement) {
      const isCarry = await activeElement.evaluate(el => el.matches('button[onclick*="carry"]'));
      if (isCarry) {
        throw new Error('Disabled Carry button received focus');
      }
    }
  }

  console.log('Pikmin order keyboard focus verified');
  await browser.close();
})();

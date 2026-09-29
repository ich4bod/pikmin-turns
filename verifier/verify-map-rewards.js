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

  const NAME = 'Fern';

  // 1. Start solo game
  await page.fill('#name', NAME);
  await page.click('#solo-btn');

  // 2. Wait for game to start
  await page.waitForSelector('.player', { timeout: 5000 });
  console.log('Game started');

  async function getRewardLabel(id) {
    return await page.$eval(`#${id}`, el => {
      const small = el.parentElement.querySelector('small.place-reward');
      return small ? small.textContent.trim() : null;
    });
  }

  // 3. Assert initial labels are present
  console.log('Asserting initial labels...');
  const meadowLabel = await getRewardLabel('meadow');
  if (meadowLabel !== 'Gather: +2 nectar (4+ Blue: +3)') throw new Error(`Expected 'Gather: +2 nectar (4+ Blue: +3)' for meadow reward, got '${meadowLabel}'`);

  const bridgeLabel = await getRewardLabel('bridge');
  if (bridgeLabel !== 'Swarm: +1 haul (4+ Red: +2)') throw new Error(`Expected 'Swarm: +1 haul (4+ Red: +2)' for bridge reward, got '${bridgeLabel}'`);

  const relicLabel = await getRewardLabel('relic');
  if (relicLabel !== 'Carry: 4 total + 3 nectar + route: +4 haul.') throw new Error(`Expected 'Carry: 4 total + 3 nectar + route: +4 haul.' for relic reward, got '${relicLabel}'`);

  // 4. Make Gather (claims meadow)
  console.log('Performing Gather...');
  await page.click('button[onclick*="gather"]');
  await page.waitForTimeout(1500);

  // Verify meadow ownership updated and label remained
  const meadowOwner = await page.$eval('#meadow', el => el.textContent.trim());
  if (meadowOwner !== `${NAME} controls this`) throw new Error(`Expected '${NAME} controls this' for meadow, got '${meadowOwner}'`);
  const meadowLabelAfter = await getRewardLabel('meadow');
  if (meadowLabelAfter !== 'Gather: +2 nectar (4+ Blue: +3)') throw new Error(`Meadow reward label lost after gather: '${meadowLabelAfter}'`);

  // 5. Make Scout (claims nothing, but increases insight/routes)
  console.log('Performing Scout...');
  await page.click('button[onclick*="scout"]');
  await page.waitForTimeout(1500);
  // Verify labels remain
  const bridgeLabelAfter = await getRewardLabel('bridge');
  if (bridgeLabelAfter !== 'Swarm: +1 haul (4+ Red: +2)') throw new Error(`Bridge reward label lost after scout: '${bridgeLabelAfter}'`);
  const relicLabelAfter = await getRewardLabel('relic');
  if (relicLabelAfter !== 'Carry: 4 total + 3 nectar + route: +4 haul.') throw new Error(`Relic reward label lost after scout: '${relicLabelAfter}'`);

  // 6. Make Skirmish (claims bridge)
  console.log('Performing Skirmish...');
  await page.click('button[onclick*="skirmish"]');
  await page.waitForTimeout(1500);

  // Verify bridge ownership updated and label remained
  const bridgeOwner = await page.$eval('#bridge', el => el.textContent.trim());
  if (bridgeOwner !== `${NAME} controls this`) throw new Error(`Expected '${NAME} controls this' for bridge, got '${bridgeOwner}'`);
  const bridgeLabelAfterSkirmish = await getRewardLabel('bridge');
  if (bridgeLabelAfterSkirmish !== 'Swarm: +1 haul (4+ Red: +2)') throw new Error(`Bridge reward label lost after skirmish: '${bridgeLabelAfterSkirmish}'`);

  // 7. Make Carry (claims relic)
  console.log('Waiting for Carry button to be enabled...');
  await page.waitForSelector('button[onclick*="carry"]:not([disabled])', { timeout: 5000 });
  await page.click('button[onclick*="carry"]');
  await page.waitForTimeout(1500);

  // Verify relic ownership updated and label remained
  const relicOwner = await page.$eval('#relic', el => el.textContent.trim());
  if (relicOwner !== `${NAME} controls this`) throw new Error(`Expected '${NAME} controls this' for relic, got '${relicOwner}'`);
  const relicLabelAfterCarry = await getRewardLabel('relic');
  if (relicLabelAfterCarry !== 'Carry: 4 total + 3 nectar + route: +4 haul.') throw new Error(`Relic reward label lost after carry: '${relicLabelAfterCarry}'`);

  console.log('garden map reward labels verified with live claims');
  await browser.close();
})();

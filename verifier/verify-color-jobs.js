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

  // Assert exact key and labels
  const squadKey = await page.textContent('#squad-key');
  const expectedKey = '🔴 red swarm · 🔵 blue gather · 🟡 yellow scout · all colors carry';
  if (squadKey !== expectedKey) throw new Error(`expected squad key: ${expectedKey}, got '${squadKey}'`);

  const gatherLabel = await page.textContent('.order:nth-child(1) .order-requirement');
  const scoutLabel = await page.textContent('.order:nth-child(2) .order-requirement');
  const swarmLabel = await page.textContent('.order:nth-child(3) .order-requirement');
  const carryLabel = await page.textContent('.order:nth-child(4) .order-requirement');
  const recruitLabel = await page.textContent('.order:nth-child(5) .order-requirement');

  if (gatherLabel !== 'Needs 2 Blue') throw new Error(`expected gather label 'Needs 2 Blue', got '${gatherLabel}'`);
  if (scoutLabel !== 'Needs 1 Yellow') throw new Error(`expected scout label 'Needs 1 Yellow', got '${scoutLabel}'`);
  if (swarmLabel !== 'Needs 3 Red') throw new Error(`expected swarm label 'Needs 3 Red', got '${swarmLabel}'`);
  if (carryLabel !== 'Needs 4 total · 3 nectar · 1 route') throw new Error(`expected carry label 'Needs 4 total · 3 nectar · 1 route', got '${carryLabel}'`);
  if (recruitLabel !== 'Needs 2 nectar') throw new Error(`expected recruit label 'Needs 2 nectar', got '${recruitLabel}'`);

  // Assert Swarm disabled at red 2 while Gather/Scout ready
  // In solo mode, we start with 2/2/2.
  const swarmButton = page.locator('.order:nth-child(3)');
  const isSwarmDisabled = await swarmButton.isDisabled();
  if (!isSwarmDisabled) throw new Error('Swarm should be disabled at 2 red Pikmin');

  const gatherButton = page.locator('.order:nth-child(1)');
  const isGatherEnabled = await gatherButton.isEnabled();
  if (!isGatherEnabled) throw new Error('Gather should be enabled');

  const scoutButton = page.locator('.order:nth-child(2)');
  const isScoutEnabled = await scoutButton.isEnabled();
  if (!isScoutEnabled) throw new Error('Scout should be enabled');

  // Gather then Grow
  await gatherButton.click();
  // Wait for Sprout's turn to finish (in solo mode, one click handles both)
  await page.waitForTimeout(1000);

  await page.click('button[onclick*="recruit"]');
  await page.waitForTimeout(1000);

  // Assert counts 3/3/3 and Swarm ready
  const unitsElement = page.locator('.player.you .units');
  const unitsTextCorrect = await unitsElement.textContent();
  if (unitsTextCorrect !== '🔴3 🔵3 🟡3') throw new Error(`expected units 🔴3 🔵3 🟡3, got '${unitsTextCorrect}'`);

  const isSwarmEnabledAfterGrow = await swarmButton.isEnabled();
  if (!isSwarmEnabledAfterGrow) throw new Error('Swarm should be enabled after Grow to 3 red');

  // Swarm and assert exact Red dispatch with +2 haul (since squad is 9)
  await swarmButton.click();
  await page.waitForTimeout(1000);
  const log = await page.textContent('#log');
  if (!log.includes('sent 5 Red Pikmin across Mossy Bridge (+2 haul')) throw new Error(`Expected swarm log, got '${log}'`);

  // ensure Carry requirement still says total
  const carryRequirementText = await page.textContent('.order:nth-child(4) .order-requirement');
  if (carryRequirementText !== 'Needs 4 total · 3 nectar · 1 route') throw new Error(`Carry requirement should still say total, got '${carryRequirementText}'`);

  console.log('distinct red blue and yellow garden jobs verified');
  await browser.close();
})();

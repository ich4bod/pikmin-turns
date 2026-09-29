const { chromium } = require('playwright-core');

const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    
    // 1. Start solo
    await page.locator('#name').fill('Solo Tester');
    await page.getByRole('button', { name: 'Play solo' }).click();
    await page.waitForResponse(res => res.url().includes('/api/solo') && res.status() === 201);

    // 2. Assert exact key and labels
    const squadKey = '🔴 red swarm · 🔵 blue gather · 🟡 yellow scout · all colors carry';
    const keyText = await page.locator('#squad-key').textContent();
    if (keyText !== squadKey) throw Error(`expected squad key: ${squadKey}, got: ${keyText}`);

    const expectedLabels = [
      'Needs 2 Blue',
      'Needs 1 Yellow',
      'Needs 3 Red',
      'Needs 4 total · 3 nectar · 1 route',
      'Needs 2 nectar'
    ];
    const actualLabels = await page.locator('.order-requirement').allTextContents();
    for (let i = 0; i < expectedLabels.length; i++) {
      if (actualLabels[i].trim() !== expectedLabels[i]) {
        throw Error(`expected label ${i} to be "${expectedLabels[i]}", got "${actualLabels[i]}"`);
      }
    }

    // 3. Assert Swarm disabled at red 2 while Gather/Scout ready
    // Initial squad is 2/2/2
    const isSwarmDisabled = await page.locator('button:has-text("Swarm bridge")').isDisabled();
    if (!isSwarmDisabled) throw Error('Swarm should be disabled at 2 Red');
    
    const isGatherReady = await page.locator('button:has-text("Gather")').isEnabled();
    if (!isGatherReady) throw Error('Gather should be ready at 2 Blue');

    const isScoutReady = await page.locator('button:has-text("Scout")').isEnabled();
    if (!isScoutReady) throw Error('Scout should be ready at 2 Yellow');

    // 4. Gather then Grow
    const act = async (name) => {
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/action') && res.status() === 200),
            page.getByRole('button', { name: new RegExp(name, 'i') }).click()
        ]);
        await page.waitForTimeout(500);
    };

    await act('Gather');
    
    const p = await page.evaluate(() => window.game.players.find(p => p.name === window.commander));
    if (p.nectar !== 3) throw Error(`expected nectar 3, got ${p.nectar}`);

    await act('Grow Pikmin');
    
    const p2 = await page.evaluate(() => window.game.players.find(p => p.name === window.commander));
    if (p2.nectar !== 1) throw Error(`expected nectar 1, got ${p2.nectar}`);
    if (p2.units.red !== 3 || p2.units.blue !== 3 || p2.units.yellow !== 3) throw Error(`expected 3/3/3 units, got ${JSON.stringify(p2.units)}`);

    // 5. Assert counts 3/3/3 and Swarm ready
    const isSwarmReady = await page.locator('button:has-text("Swarm bridge")').isEnabled();
    if (!isSwarmReady) throw Error('Swarm should be ready at 3/3/3');

    // 6. Swarm and assert exact Red dispatch with +1 haul
    await act('Swarm bridge');
    
    const logMessages = await page.locator('.logline').allTextContents();
    const commanderName = await page.evaluate(() => window.commander);
    const swarmLog = logMessages.find(m => m.includes(commanderName) && m.includes('Mossy Bridge'));
    if (!swarmLog) throw Error(`expected swarm log for ${commanderName}, but not found`);
    
    const expectedSwarmLog = `${commanderName} sent 3 Red Pikmin across Mossy Bridge (+1 haul; Sprout loses 1 nectar).`;
    if (swarmLog.trim() !== expectedSwarmLog) throw Error(`expected swarm log: "${expectedSwarmLog}", got: "${swarmLog}"`);

    const p3 = await page.evaluate(() => window.game.players.find(p => p.name === window.commander));
    if (p3.score !== 1) throw Error(`expected score 1, got ${p3.score}`);

    // 7. Ensure Carry requirement still says total
    const carryReq = await page.locator('button:has-text("Carry relic") .order-requirement').textContent();
    if (carryReq.trim() !== 'Needs 4 total · 3 nectar · 1 route') {
        throw Error(`expected carry requirement "${'Needs 4 total · 3 nectar · 1 route'}", got "${carryReq}"`);
    }

    console.log('distinct red blue and yellow garden jobs verified');

  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

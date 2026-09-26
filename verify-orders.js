const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const url = process.argv[2];

  try {
    await page.goto(url);

    const getAvailability = async (id) => {
      return await page.$eval(`#availability-${id}`, el => el.textContent.trim());
    };

    // Start solo as Fern
    await page.fill('#name', 'Fern');
    await page.click('#solo');
    // Wait for game to load
    await page.waitForSelector('.orders');

    // 1. Assert initial state
    // Gather/Scout/Swarm enabled with Ready
    if (await getAvailability('gather') !== 'Ready') throw new Error(`Gather not Ready: ${await getAvailability('gather')}`);
    if (await getAvailability('scout') !== 'Ready') throw new Error(`Scout not Ready: ${await getAvailability('scout')}`);
    if (await getAvailability('skirmish') !== 'Ready') throw new Error(`Swarm bridge not Ready: ${await getAvailability('skirmish')}`);

    // Carry/Grow disabled with exact strings
    if (await getAvailability('carry') !== 'Needs 4 Pikmin · 3 nectar · 1 route') throw new Error(`Carry requirement wrong: ${await getAvailability('carry')}`);
    if (await getAvailability('recruit') !== 'Needs 2 nectar') throw new Error(`Grow requirement wrong: ${await getAvailability('recruit')}`);

    // 2. Gather twice and assert Grow becomes ready while Carry stays blocked
    await page.click('button:has-text("Gather")');
    // Wait for update
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Gather")');
    await page.waitForTimeout(1000);

    if (await getAvailability('recruit') !== 'Ready') throw new Error(`Grow not ready after gather: ${await getAvailability('recruit')}`);
    if (await getAvailability('carry') !== 'Needs 4 Pikmin · 3 nectar · 1 route') throw new Error(`Carry still not ready: ${await getAvailability('carry')}`);

    // 3. Scout and assert Carry becomes ready
    await page.click('button:has-text("Scout")');
    // Wait for update
    await page.waitForTimeout(1000);

    if (await getAvailability('carry') !== 'Ready') throw new Error(`Carry not ready after scout: ${await getAvailability('carry')}`);

    // 4. Carry and confirm the dispatch log names the relic action
    await page.click('button:has-text("Carry relic")');
    // Wait for update
    await page.waitForTimeout(1000);

    const logText = await page.$eval('#log', el => el.textContent);
    if (!logText.includes('assigned 4 Pikmin to carry the Sun Relic')) {
      throw new Error(`Log does not mention relic carry: ${logText}`);
    }

    console.log('order guidance verified from blocked carry to completed relic haul');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

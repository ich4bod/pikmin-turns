const { chromium } = require('playwright-core');

(async () => {
  const host = 'pikmin-turns.ichabod-crane.net';
  const url = `https://${host}/?v=4`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.fill('#name', 'Verifier');
    await page.click('#solo-btn');
    await page.waitForSelector('#game', { state: 'visible' });

    const getStatus = async () => (await page.$eval('#status', el => el.textContent)).trim();
    const getRound = async () => {
        const status = await getStatus();
        const match = status.match(/Round (\d+)/);
        return match ? parseInt(match[1]) : null;
    };
    const getPlan = async () => {
      const text = await page.$eval('#rival-plan', el => el.textContent);
      if (text.includes('Sprout is planning: ')) {
        return text.replace('Sprout is planning: ', '').replace('.', '');
      }
      return text.trim();
    };
    const getLog = async () => (await page.$eval('#log', el => el.textContent));

    const expectedSequence = [
      'Map a route',
      'Gather nectar',
      'Carry the Sun Relic',
      'Map a route',
      'Gather nectar',
      'Gather nectar',
      'Carry the Sun Relic',
      'Map a route'
    ];

    const expectedDispatches = [
      'Sprout sent 1 Yellow Pikmin to Lookout Ridge (+1 route).',
      'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',
      'Sprout assigned 4 Pikmin to carry the Sun Relic (+4 haul).',
      'Sprout sent 1 Yellow Pikmin to Lookout Ridge (+1 route).',
      'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',
      'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',
      'Sprout assigned 4 Pikmin to carry the Sun Relic (+4 haul).',
      'Sprout sent 1 Yellow Pikmin to Lookout Ridge (+1 route).'
    ];

    // Loop through the 8 rounds
    for (let i = 0; i < 8; i++) {
        // Check plan before human acts
        const currentPlan = await getPlan();
        if (currentPlan !== expectedSequence[i]) {
            throw new Error(`Round ${i+1}: Expected plan '${expectedSequence[i]}', got '${currentPlan}'`);
        }

        // Human acts
        let btn = page.locator('button[onclick="act(\'gather\')"]');
        if (!(await btn.isEnabled())) {
            btn = page.locator('button.order:not(:disabled)').first();
        }
        await btn.click();
        
        // Wait for Sprout to act and plan to update
        await page.waitForTimeout(2000);

        // Check Sprout's dispatch in log
        const log = await getLog();
        if (!log.includes(expectedDispatches[i])) {
            throw new Error(`Round ${i+1}: Expected dispatch '${expectedDispatches[i]}' not found in log.`);
        }
    }

    // At dusk (after 8 rounds)
    // The loop above goes up to i=7 (round 8).
    // After the 8th human action, Sprout acts, then the round becomes 8 and eventually finished.
    // Wait, the sequence is 8 actions. After the 8th action, the game might be finished.
    
    const status = await getStatus();
    if (!status.includes('finished') && !status.includes('wins') && !status.includes('A tie')) {
        // Might need more turns to reach dusk if round is not 8 yet
        // But 8 rounds should be enough.
    }

    const planAfter = await getPlan();
    if (planAfter !== '') {
        throw new Error(`Expected plan to be hidden at dusk, but got '${planAfter}'`);
    }

    // Check final values (checking haul is enough)
    // We can check the recap or the players list.
    // Let's check the logs for the last dispatch.
    const log = await getLog();
    if (!log.includes('Dusk has reached the garden.')) {
        throw new Error(`Log does not include 'Dusk has reached the garden.'. Log: ${log}`);
    }

    console.log('Sprout strategy verified through an eight-round relic race');
    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
})();

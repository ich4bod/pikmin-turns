const { chromium } = require('playwright-core');
const url = process.argv[2];

(async () => {
  const browser = await chromium.launch();
  const contextFern = await browser.newContext();
  const contextMoss = await browser.newContext();

  const pageFern = await contextFern.newPage();
  const pageMoss = await contextMoss.newPage();

  const act = async (page, actionName) => {
    await page.click(`button.order[onclick*="'${actionName}'"]`);
    await page.waitForTimeout(1500);
  };

  try {
    // 1. Setup duel
    await pageFern.goto(url);
    await pageFern.fill('#name', 'Fern');
    await pageFern.click('button:has-text("Plant a landing site")');
    await pageFern.waitForSelector('#game', { state: 'visible' });
    const code = await pageFern.$eval('#code-value', el => el.textContent.trim());
    
    await pageMoss.goto(url);
    await pageMoss.fill('#name', 'Moss');
    await pageMoss.fill('#code', code);
    await pageMoss.click('button:has-text("Land here")');
    
    await pageFern.waitForSelector('#status', { state: 'visible' });
    await pageFern.waitForFunction(() => {
      const status = document.getElementById('status').textContent;
      return status.trim() !== 'Waiting for your rival';
    });
    await pageMoss.waitForFunction(() => {
      const status = document.getElementById('status').textContent;
      return status.trim() !== 'Waiting for your rival';
    });

    // Assert hidden round 1
    const edgeVisibleR1 = await pageFern.$eval('#dusk-edge', el => window.getComputedStyle(el).display !== 'none');
    if (edgeVisibleR1) throw new Error('Expected dusk-edge to be hidden in round 1');

    // 2. Play rounds
    for (let r = 1; r <= 8; r++) {
      if (r === 6) {
        const edgeText = await pageFern.$eval('#dusk-edge', el => el.textContent);
        if (edgeText !== 'Dusk edge: Fern has more routes.') {
          throw new Error(`Round 6 expected 'Dusk edge: Fern has more routes.', got '${edgeText}'`);
        }
      }
      if (r === 7) {
        const edgeText = await pageFern.$eval('#dusk-edge', el => el.textContent);
        if (edgeText !== 'Dusk edge: Moss has more haul.') {
          throw new Error(`Round 7 expected 'Dusk edge: Moss has more haul.', got '${edgeText}'`);
        }
      }
      if (r === 8) {
        const edgeText = await pageFern.$eval('#dusk-edge', el => el.textContent);
        if (edgeText !== 'Dusk edge: Fern has the larger squad.') {
          throw new Error(`Round 8 expected 'Dusk edge: Fern has the larger squad.', got '${edgeText}'`);
        }
      }

      if (r <= 5) {
        const fernActions = ['scout', 'scout', 'gather', 'recruit', 'gather'];
        const mossActions = ['scout', 'gather', 'gather', 'gather', 'gather'];
        await act(pageFern, fernActions[r-1]);
        await act(pageMoss, mossActions[r-1]);
      } else if (r === 6) {
        await act(pageFern, 'gather');
        await act(pageMoss, 'carry');
      } else if (r === 7) {
        await act(pageFern, 'carry');
        await act(pageMoss, 'scout');
      } else if (r === 8) {
        await act(pageFern, 'gather');
        await act(pageMoss, 'gather');
      }
    }

    // 3. Assertions after round 8
    const statusAfter = await pageFern.$eval('#status', el => el.textContent);
    if (!statusAfter.includes('finished') && !statusAfter.includes('wins') && !statusAfter.includes('A tie')) {
        throw new Error(`Expected status finished, got '${statusAfter}'`);
    }

    const edgeVisibleFinal = await pageFern.$eval('#dusk-edge', el => window.getComputedStyle(el).display !== 'none');
    if (edgeVisibleFinal) throw new Error('Expected dusk-edge to be hidden after round 8');

    // Clock cells
    const positions = [];
    for (let i = 1; i <= 8; i++) {
      const cell = await pageFern.$eval(`#dusk-clock span:nth-child(${i})`, el => {
        const style = window.getComputedStyle(el);
        return {
          border: style.border,
          left: el.getBoundingClientRect().left
        };
      });
      // #17352c is rgb(23, 53, 44)
      if (cell.border !== '1px solid rgb(23, 53, 44)') {
        throw new Error(`Expected cell ${i} to have 1px solid border, got '${cell.border}'`);
      }
      positions.push(cell.left);
    }
    const uniquePositions = new Set(positions.map(p => Math.round(p * 100) / 100));
    if (uniquePositions.size !== 8) {
      throw new Error(`Expected 8 distinct horizontal positions for clock cells, got ${uniquePositions.size}`);
    }

    console.log('dusk edge verified across haul route squad and finished states');
    await browser.close();
  } catch (err) {
    console.error(err);
    await browser.close();
    process.exit(1);
  }
})();

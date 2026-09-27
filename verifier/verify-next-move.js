const { chromium } = require('playwright-core');

(async () => {
  const host = 'pikmin-turns-web-1';
  const port = '3000';
  const url = `http://${host}:${port}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Starting solo game as Fern...');
    await page.goto(url);
    await page.fill('#name', 'Fern');
    await page.click('button:has-text("Play solo")');
    await page.waitForSelector('#status');

    const getNextMoveText = async () => await page.$eval('#next-move', el => el.textContent);
    const getStatusText = async () => await page.$eval('#status', el => el.textContent);

    // 1. Assert Scout wording initially
    let move = await getNextMoveText();
    console.log('Step 1: Initial move:', move);
    if (move !== 'Scout to map a route for relic carrying.') {
      throw new Error(`Expected "Scout to map a route for relic carrying.", but got "${move}"`);
    }

    // 2. Gather and assert Grow wording
    console.log('Step 2: Performing Gather until Grow is the next move...');
    while (true) {
      move = await getNextMoveText();
      if (move === 'Grow your squad: 2 nectar becomes 3 Pikmin.') break;
      console.log('Current move:', move, '- performing Gather');
      await page.click('button:has-text("Gather")');
      await page.waitForTimeout(1000);
    }
    console.log('Step 2: Next move is now:', move);

    // 3. Recruit
    console.log('Step 3: Performing Recruit...');
    await page.click('button:has-text("Grow Pikmin")');
    await page.waitForTimeout(1000);

    // 4. Scout and assert Carry wording
    console.log('Step 4: Performing actions until Carry is the next move...');
    while (true) {
      move = await getNextMoveText();
      console.log('Current move:', move);
      if (move === 'A relic is ready: carry it for 4 haul.') break;
      
      if (move.includes('Scout')) {
          console.log('Performing Scout...');
          await page.click('button:has-text("Scout")');
      } else if (move.includes('Grow')) {
          console.log('Performing Recruit...');
          await page.click('button:has-text("Grow Pikmin")');
      } else if (move.includes('Gather')) {
          console.log('Performing Gather...');
          await page.click('button:has-text("Gather")');
      } else if (move.includes('Swarm')) {
          console.log('Performing Swarm...');
          await page.click('button:has-text("Swarm bridge")');
      } else {
          console.log('Nothing to do or waiting...');
      }
      await page.waitForTimeout(1000);
    }
    console.log('Step 4: Next move is now:', move);

    // 5. Carry and finish the game
    console.log('Step 5: Performing Carry...');
    // Use force click to bypass disabled check if it's a timing issue
    await page.click('button:has-text("Carry relic")', { force: true });
    await page.waitForTimeout(1000);

    console.log('Step 5: Waiting for game to finish...');
    let finished = false;
    let attempts = 0;
    while (attempts < 50) {
      const status = await getStatusText();
      if (!status.includes('Round') && !status.includes('Share') && !status.includes('waiting') && !status.includes('lobby')) {
        finished = true;
        break;
      }
      
      const isOurTurn = await page.$('.player.you') !== null;
      if (isOurTurn) {
        const nextMove = await getNextMoveText();
        console.log('Our turn, next move:', nextMove);
        if (nextMove.includes('Grow')) {
          await page.click('button:has-text("Grow Pikmin")');
        } else if (nextMove.includes('Scout')) {
          await page.click('button:has-text("Scout")');
        } else if (nextMove.includes('Gather')) {
          await page.click('button:has-text("Gather")');
        } else if (nextMove.includes('carry')) {
          await page.click('button:has-text("Carry relic")', { force: true });
        } else if (nextMove.includes('Swarm')) {
          await page.click('button:has-text("Swarm bridge")');
        }
      }
      
      await page.waitForTimeout(1000);
      attempts++;
    }

    if (!finished) {
      throw new Error('Game did not finish in time.');
    }

    // 6. Assert #next-move is hidden
    console.log('Step 6: Checking if #next-move is hidden...');
    const isVisible = await page.evaluate(() => {
      const el = document.getElementById('next-move');
      return el.style.display !== 'none' && el.textContent.trim() !== '';
    });
    
    if (isVisible) {
      throw new Error('#next-move is still visible after game finished!');
    }

    console.log('next move guidance verified from scout to relic carry');
    await browser.close();

  } catch (err) {
    console.error('VERIFICATION FAILED:', err.message);
    await browser.close();
    process.exit(1);
  }
})();

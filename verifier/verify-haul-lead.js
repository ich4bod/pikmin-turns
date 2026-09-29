const { chromium } = require('playwright-core');

(async () => {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node verifier/verify-haul-lead.js <url>');
    process.exit(1);
  }

  const browser = await chromium.launch();
  
  async function createPlayer(name) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);
    await page.fill('#name', name);
    return { context, page };
  }

  async function act(page, actionText) {
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/action') && res.status() === 200),
      page.click(`button:has-text("${actionText}")`)
    ]);
  }

  async function waitForTurn(page, playerName) {
    await page.waitForFunction((name) => {
      const status = document.getElementById('status').textContent;
      return status.includes(name) && status.includes('turn');
    }, playerName);
  }

  try {
    // 1. Setup Duel
    const host = await createPlayer('Host');
    await host.page.fill('#name', 'Host');
    await host.page.click('button:has-text("Plant a landing site")');
    await host.page.waitForFunction(() => document.getElementById('code-value').textContent.trim() !== '');

    const hostError = await host.page.textContent('#error');
    if (hostError && hostError.trim() !== '') {
      throw new Error(`Host action failed with error: ${hostError}`);
    }

    // The code is in #code-value
    const code = await host.page.evaluate(() => document.getElementById('code-value').textContent);
    
    const guest = await createPlayer('Guest');
    await guest.page.fill('#name', 'Guest');
    await guest.page.fill('#code', code);
    await guest.page.click('button:has-text("Land here")');

    const guestError = await guest.page.textContent('#error');
    if (guestError && guestError.trim() !== '') {
      throw new Error(`Guest action failed with error: ${guestError}`);
    }

    await host.page.waitForSelector('#game', { state: 'visible' }).catch(async () => {
      const err = await host.page.textContent('#error');
      console.log('Error in #error:', err);
    });
    await guest.page.waitForSelector('#game', { state: 'visible' });

    // 2. Assert tie at zero
    await host.page.waitForFunction(() => {
      const el = document.getElementById('haul-lead');
      return el.textContent.includes('tied');
    });

    const hostTiedText = await host.page.textContent('#haul-lead');
    const guestTiedText = await guest.page.textContent('#haul-lead');
    if (!hostTiedText.includes('tied') || !guestTiedText.includes('tied')) {
       throw new Error(`Tie not detected. Host: ${hostTiedText}, Guest: ${guestTiedText}`);
    }

    // 3. Prepare and Swarm (Host) / Non-scoring (Guest)
    // Host: gather -> recruit -> skirmish
    // Guest: gather -> recruit -> gather -> recruit

    // Round 1
    await waitForTurn(host.page, 'Host');
    await act(host.page, 'Gather');
    await waitForTurn(guest.page, 'Guest');
    await act(guest.page, 'Gather');

    // Round 2
    await waitForTurn(host.page, 'Host');
    await act(host.page, 'Grow Pikmin');
    await waitForTurn(guest.page, 'Guest');
    await act(guest.page, 'Grow Pikmin');

    // Round 3
    await waitForTurn(host.page, 'Host');
    await act(host.page, 'Swarm bridge');
    // Host score should be 1.

    // Assert requirements: Host is leading.
    await host.page.waitForFunction(() => document.getElementById('haul-lead').textContent.includes('You lead by 1 haul.'));
    await guest.page.waitForFunction(() => document.getElementById('haul-lead').textContent.includes('Host leads by 1 haul.'));

    const hostLeadAfterHostSwarm = await host.page.textContent('#haul-lead');
    const guestLeadAfterHostSwarm = await guest.page.textContent('#haul-lead');
    
    if (hostLeadAfterHostSwarm !== 'You lead by 1 haul.') {
        throw new Error(`Host expected 'You lead by 1 haul.', got '${hostLeadAfterHostSwarm}'`);
    }
    if (guestLeadAfterHostSwarm !== 'Host leads by 1 haul.') {
        throw new Error(`Guest expected 'Host leads by 1 haul.', got '${guestLeadAfterHostSwarm}'`);
    }

    await waitForTurn(guest.page, 'Guest');
    await act(guest.page, 'Gather'); // Non-scoring

    // Round 4
    await waitForTurn(host.page, 'Host');
    await act(host.page, 'Gather'); // Non-scoring
    
    await waitForTurn(guest.page, 'Guest');
    await act(guest.page, 'Grow Pikmin'); // Guest now has 4 Red

    // Round 5
    await waitForTurn(host.page, 'Host');
    await act(host.page, 'Gather'); // Non-scoring
    
    await waitForTurn(guest.page, 'Guest');
    await act(guest.page, 'Swarm bridge'); // Guest score += 2.

    // Assert scores and lead: Guest leads 2 to 1.
    await host.page.waitForFunction(() => document.getElementById('haul-lead').textContent.includes('Guest leads'));
    await guest.page.waitForFunction(() => document.getElementById('haul-lead').textContent.includes('You lead by 1 haul.'));

    const hostLeadAfterGuestSwarm = await host.page.textContent('#haul-lead');
    const guestLeadAfterGuestSwarm = await guest.page.textContent('#haul-lead');
    
    if (hostLeadAfterGuestSwarm !== 'Guest leads by 1 haul.') {
        throw new Error(`Host expected 'Guest leads by 1 haul.', got '${hostLeadAfterGuestSwarm}'`);
    }
    if (guestLeadAfterGuestSwarm !== 'You lead by 1 haul.') {
        throw new Error(`Guest expected 'You lead by 1 haul.', got '${guestLeadAfterGuestSwarm}'`);
    }

    // 4. Complete to dusk
    for (let r = 6; r <= 8; r++) {
        await waitForTurn(host.page, 'Host');
        await act(host.page, 'Gather');
        await waitForTurn(guest.page, 'Guest');
        await act(guest.page, 'Gather');
    }

    await host.page.waitForSelector('#rematch', { state: 'visible' });

    // Assert haul-lead is hidden
    const haulLeadInvis = await host.page.evaluate(() => {
      const el = document.getElementById('haul-lead');
      return el.style.display === 'none';
    });
    if (!haulLeadInvis) throw new Error('haul-lead should be hidden at end of game');

    // 5. Assert #dispatch-count
    const dispatchCountCheck = await host.page.evaluate(() => {
      const el = document.getElementById('dispatch-count');
      const style = window.getComputedStyle(el);
      return el.textContent !== '' && 
             style.color === 'rgb(255, 247, 223)' && 
             style.backgroundColor === 'rgb(24, 53, 45)';
    });
    if (!dispatchCountCheck) throw new Error('#dispatch-count visibility or color mismatch');

    // Assert its bottom edge meets #log's top edge
    const edgesMatch = await host.page.evaluate(() => {
      const dc = document.getElementById('dispatch-count');
      const log = document.getElementById('log');
      const dcRect = dc.getBoundingClientRect();
      const logRect = log.getBoundingClientRect();
      return Math.abs(dcRect.bottom - logRect.top) < 1;
    });
    if (!edgesMatch) throw new Error('#dispatch-count bottom does not meet #log top');

    console.log('live haul lead verified for tied and both leading commanders');

  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

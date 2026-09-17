const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({headless:true});
  const a = await browser.newPage({ignoreHTTPSErrors:true});
  const b = await browser.newPage({ignoreHTTPSErrors:true});
  await a.goto('https://pikmin-turns.ichabod-crane.net');
  await a.locator('#name').fill('Olimar'); await a.getByRole('button',{name:'Create landing site'}).click();
  await a.locator('#codeout').waitFor(); const code=(await a.locator('#codeout').textContent()).replace('Lobby ','');
  await b.goto('https://pikmin-turns.ichabod-crane.net'); await b.locator('#name').fill('Louie'); await b.locator('#code').fill(code); await b.getByRole('button',{name:'Join'}).click();
  await b.getByText('Round 1 of 6').waitFor();
  for (let turn = 0; turn < 12; turn++) { const page = turn % 2 ? b : a; await page.getByRole('button',{name:/Forage/}).click(); await page.waitForTimeout(150); }
  await a.getByText(/Match over:/).waitFor({timeout:5000});
  console.log(`browser verified two-player lobby ${code} through a complete six-round match`); await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

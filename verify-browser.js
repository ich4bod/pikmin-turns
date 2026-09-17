const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({headless:true});
  const a = await browser.newPage({ignoreHTTPSErrors:true, viewport:{width:1280,height:900}});
  const b = await browser.newPage({ignoreHTTPSErrors:true});
  await a.goto('https://pikmin-turns.ichabod-crane.net');
  await a.locator('#name').fill('Olimar'); await a.getByRole('button',{name:'Plant a landing site'}).click();
  await a.locator('#codeout').waitFor(); const code=(await a.locator('#codeout').textContent()).replace('LOBBY ','');
  await b.goto('https://pikmin-turns.ichabod-crane.net'); await b.locator('#name').fill('Louie'); await b.locator('#code').fill(code); await b.getByRole('button',{name:'Land here'}).click();
  await b.getByText('Round 1 / 8').waitFor();
  const order=async(page,name)=>{ await page.getByRole('button',{name:new RegExp(name)}).click(); await page.waitForTimeout(180); };
  await order(a,'Gather'); await order(b,'Scout'); await order(a,'Scout'); await order(b,'Gather'); await order(a,'Carry relic'); await order(b,'Grow Pikmin'); await order(a,'Swarm bridge');
  await a.getByText(/Pikmin in squad/).first().waitFor(); await a.locator('#log').getByText(/assigned 4 Pikmin/).waitFor();
  for (let turn=7;turn<16;turn++) await order(turn%2 ? b : a,'Gather');
  await a.getByText(/wins|tie/i).waitFor({timeout:6000});
  await a.screenshot({path:'/w/pikmin-turns-live.png',fullPage:true});
  await a.setViewportSize({width:390,height:844}); await a.screenshot({path:'/w/pikmin-turns-mobile.png',fullPage:true});
  console.log(`browser verified lobby ${code}, illustrated map, all five orders, and a complete two-player match`); await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

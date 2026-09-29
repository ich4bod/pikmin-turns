const { chromium } = require('playwright-core');
const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net/';
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    async function fresh(color) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(url); await page.locator('#name').fill('Choice Tester');
      await page.getByRole('button', {name:'Play solo'}).click();
      await page.waitForResponse(r => r.url().includes('/api/solo') && r.status() === 201);
      if (await page.evaluate(() => document.documentElement.scrollWidth > 390)) throw Error('horizontal overflow');
      const key = await page.locator('#squad-key').textContent();
      if (key !== '🔴 red swarm · 🔵 blue gather · 🟡 yellow scout · all colors carry · choose what the Onion grows') throw Error('wrong squad key');
      const cards = { red:['Grow Red','2 nectar: +2 Red Pikmin.','grow-red'], blue:['Grow Blue','2 nectar: +2 Blue Pikmin.','grow-blue'], yellow:['Grow Yellow','2 nectar: +2 Yellow Pikmin.','grow-yellow'] };
      for (const [c,[heading,desc,action]] of Object.entries(cards)) {
        const button = page.locator('#'+action);
        if ((await button.locator('small').textContent()).trim() !== desc) throw Error('wrong '+c+' description');
        if ((await button.locator('.order-requirement').textContent()).trim() !== 'Needs 2 nectar') throw Error('wrong '+c+' requirement');
      }
      const [heading,desc,action] = cards[color];
      const button = page.locator('#'+action);
      await page.getByRole('button',{name:'Gather'}).click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      if (await button.isDisabled()) throw Error(color+' unexpectedly disabled after gathering');
      const before = await page.evaluate(() => ({...window.game.players.find(p=>p.name===window.commander).units}));
      await button.click();
      await page.waitForResponse(r => r.url().includes('/action') && r.status() === 200);
      const p = await page.evaluate(() => window.game.players.find(p=>p.name===window.commander));
      if (p.units[color] !== 4 || p.units.red + p.units.blue + p.units.yellow !== 8) throw Error('wrong '+color+' delta');
      for (const other of ['red','blue','yellow']) if (other !== color && p.units[other] !== before[other]) throw Error(other+' changed during '+color);
      const label = color[0].toUpperCase()+color.slice(1);
      if (!(await page.locator('.logline').allTextContents()).some(x => x.includes('returned nectar to the Onion and grew 2 '+label+' Pikmin (squad 8).'))) throw Error('wrong '+color+' log');
      await page.close();
    }
    await fresh('red'); await fresh('blue'); await fresh('yellow');
    const page = await browser.newPage(); await page.goto(url); await page.locator('#name').fill('Disabled Tester'); await page.getByRole('button',{name:'Play solo'}).click(); await page.waitForResponse(r=>r.url().includes('/api/solo'));
    for (const id of ['grow-red','grow-blue','grow-yellow']) if (!(await page.locator('#'+id).isDisabled())) throw Error(id+' should be disabled below 2 nectar');
    await page.close();
    console.log('chosen Red Blue and Yellow Onion growth verified');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.stack || e.message); process.exitCode=1; });

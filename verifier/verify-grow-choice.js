const { chromium } = require('playwright-core');
const url = process.argv[2] || 'https://pikmin-turns.ichabod-crane.net/';
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    async function fresh(color) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(url); await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => {
        if (window.innerWidth !== 390) throw Error('page width is not 390px');
        if (document.documentElement.scrollWidth > 390) throw Error('horizontal overflow');
        const lobby = document.querySelector('#lobby').getBoundingClientRect();
        const rules = document.querySelector('.rules').getBoundingClientRect();
        const controlRule = document.querySelector('#control-rule').getBoundingClientRect();
        if (Math.abs(controlRule.width - rules.width) > 2) throw Error('control rule width does not match rule grid');
        const ruleCards = [...document.querySelectorAll('.rules > .rule')];
        if (ruleCards.length !== 3) throw Error('expected three rule cards');
        let previous;
        for (const card of ruleCards) {
          const rect = card.getBoundingClientRect();
          if (Math.abs(rect.width - rules.width) > 2) throw Error('rule card width does not match rule grid');
          if (previous && (rect.top < previous.top || rect.top < previous.bottom)) throw Error('rule cards are out of order or overlap');
          const style = getComputedStyle(card);
          const textWidth = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
          if (textWidth < 250) throw Error('rule text line is narrower than 250px');
          previous = rect;
        }
        const controls = ['#name', 'button[onclick="host()"]', '#solo-btn', '#code', 'button[onclick="join()"]'].map(selector => document.querySelector(selector));
        for (const control of controls) {
          const rect = control.getBoundingClientRect();
          if (rect.left < lobby.left || rect.right > lobby.right || rect.top < lobby.top || rect.bottom > lobby.bottom) throw Error('lobby control outside card');
        }
        const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const name = controls[0].getBoundingClientRect();
        const host = controls[1].getBoundingClientRect();
        const solo = controls[2].getBoundingClientRect();
        const code = controls[3].getBoundingClientRect();
        const join = controls[4].getBoundingClientRect();
        if (overlaps(name, host) || overlaps(name, solo) || overlaps(code, join)) throw Error('lobby button overlaps input');
      });
      await page.locator('#name').fill('Choice Tester');
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

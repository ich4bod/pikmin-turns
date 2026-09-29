const { chromium } = require('playwright-core');
const url=process.argv[2];
(async()=>{const b=await chromium.launch();const f=await b.newPage(),m=await b.newPage();
 try { await f.goto(url); await f.fill('#name','Fern'); await f.click('button:has-text("Plant a landing site")'); await f.waitForSelector('#game'); const code=await f.locator('#code-value').textContent();
 await m.goto(url); await m.fill('#name','Moss'); await m.fill('#code',code); await m.click('button:has-text("Land here")');
 const act=async(p,a)=>{await p.locator(`button.order[onclick*="'${a}'"]`).click(); await p.waitForTimeout(300);};
 const fa=['scout','gather','scout','gather','scout','gather','scout','gather']; const ma=['gather','grow-blue','gather','skirmish','gather','skirmish','gather','skirmish'];
 for(let i=0;i<8;i++){await act(f,fa[i]);await m.waitForFunction(()=>window.game?.turn===1||window.game?.status==='finished'); if(i<7) await act(m,ma[i]); else break; await f.waitForTimeout(300);}
 const before=await f.evaluate(()=>window.game); if(before.players[0].score!==0||before.players[1].score!==4||before.players[0].duskBonus!==0||before.players[1].duskBonus!==0) throw Error('pre-dusk score mismatch');
 if(before.map.meadow!=='Fern'||before.map.lookout!=='Fern'||before.map.bridge!=='Moss'||before.map.relic!==null) throw Error('map ownership mismatch');
 if(!document){} await act(m,'skirmish'); await f.waitForTimeout(500); const after=await f.evaluate(()=>window.game); if(after.players[0].score!==2||after.players[1].score!==7||after.players[0].duskBonus!==2||after.players[1].duskBonus!==1) throw Error('final score mismatch');
 const log=after.log.join('\n'); if(!log.includes('Dusk control adds 2 haul for Fern and 1 haul for Moss.')||after.status!=='finished') throw Error('dusk result mismatch'); console.log('four-place dusk control scoring verified before final ranking');
 } finally {await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
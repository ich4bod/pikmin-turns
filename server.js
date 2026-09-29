const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data', 'games.json');
const PUBLIC = path.join(__dirname, 'public');
let games = {};
try { games = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch { fs.mkdirSync(path.dirname(DATA), { recursive: true }); }
function save() { fs.writeFileSync(DATA, JSON.stringify(games, null, 2)); }
function code() { let c; do { c = crypto.randomBytes(3).toString('hex').toUpperCase(); } while (games[c]); return c; }
function phase(round) { return round <= 2 ? 'Dawn — grow your squad' : round <= 5 ? 'Afternoon — divide the crew' : 'Dusk — haul the treasure home'; }
function squad(p) { return p.units.red + p.units.blue + p.units.yellow; }
function clean(game) {
  if (!game.map.lookout) game.map.lookout = null;
  let rivalPlan = null;
  if (game.mode === 'solo' && game.status === 'playing') {
    const sprout = game.players.find(p => p.name === 'Sprout');
    const nextKind = chooseBotAction(game, sprout);
    const labels = { scout: 'Map a route', gather: 'Gather nectar', carry: 'Carry the Sun Relic', skirmish: 'Swarm Mossy Bridge' };
    rivalPlan = labels[nextKind];
  }
  return { code: game.code, phase: phase(game.round), round: game.round, status: game.status, mode: game.mode, players: game.players.map(({ token, ...p }) => ({ ...p, squad: squad(p) })), turn: game.turn, turnName: game.players[game.turn]?.name, log: game.log.slice(-10), winner: game.winner, map: game.map, target: 12, rivalPlan };
}
function player(name, token) { const p = { name, token, score: 0, duskBonus: 0, nectar: 1, insight: 0, units: { red: 2, blue: 2, yellow: 2 } }; return p; }
function create(name) { const c = code(); const token = crypto.randomBytes(16).toString('hex'); games[c] = { code:c, status:'lobby', round:1, turn:0, players:[player(name, token)], map:{ meadow: null, bridge: null, lookout: null, relic: null }, log:[`${name} landed with a six-Pikmin squad at Sunspill Garden.`] }; save(); return { ...games[c], token }; }
function createSolo(name) { const c = code(); const token = crypto.randomBytes(16).toString('hex'); const botToken = crypto.randomBytes(16).toString('hex'); games[c] = { code:c, status:'playing', mode:'solo', round:1, turn:0, players:[player(name, token), player('Sprout', botToken)], map:{ meadow: null, bridge: null, lookout: null, relic: null }, log:[`${name} landed with a six-Pikmin squad at Sunspill Garden. Sprout is also here.`] }; save(); return { ...games[c], token }; }
function join(game, name) { if (game.status !== 'lobby' || game.players.length > 1) throw Error('This lobby is no longer available.'); const token = crypto.randomBytes(16).toString('hex'); game.players.push(player(name, token)); game.status='playing'; game.log.push(`${name} arrived. ${game.players[0].name} gives the first order.`); save(); return token; }
function awardDuskControl(game) {
  if (game.duskAwarded) return;
  const counts = Object.fromEntries(game.players.map(p => [p.name, 0]));
  for (const place of ['meadow', 'lookout', 'bridge', 'relic']) if (counts[game.map[place]] !== undefined) counts[game.map[place]]++;
  for (const p of game.players) { p.duskBonus = counts[p.name]; p.score += p.duskBonus; }
  game.duskAwarded = true;
  game.log.push(`Dusk control adds ${game.players[0].duskBonus} haul for ${game.players[0].name} and ${game.players[1].duskBonus} haul for ${game.players[1].name}.`);
}
function win(game, reason) {
  const players = [...game.players].sort((a, b) => b.score - a.score || b.insight - a.insight || squad(b) - squad(a));
  game.status = 'finished';
  const p1 = players[0];
  const p2 = players[1];
  const isTie = p2 && p1.score === p2.score && p1.insight === p2.insight && squad(p1) === squad(p2);
  game.winner = isTie ? 'A tie — both crews escape at moonrise.' : `${p1.name} wins`;
  game.log.push(`${reason} ${game.winner}`);
  save();
}
function colorName(c) { return c === 'red' ? 'Red' : c === 'blue' ? 'Blue' : 'Yellow'; }
function need(p, n, task, color) { 
  if (color) {
    if (p.units[color] < n) throw Error(`${task} needs ${n} ${colorName(color)} Pikmin; you have ${p.units[color]}.`);
  } else if (squad(p) < n) {
    throw Error(`${task} needs ${n} Pikmin; your squad has ${squad(p)}.`);
  }
}
function resolveAction(game, p, rival, kind) {
  if (!['gather','scout','skirmish','carry','grow-red','grow-blue','grow-yellow'].includes(kind)) throw Error('Unknown order.');
  if (kind === 'gather') { 
    need(p, 2, 'Nectar gathering', 'blue'); 
    const force = Math.min(5, p.units.blue);
    const gain = force >= 4 ? 3 : 2;
    p.nectar += gain;
    game.map.meadow = p.name;
    game.log.push(`${p.name} sent ${force} Blue Pikmin to Nectar Meadow (+${gain} nectar).`);
  }
  if (kind === 'scout') { 
    need(p, 1, 'Scouting', 'yellow'); 
    const force = Math.min(5, p.units.yellow);
    const gain = force >= 4 ? 2 : 1;
    p.insight += gain;
    game.map.lookout = p.name;
    game.log.push(`${p.name} sent ${force} Yellow Pikmin to Lookout Ridge (+${gain} ${gain === 1 ? 'route' : 'routes'}).`);
  }
  if (kind === 'skirmish') { 
    need(p, 3, 'A bridge fight', 'red'); 
    const force = Math.min(5, p.units.red); 
    const gain = force >= 4 ? 2 : 1; 
    rival.nectar = Math.max(0, rival.nectar - 1); 
    p.score += gain; 
    game.map.bridge = p.name; 
    game.log.push(`${p.name} sent ${force} Red Pikmin across Mossy Bridge (+${gain} haul; ${rival.name} loses 1 nectar).`); 
  }
  if (kind === 'carry') { 
    need(p, 4, 'Carrying the Sun Relic'); 
    if (p.nectar < 3 || p.insight < 1) throw Error('Carry needs 3 nectar and a mapped route.'); 
    p.nectar -= 3; 
    p.insight -= 1; 
    p.score += 4; 
    game.map.relic = p.name; 
    game.log.push(`${p.name} assigned 4 Pikmin to carry the Sun Relic (+4 haul).`); 
  }
  if (kind.startsWith('grow-')) {
    const color = kind.slice(5);
    if (p.nectar < 2) throw Error('Growing Pikmin needs 2 nectar.');
    p.nectar -= 2;
    p.units[color] += 2;
    game.map.meadow = p.name;
    game.log.push(`${p.name} returned nectar to the Onion and grew 2 ${colorName(color)} Pikmin (squad ${squad(p)}).`);
  }
}
function chooseBotAction(game, p) {
  if (squad(p) >= 4 && p.nectar >= 3 && p.insight >= 1) return 'carry';
  if (p.insight === 0) return 'scout';
  if (p.nectar < 3) return 'gather';
  if (p.units.red >= 3) return 'skirmish';
  return 'gather';
}

function action(game, token, kind) {
  if (game.status !== 'playing') {
    throw Error('The match has not started.');
  }
  const p = game.players[game.turn]; if (!p || p.token !== token) {
    throw Error('It is not your turn.');
  }
  const rival = game.players[(game.turn + 1) % 2];
  resolveAction(game, p, rival, kind);
  if (p.score >= 12) { win(game, 'The ship signal is full.'); save(); return; }
  if (game.mode === 'solo') {
    game.turn = 1;
    const botKind = chooseBotAction(game, rival);
    resolveAction(game, rival, p, botKind);
    if (rival.score >= 12) { win(game, 'The ship signal is full.'); save(); return; }
    if (game.round === 8) {
      awardDuskControl(game);
      win(game, 'Dusk has reached the garden.');
      save();
      return;
    }
    game.turn = 0;
    game.round += 1;
  } else {
    game.turn = (game.turn + 1) % 2;
    if (game.turn === 0) {
      if (game.round === 8) {
        awardDuskControl(game);
        win(game, 'Dusk has reached the garden.');
        save();
        return;
      }
      game.round += 1;
    }
  }
  save();
}
function respond(res, status, body, type='application/json') { res.writeHead(status, {'content-type':type, 'cache-control':'no-store'}); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
async function body(req) { let text=''; for await (const part of req) { text += part; if (text.length > 10000) throw Error('Request too large.'); } return JSON.parse(text || '{}'); }
const server = http.createServer(async (req,res) => {
  try { const u = new URL(req.url, `http://${req.headers.host}`); if (u.pathname === '/healthz') return respond(res,200,{ok:true}); if (req.method === 'POST' && u.pathname === '/api/lobbies') { const b=await body(req); if (!b.name?.trim()) throw Error('Choose a commander name.'); const x=create(b.name.trim().slice(0,24)); return respond(res,201,{...clean(x),token:x.token}); } if (req.method === 'POST' && u.pathname === '/api/solo') { const b=await body(req); if (!b.name?.trim()) throw Error('Choose a commander name.'); const x=createSolo(b.name.trim().slice(0,24)); return respond(res,201,{...clean(x),token:x.token}); } const match=u.pathname.match(/^\/api\/lobbies\/([A-Z0-9]+)(?:\/action)?$/); if (match) { const game=games[match[1]]; if (!game) return respond(res,404,{error:'Lobby not found.'}); if (req.method === 'GET') return respond(res,200,clean(game)); const b=await body(req); if (u.pathname.endsWith('/action')) { action(game,b.token,b.action); return respond(res,200,clean(game)); } const token=join(game,b.name?.trim().slice(0,24)); return respond(res,200,{...clean(game),token}); } const file = u.pathname === '/' ? 'index.html' : u.pathname.split('?')[0].slice(1); const target=path.resolve(PUBLIC,file); if (!target.startsWith(PUBLIC) || !fs.existsSync(target)) return respond(res,404,'Not found','text/plain'); return respond(res,200,fs.readFileSync(target), target.endsWith('.js')?'text/javascript':'text/html'); } catch (err) { return respond(res,400,{error:err.message}); } });
if (require.main === module) server.listen(PORT);
module.exports={create,join,action,phase,squad,server,createSolo,chooseBotAction,win,awardDuskControl};

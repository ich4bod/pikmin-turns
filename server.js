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
function phase(round) { return round <= 2 ? 'Dawn — gather a crew' : round <= 5 ? 'Afternoon — fight for the clearing' : 'Dusk — bring the relic home'; }
function clean(game) { return { code: game.code, phase: phase(game.round), round: game.round, status: game.status, players: game.players.map(({ token, ...p }) => p), turn: game.players[game.turn]?.name, log: game.log.slice(-10), winner: game.winner, map: game.map, target: 10 }; }
function player(name, token) { return { name, token, score: 0, sprouts: 3, nectar: 1, insight: 0, units: { red: 1, blue: 1, yellow: 1 } }; }
function create(name) { const c = code(); const token = crypto.randomBytes(16).toString('hex'); games[c] = { code:c, status:'lobby', round:1, turn:0, players:[player(name, token)], map:{ meadow: null, bridge: null, relic: null }, log:[`${name} set an onion down at the edge of Sunspill Garden.`] }; save(); return { game:games[c], token }; }
function join(game, name) { if (game.status !== 'lobby' || game.players.length > 1) throw Error('This lobby is no longer available.'); const token = crypto.randomBytes(16).toString('hex'); game.players.push(player(name, token)); game.status='playing'; game.log.push(`${name} arrived. ${game.players[0].name} gives the first order.`); save(); return token; }
function win(game, reason) { const ranked = [...game.players].sort((a,b) => b.score - a.score || b.insight - a.insight); game.status='finished'; game.winner = ranked[0].score === ranked[1].score ? 'A tie — both crews escape at moonrise.' : `${ranked[0].name} wins`; game.log.push(`${reason} ${game.winner}`); }
function action(game, token, kind) {
  if (game.status !== 'playing') throw Error('The match has not started.');
  const p = game.players[game.turn]; if (!p || p.token !== token) throw Error('It is not your turn.');
  const rival = game.players[(game.turn + 1) % 2];
  if (!['gather','scout','skirmish','carry','recruit'].includes(kind)) throw Error('Unknown order.');
  if (kind === 'gather') { p.nectar += 2; game.log.push(`${p.name}'s Blue Pikmin carried back two nectar.`); }
  if (kind === 'scout') { p.insight += 1; game.log.push(`${p.name}'s Yellow Pikmin mapped a safe route (${p.insight} insight).`); }
  if (kind === 'skirmish') { if (p.sprouts < 2) throw Error('A skirmish needs two Pikmin.'); p.sprouts -= 1; rival.nectar = Math.max(0, rival.nectar - 1); p.score += 1; game.map.bridge = p.name; game.log.push(`${p.name}'s Red Pikmin took Mossy Bridge (+1 petal; ${rival.name} loses 1 nectar).`); }
  if (kind === 'carry') { if (p.nectar < 3) throw Error('Carrying the relic needs 3 nectar.'); if (p.insight < 1) throw Error('Scout first: the relic route is unsafe without insight.'); p.nectar -= 3; p.insight -= 1; p.score += 3; game.map.relic = p.name; game.log.push(`${p.name} carried a Sun Relic home (+3 petals).`); }
  if (kind === 'recruit') { if (p.nectar < 2) throw Error('Recruiting needs 2 nectar.'); p.nectar -= 2; p.sprouts += 2; p.units.red += 1; p.units.blue += 1; p.units.yellow += 1; game.map.meadow = p.name; game.log.push(`${p.name} grew a new mixed crew at Nectar Meadow (+2 Pikmin).`); }
  if (p.score >= 10) { win(game, 'The ship signal is full.'); save(); return; }
  game.turn = (game.turn + 1) % 2; if (game.turn === 0) game.round += 1;
  if (game.round > 8) win(game, 'The sun set after eight rounds.');
  save();
}
function respond(res, status, body, type='application/json') { res.writeHead(status, {'content-type':type, 'cache-control':'no-store'}); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
async function body(req) { let text=''; for await (const part of req) { text += part; if (text.length > 10000) throw Error('Request too large.'); } return JSON.parse(text || '{}'); }
const server = http.createServer(async (req,res) => { try { const u = new URL(req.url, `http://${req.headers.host}`); if (u.pathname === '/healthz') return respond(res,200,{ok:true}); if (req.method === 'POST' && u.pathname === '/api/lobbies') { const b=await body(req); if (!b.name?.trim()) throw Error('Choose a commander name.'); const x=create(b.name.trim().slice(0,24)); return respond(res,201,{...clean(x.game),token:x.token}); } const match=u.pathname.match(/^\/api\/lobbies\/([A-Z0-9]+)(?:\/action)?$/); if (match) { const game=games[match[1]]; if (!game) return respond(res,404,{error:'Lobby not found.'}); if (req.method === 'GET') return respond(res,200,clean(game)); const b=await body(req); if (u.pathname.endsWith('/action')) { action(game,b.token,b.action); return respond(res,200,clean(game)); } const token=join(game,b.name?.trim().slice(0,24)); return respond(res,200,{...clean(game),token}); } const file = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const target=path.resolve(PUBLIC,file); if (!target.startsWith(PUBLIC) || !fs.existsSync(target)) return respond(res,404,'Not found','text/plain'); return respond(res,200,fs.readFileSync(target), target.endsWith('.js')?'text/javascript':'text/html'); } catch (err) { return respond(res,400,{error:err.message}); } });
if (require.main === module) server.listen(PORT, () => console.log(`Pikmin Turns listening on ${PORT}`));
module.exports={create,join,action,phase,server};

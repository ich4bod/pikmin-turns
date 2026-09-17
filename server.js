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
function clean(game) { return { code: game.code, phase: phase(game.round), round: game.round, status: game.status, players: game.players.map(({token, ...p}) => p), turn: game.players[game.turn]?.name, log: game.log.slice(-8), winner: game.winner }; }
function phase(round) { return round <= 2 ? 'Beginning — gather sprouts' : round <= 4 ? 'Middle — contest the garden' : 'End — race to the ship'; }
function create(name) { const c = code(); const token = crypto.randomBytes(16).toString('hex'); games[c] = { code:c, status:'lobby', round:1, turn:0, players:[{name,token,sprouts:3,nectar:0,score:0}], log:[`${name} opened a landing site.`] }; save(); return {game:games[c],token}; }
function join(game, name) { if (game.status !== 'lobby' || game.players.length > 1) throw Error('This lobby is no longer available.'); const token = crypto.randomBytes(16).toString('hex'); game.players.push({name,token,sprouts:3,nectar:0,score:0}); game.status='playing'; game.log.push(`${name} landed. ${game.players[0].name} takes the first turn.`); save(); return token; }
function action(game, token, kind) { if (game.status !== 'playing') throw Error('The match has not started.'); const p = game.players[game.turn]; if (!p || p.token !== token) throw Error('It is not your turn.'); const rival = game.players[(game.turn + 1) % 2]; if (!['forage','recruit','raid','rest'].includes(kind)) throw Error('Unknown order.'); if (kind === 'forage') { p.nectar += 2; p.score += 1; game.log.push(`${p.name} foraged nectar (+1 score).`); }
 if (kind === 'recruit') { if (p.nectar < 2) throw Error('Need 2 nectar to recruit.'); p.nectar -= 2; p.sprouts += 2; game.log.push(`${p.name} recruited two Pikmin.`); }
 if (kind === 'raid') { if (p.sprouts < 2) throw Error('Need 2 Pikmin to raid.'); p.score += 3; rival.score = Math.max(0, rival.score - 1); game.log.push(`${p.name} raided the garden (+3; ${rival.name} loses 1).`); }
 if (kind === 'rest') { p.sprouts += 1; game.log.push(`${p.name} sheltered and grew a Pikmin.`); }
 game.turn = (game.turn + 1) % 2; if (game.turn === 0) game.round += 1;
 if (game.round > 6) { game.status='finished'; game.winner = game.players[0].score === game.players[1].score ? 'A tie beneath the onion.' : game.players.reduce((a,b) => a.score > b.score ? a : b).name; game.log.push(`Night falls: ${game.winner}.`); } save(); }
function respond(res, status, body, type='application/json') { res.writeHead(status, {'content-type':type, 'cache-control':'no-store'}); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
async function body(req) { let text=''; for await (const part of req) text += part; return JSON.parse(text || '{}'); }
const server = http.createServer(async (req,res) => { try { const u = new URL(req.url, `http://${req.headers.host}`); if (u.pathname === '/healthz') return respond(res,200,{ok:true}); if (req.method === 'POST' && u.pathname === '/api/lobbies') { const b=await body(req); if (!b.name?.trim()) throw Error('Choose a commander name.'); const x=create(b.name.trim().slice(0,24)); return respond(res,201,{...clean(x.game),token:x.token}); } const match=u.pathname.match(/^\/api\/lobbies\/([A-Z0-9]+)(?:\/action)?$/); if (match) { const game=games[match[1]]; if (!game) return respond(res,404,{error:'Lobby not found.'}); if (req.method === 'GET') return respond(res,200,clean(game)); const b=await body(req); if (u.pathname.endsWith('/action')) { action(game,b.token,b.action); return respond(res,200,clean(game)); } const token=join(game,b.name?.trim().slice(0,24)); return respond(res,200,{...clean(game),token}); } const file = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); const target=path.resolve(PUBLIC,file); if (!target.startsWith(PUBLIC) || !fs.existsSync(target)) return respond(res,404,'Not found','text/plain'); return respond(res,200,fs.readFileSync(target), target.endsWith('.js')?'text/javascript':'text/html'); } catch (err) { return respond(res,400,{error:err.message}); } });
if (require.main === module) server.listen(PORT, () => console.log(`Pikmin Turns listening on ${PORT}`));
module.exports={create,join,action,phase,server};

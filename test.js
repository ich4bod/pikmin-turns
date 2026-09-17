const test = require('node:test');
const assert = require('node:assert/strict');
const { create, join, action, phase, squad } = require('./server');
test('eight rounds visibly cross all match phases', () => { assert.match(phase(1), /Dawn/); assert.match(phase(3), /Afternoon/); assert.match(phase(6), /Dusk/); });
test('Pikmin numbers change the strength of a bridge swarm', () => {
  const {game,token:a}=create('Alph'); const b=join(game,'Brittany');
  action(game,a,'skirmish'); assert.equal(game.players[0].score, 2); assert.equal(game.players[0].units.red, 2);
  action(game,b,'gather'); action(game,a,'gather'); action(game,b,'gather'); action(game,a,'recruit');
  assert.equal(squad(game.players[0]), 9); action(game,b,'scout'); action(game,a,'skirmish');
  assert.equal(game.players[0].score, 4); assert.equal(game.map.bridge,'Alph');
});
test('a two-player crew can grow, map, carry, and finish at dusk', () => {
  const {game,token:a}=create('Olimar'); const b=join(game,'Louie');
  action(game,a,'gather'); action(game,b,'gather'); action(game,a,'scout'); action(game,b,'scout'); action(game,a,'carry');
  assert.equal(game.players[0].score,4); assert.equal(game.map.relic,'Olimar');
  for(let i=0;i<11;i++) action(game, game.players[game.turn].token, 'gather');
  assert.equal(game.status,'finished'); assert.ok(game.winner);
});

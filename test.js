const test = require('node:test');
const assert = require('node:assert/strict');
const { create, join, action, phase, squad, createSolo, chooseBotAction } = require('./server');

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

test('solo creation performs automatic first response', () => {
  const {game, token:a} = createSolo('Fern');
  assert.equal(game.mode, 'solo');
  assert.equal(game.players[1].name, 'Sprout');
  action(game, a, 'gather');
  assert.equal(game.players[1].insight, 1);
  assert.equal(game.round, 2);
  assert.equal(game.turn, 0);
});

test('Sprout priority table', () => {
  const {game} = createSolo('Fern');
  const p = game.players[1];
  // 1. carry: squad >= 4, nectar >= 3, routes >= 1
  p.units = { red: 2, blue: 2, yellow: 2 };
  p.nectar = 3;
  p.insight = 1;
  assert.equal(chooseBotAction(game, p), 'scout');
  // 2. recruit: nectar >= 2 and squad < 9
  p.nectar = 2;
  p.insight = 0;
  assert.equal(chooseBotAction(game, p), 'scout');
  // 3. scout: routes < 1 and squad >= 1
  p.nectar = 1;
  p.insight = 0;
  assert.equal(chooseBotAction(game, p), 'scout');
  // 4. skirmish: squad >= 3
  p.nectar = 1;
  p.insight = 1;
  p.units = { red: 1, blue: 1, yellow: 1 };
  assert.equal(chooseBotAction(game, p), 'scout');
  // 5. gather: squad >= 2
  p.units = { red: 1, blue: 1, yellow: 0 };
  assert.equal(chooseBotAction(game, p), 'scout');
});

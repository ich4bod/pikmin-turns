const test = require('node:test');
const assert = require('node:assert/strict');
const { create, join, action, phase, squad, createSolo, chooseBotAction } = require('./server');

test('eight rounds visibly cross all match phases', () => { 
  assert.match(phase(1), /Dawn/); 
  assert.match(phase(3), /Afternoon/); 
  assert.match(phase(6), /Dusk/); 
});

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

test('Sprout priority branches', () => {
  const testPriority = (nectar, insight, squad, expected) => {
    const {game} = createSolo('Test');
    const p = game.players[1];
    p.nectar = nectar;
    p.insight = insight;
    p.units = { red: 0, blue: 0, yellow: squad };
    assert.equal(chooseBotAction(game, p), expected);
  };

  // 1. carry: squad >= 4, nectar >= 3, insight >= 1
  testPriority(3, 1, 4, 'carry');
  // 2. scout: insight == 0
  testPriority(3, 0, 4, 'scout');
  // 3. gather: nectar < 3
  testPriority(2, 1, 4, 'gather');
  // 4. skirmish: squad >= 3
  testPriority(3, 1, 3, 'skirmish');
  // 5. gather: otherwise
  testPriority(3, 1, 2, 'gather');
});

test('Sprout eight-order sequence', () => {
  const {game, token:a} = createSolo('Fern');
  const p = game.players[1]; // Sprout
  const human = game.players[0];

  const expectedSequence = [
    'Sprout sent 1 Yellow Pikmin to map a safe route (+1 route).', // scout
    'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',     // gather
    'Sprout assigned 4 Pikmin to carry the Sun Relic (+4 haul).', // carry
    'Sprout sent 1 Yellow Pikmin to map a safe route (+1 route).', // scout
    'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',     // gather
    'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',     // gather
    'Sprout assigned 4 Pikmin to carry the Sun Relic (+4 haul).', // carry
    'Sprout sent 1 Yellow Pikmin to map a safe route (+1 route).'  // scout
  ];

  for (let i = 0; i < 8; i++) {
    action(game, a, 'gather');
  }

  const sproutLog = game.log.filter(msg => msg.startsWith('Sprout '));
  
  assert.equal(sproutLog.length, 8);
  for (let i = 0; i < 8; i++) {
    assert.equal(sproutLog[i], expectedSequence[i], `Mismatch at index ${i}. Actual: ${sproutLog[i]}, Expected: ${expectedSequence[i]}`);
  }

  assert.equal(p.score, 8);
  assert.equal(p.insight, 1);
  assert.equal(p.nectar, 1);
  assert.equal(squad(p), 6);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { create, join, action, phase, squad, createSolo, chooseBotAction } = require('./server');

test('eight rounds visibly cross all match phases', () => { 
  assert.match(phase(1), /Dawn/); 
  assert.match(phase(3), /Afternoon/); 
  assert.match(phase(6), /Dusk/); 
});

test('Pikmin numbers change the strength of a bridge swarm', () => {
  const res = create('Alph'); const game = res; const a = res.token; const b=join(game,'Brittany');
  const pA = game.players[0];
  pA.units.red = 3;
  action(game,a,'skirmish'); assert.equal(game.players[0].score, 1); assert.equal(game.players[0].units.red, 3);
  action(game,b,'gather'); action(game,a,'gather'); action(game,b,'gather'); action(game,a,'recruit');
  assert.equal(squad(game.players[0]), 10); action(game,b,'scout'); action(game,a,'skirmish');
  assert.equal(game.players[0].score, 3); assert.equal(game.map.bridge,'Alph');
});

test('a two-player crew can grow, map, carry, and finish at dusk', () => {
  const res = create('Olimar'); const game = res; const a = res.token; const b=join(game,'Louie');
  action(game,a,'gather'); action(game,b,'gather'); action(game,a,'scout'); action(game,b,'scout'); action(game,a,'carry');
  assert.equal(game.players[0].score,4); assert.equal(game.map.relic,'Olimar');
  for(let i=0;i<11;i++) action(game, game.players[game.turn].token, 'gather');
  assert.equal(game.status,'finished'); assert.ok(game.winner);
});

test('solo creation performs automatic first response', () => {
  const res = createSolo('Fern'); const game = res; const a = res.token;
  assert.equal(game.mode, 'solo');
  assert.equal(game.players[1].name, 'Sprout');
  action(game, a, 'gather');
  assert.equal(game.players[1].insight, 1);
  assert.equal(game.round, 2);
  assert.equal(game.turn, 0);
});

test('Sprout priority branches', () => {
  const testPriority = (nectar, insight, squad, expected) => {
    const res = createSolo('Test'); const game = res;
    const p = game.players[1];
    p.nectar = nectar;
    p.insight = insight;
    p.units = { red: 0, blue: 0, yellow: squad };
    if (expected === 'skirmish') {
      p.units.red = 3;
      p.units.blue = 0;
      p.units.yellow = 0;
    }
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
  const res = createSolo('Fern'); const game = res; const a = res.token;
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

test('color-specific requirements and errors', () => {
  const res = create('Alph'); const game = res; const a = res.token; const b=join(game,'Brittany');
  const p = game.players[0];
  
  // 1. Test skirmish requires red
  p.units.red = 2;
  try {
    action(game,a,'skirmish');
    assert.fail('Should have thrown error for not enough red pikmin');
  } catch (e) {
    assert.equal(e.message, 'A bridge fight needs 3 Red Pikmin; you have 2.');
  }

  // 2. Test carry requires 4 pikmin (squad)
  p.units.red = 1; p.units.blue = 1; p.units.yellow = 1; // total squad 3
  try {
    action(game,a,'carry');
    assert.fail('Should have thrown error for not enough squad size');
  } catch (e) {
    assert.equal(e.message, 'Carrying the Sun Relic needs 4 Pikmin; your squad has 3.');
  }
  
  // 3. Test scout requires yellow
  p.units.yellow = 0;
  try {
    action(game,a,'scout');
    assert.fail('Should have thrown error for not enough yellow pikmin');
  } catch (e) {
    assert.equal(e.message, 'Scouting needs 1 Yellow Pikmin; you have 0.');
  }

  // 4. Test gather requires blue
  p.units.blue = 1;
  try {
    action(game,a,'gather');
    assert.fail('Should have thrown error for not enough blue pikmin');
  } catch (e) {
    assert.equal(e.message, 'Nectar gathering needs 2 Blue Pikmin; you have 1.');
  }
});

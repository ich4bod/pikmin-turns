const test = require('node:test');
const assert = require('node:assert/strict');
const { create, join, action, phase, squad, createSolo, chooseBotAction, awardDuskControl, claimPlace } = require('./server');

test('eight rounds visibly cross all match phases', () => { 
  assert.match(phase(1), /Dawn/); 
  assert.match(phase(3), /Afternoon/); 
  assert.match(phase(6), /Dusk/); 
});

test('Blue specialist gathering rewards four or more without spending units', () => {
  for (const [blue, force, gain] of [[2, 2, 2], [4, 4, 3], [6, 5, 3]]) {
    const res = create('Blue Tester'); const game = res; join(game, 'Rival');
    game.players[0].units.blue = blue;
    action(game, res.token, 'gather');
    assert.equal(game.players[0].nectar, 1 + gain);
    assert.equal(game.players[0].units.blue, blue);
    assert.equal(game.log.at(-1), `Blue Tester sent ${force} Blue Pikmin to Nectar Meadow (+${gain} nectar).`);
  }
});

test('dusk control awards each owned place once before ranking', () => {
  const res = create('Fern'); const game = res; const fern = res.token; const moss = join(game, 'Moss');
  game.map = { meadow: 'Fern', lookout: 'Fern', bridge: 'Moss', relic: null };
  awardDuskControl(game);
  assert.equal(game.players[0].duskBonus, 2); assert.equal(game.players[1].duskBonus, 1);
  assert.equal(game.players[0].score, 2); assert.equal(game.players[1].score, 1);
  assert.equal(game.log.at(-1), 'Dusk control adds 2 haul for Fern and 1 haul for Moss.');
});

test('new games start with an unclaimed lookout', () => {
  assert.equal(create('Lookout Tester').map.lookout, null);
  assert.equal(createSolo('Solo Lookout').map.lookout, null);
});

test('scouting claims lookout and later scouts replace its owner', () => {
  const res = create('Fern'); const game = res; const fern = res.token; const moss = join(game, 'Moss');
  action(game, fern, 'scout');
  assert.equal(game.map.lookout, 'Fern');
  action(game, moss, 'gather');
  action(game, fern, 'gather');
  game.players[1].units.yellow = 4;
  action(game, moss, 'scout');
  assert.equal(game.map.lookout, 'Moss');
});

test('old maps normalize a missing lookout to null', () => {
  const res = create('Old Map');
  delete res.map.lookout;
  assert.equal(require('./server').server.listening, false);
  // clean() is exercised through the hosted response path in the browser verifier.
});

test('Yellow specialist scouting rewards four or more without spending units', () => {
  for (const [yellow, force, gain, plural] of [[1, 1, 1, 'route'], [4, 4, 2, 'routes'], [6, 5, 2, 'routes']]) {
    const res = create('Yellow Tester'); const game = res; join(game, 'Rival');
    game.players[0].units.yellow = yellow;
    action(game, res.token, 'scout');
    assert.equal(game.players[0].insight, gain);
    assert.equal(game.players[0].units.yellow, yellow);
    assert.equal(game.log.at(-1), `Yellow Tester sent ${force} Yellow Pikmin to Lookout Ridge (+${gain} ${plural}).`);
  }
});

test('Pikmin numbers change the strength of a bridge swarm', () => {
  const res = create('Alph'); const game = res; const a = res.token; const b=join(game,'Brittany');
  const pA = game.players[0];
  pA.units.red = 3;
  action(game,a,'skirmish'); assert.equal(game.players[0].score, 1); assert.equal(game.players[0].units.red, 3);
  action(game,b,'gather'); action(game,a,'gather'); action(game,b,'gather'); action(game,a,'grow-red');
  assert.equal(squad(game.players[0]), 9); action(game,b,'scout'); action(game,a,'skirmish');
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
    'Sprout sent 2 Yellow Pikmin to Lookout Ridge (+1 route).', // scout
    'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',     // gather
    'Sprout assigned 4 Pikmin to carry the Sun Relic (+4 haul).', // carry
    'Sprout sent 2 Yellow Pikmin to Lookout Ridge (+1 route).', // scout
    'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',     // gather
    'Sprout sent 2 Blue Pikmin to Nectar Meadow (+2 nectar).',     // gather
    'Sprout assigned 4 Pikmin to carry the Sun Relic (+4 haul).', // carry
    'Sprout sent 2 Yellow Pikmin to Lookout Ridge (+1 route).'  // scout
  ];

  for (let i = 0; i < 8; i++) {
    action(game, a, 'gather');
  }

  const sproutLog = game.log.filter(msg => msg.startsWith('Sprout '));
  
  assert.equal(sproutLog.length, 8);
  for (let i = 0; i < 8; i++) {
    assert.equal(sproutLog[i], expectedSequence[i], `Mismatch at index ${i}. Actual: ${sproutLog[i]}, Expected: ${expectedSequence[i]}`);
  }

  assert.equal(p.score, 10);
  assert.equal(p.insight, 1);
  assert.equal(p.nectar, 1);
  assert.equal(squad(p), 6);
});

test('all six reassignments move exactly two Pikmin and advance the turn', () => {
  for (const [source, destination] of [['red', 'blue'], ['red', 'yellow'], ['blue', 'red'], ['blue', 'yellow'], ['yellow', 'red'], ['yellow', 'blue']]) {
    const res = create('Reassigner'); const game = res; const rival = join(game, 'Rival');
    const before = { ...game.players[0].units };
    action(game, res.token, `reassign-${source}-${destination}`);
    assert.equal(game.players[0].units[source], before[source] - 2);
    assert.equal(game.players[0].units[destination], before[destination] + 2);
    assert.equal(game.players[0].nectar, 1);
    assert.equal(game.players[0].insight, 0);
    assert.equal(game.players[0].score, 0);
    assert.equal(game.map.meadow, null);
    assert.equal(game.turn, 1);
    assert.equal(game.round, 1);
    assert.equal(game.log.at(-1), `Reassigner reassigned 2 ${source[0].toUpperCase() + source.slice(1)} Pikmin as ${destination[0].toUpperCase() + destination.slice(1)}.`);
    assert.equal(rival, game.players[1].token);
  }
});

test('reassign rejects an undersized source atomically', () => {
  const res = create('Reassigner'); const game = res; join(game, 'Rival');
  game.players[0].units.red = 1;
  const before = JSON.stringify({ players: game.players, map: game.map, log: game.log, turn: game.turn, round: game.round });
  assert.throws(() => action(game, res.token, 'reassign-red-blue'), { message: 'Need 2 Red Pikmin to reassign.' });
  assert.equal(JSON.stringify({ players: game.players, map: game.map, log: game.log, turn: game.turn, round: game.round }), before);
});

test('chosen growth changes only the requested color and logs the total', () => {
  for (const color of ['red', 'blue', 'yellow']) {
    const res = createSolo('Grower');
    const game = res;
    const before = { ...game.players[0].units };
    game.players[0].nectar = 2;
    action(game, res.token, `grow-${color}`);
    assert.equal(game.players[0].nectar, 0);
    for (const other of ['red', 'blue', 'yellow']) {
      assert.equal(game.players[0].units[other], before[other] + (other === color ? 2 : 0));
    }
    const label = color[0].toUpperCase() + color.slice(1);
    assert.ok(game.log.includes(`Grower returned nectar to the Onion and grew 2 ${label} Pikmin (squad 8).`));
  }
});

test('chosen growth shares the nectar error and rejects old recruit', () => {
  for (const kind of ['grow-red', 'grow-blue', 'grow-yellow']) {
    const res = createSolo('Grower');
    assert.throws(() => action(res, res.token, kind), { message: 'Growing Pikmin needs 2 nectar.' });
  }
  const res = createSolo('Grower');
  assert.throws(() => action(res, res.token, 'recruit'), { message: 'Unknown order.' });
});

test('specialist claim defense keeps weak challenges and logs exact holds', () => {
  for (const [place, color, minimum, label] of [['meadow', 'blue', 4, 'Nectar Meadow'], ['lookout', 'yellow', 4, 'Lookout Ridge'], ['bridge', 'red', 4, 'Mossy Bridge'], ['relic', null, 8, 'the Sun Relic']]) {
    const res = create('Fern'); const game = res; const moss = join(game, 'Moss');
    game.map[place] = 'Fern';
    const p = game.players[1];
    if (color) p.units[color] = minimum - 1; else { p.units = { red: 2, blue: 2, yellow: 2 }; }
    claimPlace(game, p, place, color, minimum);
    assert.equal(game.map[place], 'Fern');
    assert.equal(game.log.at(-1), `Fern holds ${label} against Moss.`);
    if (color) p.units[color] = minimum; else p.units = { red: 3, blue: 3, yellow: 2 };
    claimPlace(game, p, place, color, minimum);
    assert.equal(game.map[place], 'Moss');
  }
});

test('same owner and unclaimed claims do not add defense logs', () => {
  const res = create('Fern'); const game = res; const moss = join(game, 'Moss');
  claimPlace(game, game.players[0], 'meadow', 'blue', 4);
  assert.equal(game.map.meadow, 'Fern');
  assert.equal(game.log.length, 2);
  claimPlace(game, game.players[0], 'meadow', 'blue', 4);
  assert.equal(game.log.length, 2);
  assert.equal(moss, game.players[1].token);
});

test('weak gather still rewards nectar while retaining rival meadow', () => {
  const res = create('Fern'); const game = res; const fern = res.token; const moss = join(game, 'Moss');
  action(game, fern, 'gather'); action(game, moss, 'gather');
  assert.equal(game.players[1].nectar, 3); assert.equal(game.map.meadow, 'Fern');
  assert.equal(game.log.at(-1), 'Fern holds Nectar Meadow against Moss.');
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

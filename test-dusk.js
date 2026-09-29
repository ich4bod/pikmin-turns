const test = require('node:test');
const assert = require('node:assert/strict');
const { create, join, action, phase, squad, createSolo, chooseBotAction, win } = require('./server');

test('solo dusk at round 8', async () => {
  const res = createSolo('Fern'); const game = res; const a = res.token;
  assert.equal(game.status, 'playing');
  for(let i=0; i<7; i++) action(game, a, 'gather');
  assert.equal(game.round, 8);
  assert.equal(game.status, 'playing');
  
  action(game, a, 'gather');
  assert.equal(game.status, 'finished');
  assert.ok(game.log.some(l => l.includes('Dusk has reached the garden.')));
});

test('duel dusk only after player two', async () => {
  const res = create('Fern'); const game = res; const a = res.token;
  const b = join(game, 'Bob');
  assert.equal(game.round, 1);
  assert.equal(game.turn, 0);

  // Round 1: P1 acts, P2 acts. Round becomes 2.
  action(game, a, 'gather');
  assert.equal(game.round, 1);
  assert.equal(game.turn, 1);
  action(game, b, 'gather');
  assert.equal(game.round, 2);
  assert.equal(game.turn, 0);

  // Round 2-7: P1 and P2 act.
  for(let i=2; i<8; i++) {
    action(game, a, 'gather');
    action(game, b, 'gather');
    assert.equal(game.round, i + 1);
    assert.equal(game.turn, 0);
  }
  
  // Now round is 8. 
  // P1 acts.
  action(game, a, 'gather');
  assert.equal(game.round, 8);
  assert.equal(game.turn, 1);
  // P2 acts. Should win.
  action(game, b, 'gather');
  assert.equal(game.status, 'finished');
  assert.ok(game.log.some(l => l.includes('Dusk has reached the garden.')));
});

test('immediate 12-haul precedence', async () => {
  const res = createSolo('Fern'); const game = res; const a = res.token;
  // Set score to 11, then perform an action that gives score.
  game.players[0].score = 11;
  game.players[0].units.red = 3;
  // Skirmish gives 1 or 2 score. We need to make sure it hits 12.
  // resolveAction for skirmish: const gain = force >= 4 ? 2 : 1; 
  // force = Math.min(5, squad(p)); squad(p) is 6, so force is 5. gain is 2.
  // 11 + 2 = 13.
  action(game, a, 'skirmish');
  assert.equal(game.status, 'finished');
  assert.ok(game.log.some(l => l.includes('The ship signal is full.')));
});

test('tiebreaking', async () => {
  // 1. Score tiebreak (insight)
  const res1 = create('P1'); const g1 = res1; const a1 = res1.token;
  const b1 = join(g1, 'P2');
  g1.players[0].score = 10; g1.players[0].insight = 5;
  g1.players[1].score = 10; g1.players[1].insight = 2;
  win(g1, 'test');
  assert.equal(g1.winner, 'P1 wins');

  // 2. Insight tiebreak (squad)
  const res2 = create('P1'); const g2 = res2; const a2 = res2.token;
  const b2 = join(g2, 'P2');
  g2.players[0].score = 10; g2.players[0].insight = 5; g2.players[0].units = {red:2, blue:2, yellow:2}; // squad 6
  g2.players[1].score = 10; g2.players[1].insight = 5; g2.players[1].units = {red:1, blue:1, yellow:1}; // squad 3
  win(g2, 'test');
  assert.equal(g2.winner, 'P1 wins');

  // 3. True tie
  const res3 = create('P1'); const g3 = res3; const a3 = res3.token;
  const b3 = join(g3, 'P2');
  g3.players[0].score = 10; g3.players[0].insight = 5; g3.players[0].units = {red:2, blue:2, yellow:2};
  g3.players[1].score = 10; g3.players[1].insight = 5; g3.players[1].units = {red:2, blue:2, yellow:2};
  win(g3, 'test');
  assert.equal(g3.winner, 'A tie — both crews escape at moonrise.');
});

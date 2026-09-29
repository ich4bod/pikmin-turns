const test = require('node:test');
const assert = require('node:assert/strict');
const { create, createSolo, action } = require('./server');

test('color-specific requirements', async (t) => {
  await t.test('unavailable red at 2, then Grow to 3, then successful Swarm', () => {
    const res = createSolo('Alph'); const game = res; const a = res.token;
    const p = game.players[0]; 
    
    p.units.red = 2;
    p.units.blue = 2;
    p.units.yellow = 2;

    // 1. Swarm should fail with 2 red
    try {
      action(game, a, 'skirmish');
      assert.fail('Should have thrown error for not enough red pikmin');
    } catch (e) {
      assert.equal(e.message, 'A bridge fight needs 3 Red Pikmin; you have 2.');
    }

    // 2. Grow to 3 red
    // In solo mode, action(game, a, 'gather') will:
    // 1. Resolve Gather for human (p)
    // 2. Resolve Sprout's next action
    // 3. Set turn to 0 and increment round.
    action(game, a, 'gather'); 
    
    action(game, a, 'recruit'); 
    assert.equal(p.units.red, 3);

    // 3. Successful Swarm
    assert.doesNotThrow(() => action(game, a, 'skirmish'));
  });

  await t.test('unchanged Carry total rule', () => {
    const res = createSolo('Alph'); const game = res; const a = res.token;
    const p = game.players[0];

    // Carry needs total squad >= 4
    p.units.red = 1; p.units.blue = 1; p.units.yellow = 1; // total 3
    p.nectar = 3; p.insight = 1;

    try {
      action(game, a, 'carry');
      assert.fail('Should have thrown error for not enough total squad');
    } catch (e) {
      assert.equal(e.message, 'Carrying the Sun Relic needs 4 Pikmin; your squad has 3.');
    }
  });
});

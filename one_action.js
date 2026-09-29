const { createSolo, action } = require('./server');
const test = require('node:test');
const assert = require('node:assert/strict');
test('one action', () => {
  const res = createSolo('Fern'); const game = res; const a = res.token;
  action(game, a, 'gather');
  assert.equal(game.round, 2);
});

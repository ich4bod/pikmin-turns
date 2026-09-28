const { createSolo, action } = require('./server');
const test = require('node:test');
const assert = require('node:assert/strict');
test('one action', () => {
  const {game, token:a} = createSolo('Fern');
  action(game, a, 'gather');
  assert.equal(game.round, 2);
});

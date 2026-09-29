const { createSolo, action } = require('./server');
const test = require('node:test');
const assert = require('node:assert/strict');
test('simple test', async () => {
  const res = createSolo('Fern'); const game = res; const a = res.token;
  console.log('DEBUG: start test');
  action(game, a, 'gather');
  console.log('DEBUG: after 1st action');
  assert.equal(game.round, 2);
});
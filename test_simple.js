const { createSolo, action } = require('./server');
const test = require('node:test');
const assert = require('node:assert/strict');
test('simple test', async () => {
  const {game, token:a} = createSolo('Fern');
  console.log('DEBUG: start test');
  action(game, a, 'gather');
  console.log('DEBUG: after 1st action');
  assert.equal(game.round, 2);
});
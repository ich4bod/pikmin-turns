const test = require('node:test');
const assert = require('node:assert/strict');
const { createSolo, action } = require('./server');

test('one test', async () => {
  const {game, token:a} = createSolo('Fern');
  console.log('DEBUG: status after createSolo:', game.status);
  action(game, a, 'gather');
  console.log('DEBUG: status after first action:', game.status);
});

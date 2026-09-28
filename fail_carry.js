const { createSolo, action } = require('./server');
const test = require('node:test');
const assert = require('node:assert/strict');
test('fail carry', () => {
  const {game, token:a} = createSolo('Fern');
  action(game, a, 'carry');
});

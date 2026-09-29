const { createSolo, action } = require('./server');
const test = require('node:test');
const assert = require('node:assert/strict');
test('fail carry', () => {
  const res = createSolo('Fern'); const game = res; const a = res.token;
  action(game, a, 'carry');
});

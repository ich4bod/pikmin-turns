const { createSolo, action } = require('./server');
const test = require('node:test');
const assert = require('node:assert/strict');
test('immediate 12-haul precedence', async () => {
  const {game, token:a} = createSolo('Fern');
  // Round 1: gather, gather, scout -> Round 2
  action(game, a, 'gather');
  action(game, a, 'gather');
  action(game, a, 'scout');
  // Round 2: carry -> Round 3
  action(game, a, 'carry');
  // Round 3: gather, scout -> Round 4
  action(game, a, 'gather');
  action(game, a, 'scout');
  // Round 4: carry -> Round 5
  action(game, a, 'carry');
  // Round 5: gather, scout -> Round 6
  action(game, a, 'gather');
  action(game, a, 'scout');
  // Round 6: carry -> Round 7
  action(game, a, 'carry');
  // Round 7: carry -> Round 8 (hits 12 score first!)
  action(game, a, 'carry');
  
  assert.equal(game.status, 'finished');
  assert.ok(game.log.some(l => l.includes('The ship signal is full.')));
});

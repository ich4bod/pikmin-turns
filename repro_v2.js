const { createSolo, action } = require('./server');
try {
  const {game, token:a} = createSolo('Fern');
  console.log('Initial:', game.round, game.status);
  // Round 1: gather, gather, scout -> Round 2
  action(game, a, 'gather');
  action(game, a, 'gather');
  action(game, a, 'scout');
  console.log('After 3 actions:', game.round, game.status);
  // Round 2: carry -> Round 3
  action(game, a, 'carry');
  console.log('After 4th action:', game.round, game.status);
  // Round 3: gather, scout -> Round 4
  action(game, a, 'gather');
  action(game, a, 'scout');
  console.log('After 6th action:', game.round, game.status);
  // Round 4: carry -> Round 5
  action(game, a, 'carry');
  console.log('After 7th action:', game.round, game.status);
  // Round 5: gather, scout -> Round 6
  action(game, a, 'gather');
  action(game, a, 'scout');
  console.log('After 9th action:', game.round, game.status);
  // Round 6: carry -> Round 7
  action(game, a, 'carry');
  console.log('After 10th action:', game.round, game.status);
  // Round 7: carry -> Round 8
  action(game, a, 'carry');
  console.log('After 11th action:', game.round, game.status);
  // Round 8: carry -> Round 9
  action(game, a, 'carry');
  console.log('After 12th action:', game.round, game.status);
  console.log('Success');
} catch (e) {
  console.error(e);
}

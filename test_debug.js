const { createSolo, action } = require('./server');
const { game, token } = createSolo('Test');
console.log('Status after create:', game.status);
action(game, token, 'gather');
console.log('Status after action:', game.status);

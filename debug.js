const { createSolo, action } = require('./server');
const { game, token } = createSolo('Test');
console.log('Status:', game.status);
try {
    action(game, token, 'gather');
    console.log('Action successful');
} catch (e) {
    console.error('Action failed:', e.message);
}

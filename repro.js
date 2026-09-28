const { createSolo, action } = require('./server');
const assert = require('node:assert/strict');

async function reproduce() {
    const {game, token:a} = createSolo('Fern');
    console.log('Initial round:', game.round);
    for(let i=0; i<7; i++) {
        action(game, a, 'gather');
        console.log(`After call ${i+1}, round:`, game.round);
    }
    console.log('Before 8th call, round:', game.round);
    action(game, a, 'gather');
    console.log('After 8th call, round:', game.round, 'status:', game.status);
}
reproduce();

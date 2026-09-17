const test = require('node:test');
const assert = require('node:assert/strict');
const { create, join, action, phase } = require('./server');
test('six rounds visibly cross all match phases', () => { assert.match(phase(1), /Beginning/); assert.match(phase(3), /Middle/); assert.match(phase(5), /End/); });
test('two commanders take turns and a match ends', () => { const {game,token:a}=create('Alph'); const b=join(game,'Brittany'); assert.equal(game.status,'playing'); assert.throws(() => action(game,b,'forage'), /not your turn/); for(let i=0;i<12;i++) action(game, i%2 ? b : a, 'forage'); assert.equal(game.status,'finished'); assert.ok(game.winner); });

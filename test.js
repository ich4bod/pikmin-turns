const test = require('node:test');
const assert = require('node:assert/strict');
const { create, join, action, phase } = require('./server');
test('eight rounds visibly cross all match phases', () => { assert.match(phase(1), /Dawn/); assert.match(phase(3), /Afternoon/); assert.match(phase(6), /Dusk/); });
test('each crew role has a distinct cost and outcome', () => { const {game,token:a}=create('Alph'); const b=join(game,'Brittany'); action(game,a,'gather'); action(game,b,'scout'); action(game,a,'scout'); action(game,b,'gather'); action(game,a,'carry'); assert.equal(game.players[0].score,3); action(game,b,'recruit'); action(game,a,'skirmish'); assert.equal(game.map.bridge,'Alph'); assert.equal(game.map.meadow,'Brittany'); });
test('two commanders alternate through a complete match', () => { const {game,token:a}=create('Olimar'); const b=join(game,'Louie'); for(let i=0;i<16;i++) action(game, i%2 ? b : a, 'gather'); assert.equal(game.status,'finished'); assert.ok(game.winner); });

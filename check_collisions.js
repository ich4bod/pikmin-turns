const { createSolo } = require('./server');
const codes = new Set();
for(let i=0; i<100; i++) {
    const res = createSolo('test'); const game = res;
    if (codes.has(game.code)) {
        console.log('COLLISION:', game.code);
    }
    codes.add(game.code);
}
console.log('Done');

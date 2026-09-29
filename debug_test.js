const { createSolo } = require('./server');
console.log('createSolo:', typeof createSolo);
const result = createSolo('Test');
console.log('result:', result);
if (result) {
    console.log('result.game:', result.game);
} else {
    console.log('result is undefined');
}

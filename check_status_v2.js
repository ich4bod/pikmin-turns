const { createSolo, action } = require('./server');
try {
  const {game:g1, token:t1} = createSolo('G1');
  console.log('G1:', JSON.stringify(g1));
  action(g1, t1, 'gather');
  console.log('G1 after:', JSON.stringify(g1));

  const {game:g2, token:t2} = createSolo('G2');
  console.log('G2:', JSON.stringify(g2));
  action(g2, t2, 'gather');
  console.log('G2 after:', JSON.stringify(g2));
} catch (e) {
  console.error(e);
}

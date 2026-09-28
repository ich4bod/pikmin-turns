const { createSolo, action } = require('./server');
try {
  const {game:g1, token:t1} = createSolo('G1');
  console.log('G1 status:', g1.status);
  action(g1, t1, 'gather');
  console.log('G1 after action:', g1.status);

  const {game:g2, token:t2} = createSolo('G2');
  console.log('G2 status:', g2.status);
  action(g2, t2, 'gather');
  console.log('G2 after action:', g2.status);
} catch (e) {
  console.error(e);
}

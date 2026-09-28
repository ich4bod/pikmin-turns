const { createSolo, action } = require('./server');
try {
  const {game:g1, token:t1} = createSolo('G1');
  console.log('G1 status:', g1.status);
  // Force finish G1 by reaching round 8
  for(let i=0; i<8; i++) {
      action(g1, t1, 'gather');
  }
  console.log('G1 status after forcing finish:', g1.status);

  const {game:g2, token:t2} = createSolo('G2');
  console.log('G2 status:', g2.status);
  action(g2, t2, 'gather');
  console.log('G2 status after action:', g2.status);
} catch (e) {
  console.error(e);
}

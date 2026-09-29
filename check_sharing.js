const { createSolo, action } = require('./server');
try {
  const res = createSolo('G1'); const g1 = res; const t1 = res.token;
  console.log('G1 status:', g1.status);
  // Force finish G1 by reaching round 8
  for(let i=0; i<8; i++) {
      action(g1, t1, 'gather');
  }
  console.log('G1 status after forcing finish:', g1.status);

  const res = createSolo('G2'); const g2 = res; const t2 = res.token;
  console.log('G2 status:', g2.status);
  action(g2, t2, 'gather');
  console.log('G2 status after action:', g2.status);
} catch (e) {
  console.error(e);
}

const { createSolo, action } = require('./server');
try {
  const res = createSolo('G1'); const g1 = res; const t1 = res.token;
  console.log('G1 status:', g1.status);
  action(g1, t1, 'gather');
  console.log('G1 after action:', g1.status);

  const res = createSolo('G2'); const g2 = res; const t2 = res.token;
  console.log('G2 status:', g2.status);
  action(g2, t2, 'gather');
  console.log('G2 after action:', g2.status);
} catch (e) {
  console.error(e);
}

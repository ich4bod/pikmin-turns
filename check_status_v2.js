const { createSolo, action } = require('./server');
try {
  const res = createSolo('G1'); const g1 = res; const t1 = res.token;
  console.log('G1:', JSON.stringify(g1));
  action(g1, t1, 'gather');
  console.log('G1 after:', JSON.stringify(g1));

  const res = createSolo('G2'); const g2 = res; const t2 = res.token;
  console.log('G2:', JSON.stringify(g2));
  action(g2, t2, 'gather');
  console.log('G2 after:', JSON.stringify(g2));
} catch (e) {
  console.error(e);
}

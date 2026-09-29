const { createSolo, action, create } = require('./server');

async function run() {
    try {
        console.log('--- Test 1: Solo Dusk ---');
        const res = createSolo('Fern'); const g1 = res; const t1 = res.token;
        for(let i=0; i<7; i++) action(g1, t1, 'gather');
        action(g1, t1, 'gather'); // This should be round 8, so it should finish
        console.log('G1 status:', g1.status);

        console.log('--- Test 2: Duel Dusk ---');
        const res = create('Alph'); const g2 = res; const a = res.token;
        const b=require('./server').join(g2,'Brittany');
        for(let i=0; i<7; i++) {
            action(g2, a, 'gather');
            action(g2, b, 'gather');
        }
        action(g2, a, 'gather'); // This should be round 8, so it should finish
        console.log('G2 status:', g2.status);

        console.log('--- Test 3: Immediate 12-haul ---');
        const res = createSolo('Fern'); const g3 = res; const t3 = res.token;
        console.log('G3 initial status:', g3.status);
        // Round 1: 3 actions -> R4
        action(g3, t3, 'gather');
        action(g3, t3, 'gather');
        action(g3, t3, 'scout');
        // Round 2: 1 action -> R5
        action(g3, t3, 'carry');
        // Round 3: 2 actions -> R7
        action(g3, t3, 'gather');
        action(g3, t3, 'scout');
        // Round 4: 1 action -> R8
        action(g3, t3, 'carry');
        // Round 5: 1 action -> R9 (or wins)
        action(g3, t3, 'carry'); 

        console.log('G3 status:', g3.status);
    } catch (e) {
        console.error('FAIL:', e.message);
        console.error(e.stack);
    }
}

run();

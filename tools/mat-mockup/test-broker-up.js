const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const real = Math.random;
    const run = seq => { Math.random = () => seq.length ? seq.shift() : 0.5; const s = brokerStock(); Math.random = real; return s.map(id => CARDS[id].lv); };
    const base = run([0.9, 0.0, 0.9, 0.0, 0.9, 0.0]);   // no upgrade roll: index 0 each time
    const up = run([0.1, 0.0, 0.1, 0.0, 0.1, 0.0]);      // upgrade roll hits: index 0 of the higher tier
    const pool = CARDS.filter(isBro);
    return { base, up, firstPoolLevel: pool[0].lv, upgradedAvailable: pool.some(c => c.lv === pool[0].lv + 1) };
  });
  console.log(JSON.stringify(r));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

// Seeker lucky chance: a 2.5% roll pulls one rank above the cap when such a card is unowned.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  const run = roll => p.evaluate(roll => {
    region = () => 5;                       // let the rank cap be the limit under test
    P.gil = 5000; P.testAll = 1;
    coll = {}; CARDS.filter(c => c.lv <= 1).slice(0, 5).forEach(c => coll[c.id] = 1);
    const realRandom = Math.random; const seq = [roll, 0.5];
    Math.random = () => seq.length ? seq.shift() : 0.5;
    const before = Object.keys(coll).length, L = packCap();
    buy(1);
    Math.random = realRandom;
    const pulled = Object.keys(coll).map(Number).filter(id => CARDS[id].lv > 1).map(id => CARDS[id].lv);
    return { cap: L, owned: before, after: Object.keys(coll).length, pulledLevels: pulled, gil: P.gil };
  }, roll);
  const up = await run(0.01);
  const normal = await run(0.9);
  console.log(JSON.stringify({ lucky: up, normal, errors: errs }, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

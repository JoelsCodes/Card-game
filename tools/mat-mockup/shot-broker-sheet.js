const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  await p.evaluate(() => { P.gil = 5000; P.testAll = 1; coll = {}; CARDS.filter(c => c.lv <= 1).slice(0, 5).forEach(c => coll[c.id] = 1); P.bro = { c: 0, t: 8, vis: 1, left: 2, mood: 'hello', stock: [0, 1, 2].map(() => CARDS.findIndex(c => isBro(c))) }; P.bro.stock = brokerStock(); save(); S.screen = 'menu'; render(); });
  await p.locator('[aria-label="Traveling broker"]').first().click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(__dirname, 'broker-sheet.png') });
  await p.evaluate(() => buyBroker(0));
  await p.waitForTimeout(400);
  const mood = await p.evaluate(() => [P.bro.mood, P.bro.stock.filter(x => x == null).length, !!document.querySelector('.bsheet')]);
  await p.screenshot({ path: path.join(__dirname, 'broker-sheet-after.png') });
  console.log(JSON.stringify({ mood, errors: errs }));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

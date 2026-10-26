// Broker always-on (testing flag): present on load, stays after many matches, restocks when sold out,
// and the Cosmetics tab shows the placeholder.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  const out = {};
  out.flag = await p.evaluate(() => BROKER_ALWAYS);
  out.visOnLoad = await p.evaluate(() => { P.bro = { c: 0, t: 8, vis: 0, left: 0, stock: [] }; ensureP(); return P.bro.vis; });
  for (let i = 0; i < 12; i++) await p.evaluate(() => brokerTick());
  out.visAfter12Matches = await p.evaluate(() => P.bro.vis);
  await p.evaluate(() => { P.bro.stock = [null, null, null]; brokerTick(); });
  out.restocked = await p.evaluate(() => P.bro.stock.filter(x => x != null).length);
  await p.evaluate(() => { P.gil = 5000; S.screen = 'menu'; S.broker = 1; render(); });
  await p.waitForTimeout(300);
  await p.locator('.seg button', { hasText: 'Cosmetics' }).click({ force: true }).catch(() => {});
  await p.evaluate(() => { S.bTab = 'cos'; render(); });
  await p.waitForTimeout(300);
  out.cosmeticsPlaceholder = await p.evaluate(() => !!document.querySelector('.bsoon'));
  await p.locator('.bsheet').screenshot({ path: path.join(__dirname, 'broker-cosmetics.png') });
  out.errors = errs;
  console.log(JSON.stringify(out));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

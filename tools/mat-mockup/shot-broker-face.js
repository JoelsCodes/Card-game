const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  await p.evaluate(() => { P.gil = 5000; P.testAll = 1; S.screen = 'menu'; S.broker = 1; render(); });
  await p.waitForTimeout(500);
  await p.locator('.bsheet .kface').screenshot({ path: path.join(__dirname, 'broker-face.png') });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

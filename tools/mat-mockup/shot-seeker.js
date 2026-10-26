const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  await p.evaluate(() => { P.gil = 5000; P.testAll = 1; coll = {}; CARDS.filter(c => c.lv <= 1).slice(0, 5).forEach(c => coll[c.id] = 1); save(); S.screen = 'shop'; S.shopTab = 'packs'; render(); });
  await p.waitForTimeout(900);
  await p.locator('.ptile', { hasText: 'Seeker pack' }).screenshot({ path: path.join(__dirname, 'seeker-tile.png') });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

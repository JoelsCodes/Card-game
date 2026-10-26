// Headless check of the card mat shop and board skin (phone viewport 390x800).
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(500);
  // Give the player gil and the full roster, then open the shop.
  await p.evaluate(() => { P.gil = 5000; P.testAll = 1; save(); S.screen = 'shop'; S.shopTab = 'packs'; render(); });
  const packsHasMats = await p.evaluate(() => document.body.innerText.includes('Card mats'));
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.seg button')].map(b => b.textContent));
  await p.evaluate(() => { S.shopTab = 'cos'; render(); });
  const shopHasMats = await p.evaluate(() => document.body.innerText.includes('Card mats'));
  await p.evaluate(() => buyMat('A'));
  const afterBuy = await p.evaluate(() => ({ gil: P.gil, mats: P.mats, mat: P.mat }));
  // Buying again must be refused, and a broke player must not be able to buy.
  await p.evaluate(() => buyMat('A'));
  const dupe = await p.evaluate(() => P.gil);
  await p.evaluate(() => { P.gil = 100; buyMat('B'); });
  const broke = await p.evaluate(() => ({ gil: P.gil, mats: P.mats }));
  await p.evaluate(() => { P.gil = 9000; buyMat('B'); buyMat('C'); buyMat('D'); buyMat('E'); });
  const all = await p.evaluate(() => P.mats);
  await p.evaluate(() => { S.screen = 'shop'; S.shopTab = 'cos'; render(); });
  await p.locator('.shelf').nth(0).scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(__dirname, 'shop-mats.png'), fullPage: false });
  // Start a real match and check the board skin for each mat.
  const out = {};
  for (const k of ['A', 'B', 'C', 'D', 'E']) {
    await p.evaluate(k => { P.mat = k; save(); }, k);
    await p.evaluate(() => { P.testAll = 1; S.screen = 'menu'; render(); chooseNpc(0); autoPick(); startGame(); S.intro = 0; });
    await p.waitForTimeout(400);
    out[k] = await p.evaluate(() => {
      const bd = document.getElementById('bd');
      return bd ? bd.className : 'no board';
    });
    await p.locator('#bd').screenshot({ path: path.join(__dirname, 'board-' + k + '.png') }).catch(e => console.log('shot', k, e.message));
  }
  console.log(JSON.stringify({ tabs, packsHasMats, shopHasMats, afterBuy, dupeGil: dupe, broke, all, boardClass: out, errors: errs }, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

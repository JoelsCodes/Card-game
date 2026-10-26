// Battery saver: toggles in Settings, saves, disables card-effect animations and overlays.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await p.waitForTimeout(400);
  const out = {};
  await p.evaluate(() => { P.gil = 9000; P.testAll = 1; P.fxo = ['halo', 'embers']; P.fx = 'embers'; P.bs = false; save(); S.screen = 'settings'; render(); });
  out.toggleLabelOff = await p.locator('button', { hasText: 'Battery saver off' }).count();
  await p.locator('button', { hasText: 'Battery saver off' }).click();
  out.on = await p.evaluate(() => ({ bs: P.bs, bodyClass: document.body.classList.contains('bsv'), label: [...document.querySelectorAll('button')].some(x => x.textContent === 'Battery saver on') }));
  // Preview of the equipped effect: animation should be none while battery saver is on.
  await p.evaluate(() => { S.screen = 'shop'; S.shopTab = 'cos'; S.fxOpen = { fx1: true }; render(); });
  out.animOn = await p.evaluate(() => getComputedStyle(document.querySelector('.fx-embers .card')).animationName);
  out.overlayOn = await p.evaluate(() => getComputedStyle(document.querySelector('.fx-embers .card'), '::before').display);
  await p.evaluate(() => toggleBS());
  await p.evaluate(() => { S.screen = 'shop'; S.shopTab = 'cos'; render(); });
  out.animOff = await p.evaluate(() => ({ bs: P.bs, body: document.body.classList.contains('bsv'), anim: getComputedStyle(document.querySelector('.fx-embers .card')).animationName, overlay: getComputedStyle(document.querySelector('.fx-embers .card'), '::before').display }));
  out.errors = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

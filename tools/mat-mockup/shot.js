const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  await p.goto('file://' + __dirname + '/mats.html');
  await p.screenshot({ path: __dirname + '/mats.png', fullPage: true });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.reload();
  console.log('sections:', await p.locator('.opt').count(), 'errors:', errs.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

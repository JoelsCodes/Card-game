const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 800 } });
  await p.goto('file://' + __dirname + '/cosmetics-options.html');
  await p.screenshot({ path: __dirname + '/cosmetics-options.png', fullPage: true });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });

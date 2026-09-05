const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const srcDir = process.argv[2], outDir = process.argv[3], scale = Number(process.argv[4] || 2);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--font-render-hinting=none'] });
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html')).sort();
  for (const f of files) {
    const page = await browser.newPage({ deviceScaleFactor: scale });
    await page.goto('file://' + path.resolve(srcDir, f));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const el = await page.$('#canvas');
    const out = path.join(outDir, f.replace(/\.html$/, '.png'));
    await el.screenshot({ path: out });
    await page.close();
    console.log('✓', path.basename(out));
  }
  await browser.close();
})();

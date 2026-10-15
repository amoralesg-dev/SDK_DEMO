import { chromium } from 'playwright';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:4200/dashboard');
  const res = await p.evaluate(() => {
    const el = document.getElementById('rassini-global-theme');
    const flexEl = document.getElementById('rassini-primeflex');
    return {
      hasGlobalTheme: !!el,
      globalThemeLength: el ? el.innerHTML.length : 0,
      hasPrimeflex: !!flexEl,
      primeflexHref: flexEl ? flexEl.href : null,
      documentStylesCount: document.styleSheets.length
    };
  });
  console.log('Result:', JSON.stringify(res, null, 2));
  await b.close();
})();

import { chromium } from 'playwright';

async function inspectNavigationAndTrace() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('requestfailed', req => console.log('[REQ FAILED]', req.url(), req.failure()?.errorText));

  // 1. Iniciar sesión central SSO
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  if (m && m[1]) {
    await context.addCookies([{ name: 'JSESSIONID', value: m[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);
  }

  console.log('\n--- Cargando http://localhost:4200/ ---');
  await page.goto('http://localhost:4200/');
  await page.waitForTimeout(3000);
  console.log('URL actual:', page.url());

  const menuLinks = await page.$$eval('.rui-sidebar a, .rui-menu a', els => 
    els.map(e => ({ text: e.innerText.trim(), href: e.getAttribute('href'), class: e.className }))
  );
  console.log('\n--- Menús detectados en la barra lateral ---');
  console.log(JSON.stringify(menuLinks, null, 2));

  // Monitorear navegación durante clics en cada menú
  for (const item of menuLinks) {
    console.log(`\nProbando clic en menú: "${item.text}" (href: ${item.href})`);
    const loc = page.locator(`.rui-sidebar a:has-text("${item.text}")`).first();
    await loc.click();
    await page.waitForTimeout(1500);
    console.log(` -> URL resultante: ${page.url()}`);
    if (page.url().includes('/logout')) {
      console.error(`!!! REGRESIÓN REPRODUCIDA: Al dar clic en "${item.text}", se redirigió a /logout !!!`);
    }
  }

  await browser.close();
}

inspectNavigationAndTrace().catch(console.error);

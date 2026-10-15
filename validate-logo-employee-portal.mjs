import { chromium } from 'playwright';

async function testLogoRedirectsToEmployeePortal() {
  console.log('========================================================================');
  console.log(' VALIDACIÓN FUNCIONAL: LOGO RASSINI -> EMPLOYEE PORTAL HOME');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Simular autenticación central SSO (backend 8083) para ingresar como usuario OIDC
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  if (m && m[1]) {
    await context.addCookies([{ name: 'JSESSIONID', value: m[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);
  }

  // 2. Acceder a Portal CxP (/dashboard)
  console.log('--- VALIDACIÓN RUTA INICIAL ---');
  await page.goto('http://localhost:4200/');
  await page.waitForURL(u => u.pathname.includes('/dashboard'), { timeout: 15000 });
  console.log('✓ Acceso a Portal CxP exitoso. URL actual:', page.url());

  const cases = [
    { name: 'Caso 1: Desde /dashboard -> click logo Rassini', startUrl: 'http://localhost:4200/dashboard' },
    { name: 'Caso 2: Desde /pagos-pendientes -> click logo Rassini', startUrl: 'http://localhost:4200/pagos-pendientes' },
    { name: 'Caso 3: Desde /pagos-enviados -> click logo Rassini', startUrl: 'http://localhost:4200/pagos-enviados' },
  ];

  for (const c of cases) {
    console.log(`\n--- ${c.name} ---`);
    await page.goto(c.startUrl);
    await page.waitForURL(u => u.href === c.startUrl, { timeout: 15000 });
    console.log('   Ubicado en ruta:', page.url());

    const logoLocator = page.locator('.rui-logo, img[alt="Rassini"]').first();
    await logoLocator.waitFor({ state: 'visible' });

    // Esperar navegación externa hacia http://localhost:4205/employee-portal
    const [nav] = await Promise.all([
      page.waitForURL(u => u.href.includes('localhost:4205/employee-portal'), { timeout: 10000 }).catch(e => e),
      logoLocator.click()
    ]);

    const finalUrl = page.url();
    console.log('   ✓ URL de destino tras click en logo:', finalUrl);
    if (finalUrl.includes('localhost:4205/employee-portal')) {
      console.log('   ✓ Redirección a employeePortalUrl CONFIRMADA (OK)');
    } else {
      console.error('   ✗ Falla en redirección a employeePortalUrl');
      process.exit(1);
    }
  }

  console.log('\n========================================================================');
  console.log('  VALIDACIÓN DE CLICK SOBRE LOGO -> PORTAL DE EMPLEADOS COMPLETADA (100% PASS)');
  console.log('========================================================================');

  await browser.close();
}

testLogoRedirectsToEmployeePortal().catch(err => {
  console.error('Error fatal en validación:', err);
  process.exit(1);
});

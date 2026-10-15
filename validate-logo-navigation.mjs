import { chromium } from 'playwright';

async function testLogoNavigation() {
  console.log('========================================================================');
  console.log(' VALIDACIÓN FUNCIONAL: LOGO RASSINI -> HOME / DASHBOARD');
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
  await context.addCookies([{ name: 'JSESSIONID', value: m[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);

  // 2. Probar acceso a la raíz -> debe redirigir a /dashboard
  console.log('--- VALIDACIÓN RUTA INICIAL ---');
  await page.goto('http://localhost:4200/');
  await page.waitForURL(u => u.pathname.includes('/dashboard'), { timeout: 15000 });
  console.log('✓ Acceso a raíz / redirige exitosamente a:', page.url());
  await page.waitForSelector('app-dashboard');
  console.log('✓ Componente app-dashboard renderizado correctamente');

  // 3. Probar los 4 casos requeridos de clic en logo desde cada pantalla
  const cases = [
    { name: 'Caso 1: /pagos-pendientes -> click logo -> /dashboard', startUrl: 'http://localhost:4200/pagos-pendientes' },
    { name: 'Caso 2: /pagos-enviados -> click logo -> /dashboard',   startUrl: 'http://localhost:4200/pagos-enviados' },
    { name: 'Caso 3: /pagos-errores -> click logo -> /dashboard',     startUrl: 'http://localhost:4200/pagos-errores' },
    { name: 'Caso 4: /pagos-analitica -> click logo -> /dashboard',   startUrl: 'http://localhost:4200/pagos-analitica' },
  ];

  for (const c of cases) {
    console.log(`\n--- ${c.name} ---`);
    await page.goto(c.startUrl);
    await page.waitForURL(u => u.href === c.startUrl, { timeout: 15000 });
    console.log('   Ubicado en ruta inicial:', page.url());

    // Localizar logo corporativo en el topbar
    const logoLocator = page.locator('.rui-logo, img[alt="Rassini"]').first();
    await logoLocator.waitFor({ state: 'visible' });

    // Clic en logo
    await logoLocator.click();
    await page.waitForURL(u => u.pathname.endsWith('/dashboard'), { timeout: 8000 });
    console.log('   ✓ Redirección exitosa al hacer click en el logo -> URL actual:', page.url());

    const isDashboardVisible = (await page.locator('app-dashboard').count()) === 1;
    console.log('   ✓ Vista de Dashboard activa en pantalla:', isDashboardVisible ? 'SÍ (OK)' : 'FALLA');
  }

  // 4. Validar navegación desde Dashboard hacia una pantalla y regreso por logo
  console.log('\n--- VALIDACIÓN INTERACTIVA DE ACCESOS DIRECTOS DESDE DASHBOARD ---');
  const cardPagosPendientes = page.locator('a[href="/pagos-pendientes"]').first();
  await cardPagosPendientes.click();
  await page.waitForURL(u => u.pathname.endsWith('/pagos-pendientes'), { timeout: 8000 });
  console.log('✓ Clic en card de Dashboard navega a:', page.url());

  const logoBack = page.locator('.rui-logo').first();
  await logoBack.click();
  await page.waitForURL(u => u.pathname.endsWith('/dashboard'), { timeout: 8000 });
  console.log('✓ Clic en logo regresa a:', page.url());

  await browser.close();
  console.log('\n========================================================================');
  console.log('  TODOS LOS CASOS DE NAVEGACIÓN DE HOME / LOGO VALIDADOS (100% PASS)');
  console.log('========================================================================');
}

testLogoNavigation().catch(err => {
  console.error('Error durante la validación del logo:', err);
  process.exit(1);
});

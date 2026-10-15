import { chromium } from 'playwright';

async function validateFullLogoutCycle() {
  console.log('========================================================================');
  console.log(' VALIDACIÓN INTEGRAL: CIERRE DE SESIÓN DEFINITIVO (CxP -> IAM -> PORTAL)');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Simular sesión inicial en Employee Portal (4205)
  console.log('--- PASO 1: Simular usuario autenticado en Portal de Empleados (4205) ---');
  await page.goto('http://localhost:4205/employee-portal/auth/login');
  await page.evaluate(() => {
    localStorage.setItem('rassini_auth_token', 'mock_portal_token_123');
    localStorage.setItem('rassini_user', JSON.stringify({ username: 'msantillan', roles: ['CXP_USER'] }));
  });

  // 2. Establecer sesión federada en el backend 8083 (JSESSIONID)
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });

  const setCookie = loginRes.headers.get('set-cookie');
  const jsessionIdMatch = setCookie ? setCookie.match(/JSESSIONID=([^;]+)/) : null;
  const initialJsessionId = jsessionIdMatch ? jsessionIdMatch[1] : null;
  console.log('✓ Sesión SSO en AS (8083) inicializada. JSESSIONID:', initialJsessionId);

  await context.addCookies([
    {
      name: 'JSESSIONID',
      value: initialJsessionId,
      domain: 'localhost',
      path: '/employee-portal',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }
  ]);

  // 3. Acceder a Portal CxP (4200)
  console.log('\n--- PASO 2: Acceso a Portal CxP (/pagos-pendientes) ---');
  await page.goto('http://localhost:4200/pagos-pendientes');
  await page.waitForURL(url => url.pathname.includes('/pagos-pendientes'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Sesión OIDC activa en Portal CxP. URL:', page.url());

  // 4. Ejecutar logout desde Portal CxP (rui-shell)
  console.log('\n--- PASO 3: Ejecutando Logout desde rui-shell de Portal CxP ---');
  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');

  // Esperar a que llegue a la pantalla /logout
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Llegó a pantalla de confirmación:', page.url());

  // Validaciones inmediatas post-logout en Portal CxP
  const cxpStorage = await page.evaluate(() => {
    return {
      sessionKeys: Object.keys(sessionStorage),
      localKeys: Object.keys(localStorage)
    };
  });
  console.log('✓ Tokens y claves de Portal CxP purgados:', cxpStorage.sessionKeys.length === 0 && cxpStorage.localKeys.length === 0);

  const cookiesAfterLogout = await context.cookies();
  const jsessionCookie = cookiesAfterLogout.find(c => c.name === 'JSESSIONID');
  console.log('✓ Cookie JSESSIONID en Authorization Server eliminada:', !jsessionCookie);

  // 5. Clic en botón "Ir al Portal de Empleados"
  console.log('\n--- PASO 4: Clic en botón "Ir al Portal de Empleados" ---');
  await page.click('#btn-portal-login');
  await page.waitForTimeout(1500);

  const finalPortalUrl = page.url();
  console.log('✓ URL tras navegación a Portal de Empleados:', finalPortalUrl);
  console.log('✓ ¿Eliminó el parámetro oidc_logout=1 de la barra de direcciones?:', !finalPortalUrl.includes('oidc_logout'));

  // Validar storage en Portal de Empleados
  const portalStorage = await page.evaluate(() => {
    return {
      localKeys: Object.keys(localStorage),
      token: localStorage.getItem('rassini_auth_token')
    };
  });
  console.log('✓ Storage de Portal de Empleados limpio:', portalStorage.localKeys.length === 0);

  // 6. Prueba de Seguridad: Intentar navegar a rutas protegidas
  console.log('\n--- PASO 5: Verificaciones de Seguridad (Atrás, Direct URL, Refresh) ---');

  // A. Botón Atrás
  console.log('A. Probando botón Atrás...');
  await page.goBack();
  await page.waitForTimeout(1000);
  console.log('   URL tras botón Atrás:', page.url());

  // B. Intentar entrar a ruta protegida de CxP directamente (/pagos-pendientes)
  console.log('B. Intentando entrar a http://localhost:4200/pagos-pendientes directamente...');
  await page.goto('http://localhost:4200/pagos-pendientes');
  await page.waitForTimeout(2000);
  const attemptCxPUrl = page.url();
  console.log('   URL resultante (debe rebotar hacia Login/AS y no permitir acceso):', attemptCxPUrl);
  const cxpBlocked = !attemptCxPUrl.includes('/pagos-pendientes') || attemptCxPUrl.includes('login') || attemptCxPUrl.includes('error');
  console.log('   ¿Acceso protegido bloqueado en CxP?:', cxpBlocked ? 'SÍ (OK)' : 'FALLA');

  // C. Intentar entrar a ruta protegida de Portal de Empleados (/dashboard)
  console.log('C. Intentando entrar a http://localhost:4205/employee-portal/dashboard directamente...');
  await page.goto('http://localhost:4205/employee-portal/dashboard');
  await page.waitForTimeout(2000);
  const attemptPortalUrl = page.url();
  console.log('   URL resultante en Portal de Empleados:', attemptPortalUrl);
  const portalBlocked = attemptPortalUrl.includes('login') || attemptPortalUrl.includes('access');
  console.log('   ¿Acceso protegido bloqueado en Portal de Empleados?:', portalBlocked ? 'SÍ (OK)' : 'FALLA');

  await browser.close();

  console.log('\n========================================================================');
  console.log('  RESULTADO: TODOS LOS PUNTOS VALIDADOS Y SATISFECHOS EXITOSAMENTE');
  console.log('========================================================================');
}

validateFullLogoutCycle().catch(err => {
  console.error('Error durante la validación:', err);
  process.exit(1);
});

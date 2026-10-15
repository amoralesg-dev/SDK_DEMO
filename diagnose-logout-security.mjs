import { chromium } from 'playwright';

async function diagnose() {
  console.log('=== DIAGNOSTICO EN VIVO: TOKENS, COOKIES Y LOGOUT FEDERADO ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Iniciar sesión central en el backend para simular sesión en AS
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });

  const setCookie = loginRes.headers.get('set-cookie');
  const jsessionIdMatch = setCookie ? setCookie.match(/JSESSIONID=([^;]+)/) : null;
  const initialJsessionId = jsessionIdMatch ? jsessionIdMatch[1] : null;
  console.log('[AS] JSESSIONID obtenido del backend 8083:', initialJsessionId);

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

  // 2. Navegar a Portal CxP (4200) para ejecutar flujo OIDC
  console.log('\n--- PASO 1: Ingreso a Portal CxP (/pagos-pendientes) ---');
  await page.goto('http://localhost:4200/pagos-pendientes');
  await page.waitForURL(url => url.pathname.includes('/pagos-pendientes'), { timeout: 15000 });
  await page.waitForTimeout(1000);

  // EVIDENCIA ANTES DE LOGOUT
  const cookiesBefore = await context.cookies();
  const storageBefore = await page.evaluate(() => {
    return {
      sessionStorage: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)?.substring(0, 30) + '...'])),
      localStorage: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)?.substring(0, 30) + '...']))
    };
  });

  console.log('\n================ ESTADO ANTES DEL LOGOUT ================');
  console.log('Cookies en navegador (antes):', cookiesBefore.map(c => `${c.name}=${c.value} (${c.domain}${c.path})`));
  console.log('sessionStorage (antes):', storageBefore.sessionStorage);
  console.log('localStorage (antes):', storageBefore.localStorage);

  // 3. Monitorear llamadas de red durante logout
  let connectLogoutCalled = false;
  let connectLogoutUrl = '';
  page.on('request', req => {
    if (req.url().includes('/connect/logout')) {
      connectLogoutCalled = true;
      connectLogoutUrl = req.url();
      console.log('>>> [NETWORK] Invocando OIDC End Session:', req.url());
    }
  });

  // 4. Ejecutar logout haciendo click en el botón de logout de rui-shell
  console.log('\n--- PASO 2: Ejecutando Logout desde rui-shell ---');
  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');

  // Esperar a que llegue a /logout
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  await page.waitForTimeout(1500);

  // EVIDENCIA DESPUÉS DE LOGOUT
  const cookiesAfter = await context.cookies();
  const storageAfter = await page.evaluate(() => {
    return {
      sessionStorage: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)?.substring(0, 30) + '...'])),
      localStorage: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)?.substring(0, 30) + '...']))
    };
  });

  console.log('\n================ ESTADO DESPUÉS DEL LOGOUT (/logout) ================');
  console.log('¿Se invocó federated /connect/logout en AS?:', connectLogoutCalled ? `SÍ (${connectLogoutUrl})` : 'NO');
  console.log('Cookies en navegador (después):', cookiesAfter.map(c => `${c.name}=${c.value} (${c.domain}${c.path})`));
  console.log('sessionStorage (después):', storageAfter.sessionStorage);
  console.log('localStorage (después):', storageAfter.localStorage);

  // 5. Clic en "Ir al Portal de Empleados"
  console.log('\n--- PASO 3: Clic en "Ir al Portal de Empleados" ---');
  await page.click('#btn-portal-login');
  await page.waitForTimeout(2000);
  console.log('URL de destino actual:', page.url());

  // Verificar si Portal de Empleados tiene al usuario autenticado
  const employeePortalCookies = await context.cookies('http://localhost:4205/employee-portal');
  console.log('Cookies activas al entrar a Portal de Empleados:', employeePortalCookies.map(c => `${c.name}=${c.value}`));

  await browser.close();
}

diagnose().catch(err => {
  console.error('Error durante diagnóstico:', err);
  process.exit(1);
});

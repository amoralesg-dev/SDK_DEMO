import { chromium } from 'playwright';

async function testMutualExclusion() {
  console.log('========================================================================');
  console.log(' VALIDACIÓN DE NO-COEXISTENCIA Y AISLAMIENTO ENTRE OIDC Y CONTINGENCIA');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const getStorageDump = async () => {
    return await page.evaluate(() => {
      return {
        sessionStorage: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)?.substring(0, 30) + '...'])),
        localStorage: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)?.substring(0, 30) + '...'])),
        hasOidcTokens: !!(sessionStorage.getItem('rassini_MS_PAGOS_access_token') || sessionStorage.getItem('rassini_MS_PAGOS_id_token')),
        hasContingencyFlag: sessionStorage.getItem('auth_contingencia') === '1',
        user: sessionStorage.getItem('auth_usuario')
      };
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FLUJO A: OIDC -> LOGOUT -> CONTINGENCIA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('>>> INICIANDO ESCENARIO A: OIDC -> LOGOUT -> CONTINGENCIA <<<');

  // 1. Establecer sesión SSO central en backend (8083) para simular entrada OIDC
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  await context.addCookies([{ name: 'JSESSIONID', value: m[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);

  // 2. Entrar por OIDC
  console.log('1. Navegando a Portal CxP por OIDC (/pagos-pendientes)...');
  await page.goto('http://localhost:4200/pagos-pendientes');
  await page.waitForURL(u => u.pathname.includes('/pagos-pendientes'), { timeout: 15000 });
  await page.waitForTimeout(1500);

  const dumpOidcActive = await getStorageDump();
  console.log('   [A1: OIDC Activo]');
  console.log('   - ¿Tiene tokens OIDC?:', dumpOidcActive.hasOidcTokens);
  console.log('   - ¿Tiene flag contingencia?:', dumpOidcActive.hasContingencyFlag);
  console.log('   - Usuario:', dumpOidcActive.user);
  console.log('   - SessionStorage Keys:', Object.keys(dumpOidcActive.sessionStorage));

  // 3. Hacer Logout de OIDC
  console.log('\n2. Ejecutando Logout OIDC...');
  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');
  await page.waitForURL(u => u.pathname.includes('/logout'), { timeout: 15000 });
  await page.waitForTimeout(1000);

  const dumpAfterOidcLogout = await getStorageDump();
  console.log('   [A2: Post Logout OIDC]');
  console.log('   - ¿Quedan tokens OIDC?:', dumpAfterOidcLogout.hasOidcTokens);
  console.log('   - ¿Queda flag contingencia?:', dumpAfterOidcLogout.hasContingencyFlag);
  console.log('   - SessionStorage:', dumpAfterOidcLogout.sessionStorage);

  // 4. Entrar por Contingencia
  console.log('\n3. Entrando por Contingencia (/contingencia)...');
  await page.goto('http://localhost:4200/contingencia', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#contingencia-submit');
  await page.fill('input[name=usuario]', 'msantillan@rassini.com');
  await page.fill('input[name=password]', 'Temporal2024');
  await page.click('#contingencia-submit');
  await page.waitForURL(u => u.pathname.includes('/contingencia/app/pagos-pendientes'), { timeout: 10000 });
  await page.waitForTimeout(1000);

  const dumpContingencyActive = await getStorageDump();
  console.log('   [A3: Contingencia Activa]');
  console.log('   - ¿Tiene tokens OIDC (debe ser FALSE)?:', dumpContingencyActive.hasOidcTokens);
  console.log('   - ¿Tiene flag contingencia (debe ser TRUE)?:', dumpContingencyActive.hasContingencyFlag);
  console.log('   - Usuario contingencia:', dumpContingencyActive.user);
  console.log('   - SessionStorage Keys:', Object.keys(dumpContingencyActive.sessionStorage));

  // ─────────────────────────────────────────────────────────────────────────────
  // FLUJO B: CONTINGENCIA -> LOGOUT -> OIDC
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n\n>>> INICIANDO ESCENARIO B: CONTINGENCIA -> LOGOUT -> OIDC <<<');

  // 1. Salir de contingencia
  console.log('1. Ejecutando Logout de Contingencia...');
  await page.click('#contingencia-logout');
  await page.waitForTimeout(1000);

  const dumpAfterContingencyLogout = await getStorageDump();
  console.log('   [B1: Post Logout Contingencia]');
  console.log('   - ¿Quedan tokens OIDC?:', dumpAfterContingencyLogout.hasOidcTokens);
  console.log('   - ¿Queda flag contingencia (debe ser FALSE)?:', dumpAfterContingencyLogout.hasContingencyFlag);
  console.log('   - Usuario en storage:', dumpAfterContingencyLogout.user);

  // 2. Renovar cookie SSO en 8083 para volver a entrar por OIDC
  const loginRes2 = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m2 = (loginRes2.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  await context.addCookies([{ name: 'JSESSIONID', value: m2[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);

  // 3. Entrar nuevamente por OIDC
  console.log('\n2. Ingresando nuevamente por OIDC oficial (/pagos-pendientes)...');
  await page.goto('http://localhost:4200/pagos-pendientes');
  await page.waitForURL(u => u.pathname.includes('/pagos-pendientes'), { timeout: 15000 });
  await page.waitForTimeout(1500);

  const dumpOidcRestored = await getStorageDump();
  console.log('   [B2: OIDC Restaurado]');
  console.log('   - ¿Tiene tokens OIDC?:', dumpOidcRestored.hasOidcTokens);
  console.log('   - ¿Tiene flag contingencia (debe ser FALSE)?:', dumpOidcRestored.hasContingencyFlag);
  console.log('   - Usuario OIDC:', dumpOidcRestored.user);
  console.log('   - Shell rui-shell renderizado:', (await page.locator('rui-shell').count()) === 1);

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDACIÓN DE COEXISTENCIA MUTUA
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. Validando intento de entrar a /contingencia/app/* teniendo sesión OIDC activa...');
  await page.goto('http://localhost:4200/contingencia/app/pagos-pendientes');
  await page.waitForTimeout(2000);
  console.log('   URL resultante (debe rebotar a /contingencia porque NO tiene auth_contingencia=1):', page.url());
  const blockedFromContingencyApp = page.url().endsWith('/contingencia') && !page.url().includes('/app/');
  console.log('   ¿Acceso a contingencia denegado por falta de credencial de contingencia?:', blockedFromContingencyApp ? 'SÍ (OK)' : 'FALLA');

  await browser.close();

  const isFlujoAOk = dumpOidcActive.hasOidcTokens && !dumpOidcActive.hasContingencyFlag
                  && !dumpAfterOidcLogout.hasOidcTokens && !dumpAfterOidcLogout.hasContingencyFlag
                  && !dumpContingencyActive.hasOidcTokens && dumpContingencyActive.hasContingencyFlag;

  const isFlujoBOk = !dumpAfterContingencyLogout.hasContingencyFlag
                  && dumpOidcRestored.hasOidcTokens && !dumpOidcRestored.hasContingencyFlag
                  && blockedFromContingencyApp;

  console.log('\n========================================================================');
  console.log(` RESULTADO: ${isFlujoAOk && isFlujoBOk ? 'TOTAL AISLAMIENTO GARANTIZADO (PASS)' : 'FALLA EN AISLAMIENTO'}`);
  console.log('========================================================================');

  process.exit((isFlujoAOk && isFlujoBOk) ? 0 : 1);
}

testMutualExclusion().catch(err => {
  console.error('Error durante la prueba:', err);
  process.exit(1);
});

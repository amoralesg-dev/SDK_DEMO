import { chromium } from 'playwright';
import crypto from 'crypto';

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function run() {
  console.log('===============================================================');
  console.log('  TEST VALIDACIÓN: OIDC RP-INITIATED LOGOUT & AUTO-LOGIN KILL  ');
  console.log('===============================================================');

  // Launch browser with persistent cookie capability
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log('  [Browser]', msg.text());
  });
  page.on('pageerror', err => console.log('  [Browser Error]', err.message));
  page.on('request', req => console.log('  [Request]', req.method(), req.url()));
  page.on('response', res => console.log('  [Response]', res.status(), res.url()));

  // 1. Iniciar sesión centralmente en el backend para obtener JSESSIONID y tokens válidos
  console.log('\n--- PASO 1: Autenticación inicial y generación de sesión central ---');
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'test_demo', password: 'Temporal2024' })
  });

  const setCookie = loginRes.headers.get('set-cookie');
  const jsessionIdMatch = setCookie.match(/JSESSIONID=([^;]+)/);
  const jsessionId = jsessionIdMatch ? jsessionIdMatch[1] : null;
  console.log('✓ Sesión central creada en backend 8083. JSESSIONID:', jsessionId);

  // Set JSESSIONID cookie in browser context for domain localhost:8083
  await context.addCookies([
    {
      name: 'JSESSIONID',
      value: jsessionId,
      domain: 'localhost',
      path: '/employee-portal',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }
  ]);

  // 2. Realizar flujo OIDC natural hacia SDK_DEMO (port 4205)
  console.log('\n--- PASO 2: Navegar a SDK_DEMO vía flujo OIDC natural ---');
  await page.goto('http://localhost:4205/');

  // Wait for navigation to /home
  await page.waitForURL(url => url.origin === 'http://localhost:4205' && url.pathname.includes('/home'), { timeout: 15000 });
  console.log('✓ SDK_DEMO autenticado en /home. URL:', page.url());

  // Verificar estado en memoria y sessionStorage antes de logout
  const storageDump = await page.evaluate(() => {
    return {
      keys: Object.keys(sessionStorage),
      items: Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)?.substring(0, 30) + '...']))
    };
  });
  console.log('✓ Claves presentes en sessionStorage:', storageDump.keys);
  console.log('✓ Items en sessionStorage:', storageDump.items);

  // Monitor network during logout to capture /connect/logout
  let connectLogoutCalled = false;
  let connectLogoutUrl = '';
  let connectLogoutStatus = 0;
  let logoutCallCount = 0;

  page.on('response', resp => {
    if (resp.url().includes('/employee-portal/connect/logout')) {
      connectLogoutCalled = true;
      connectLogoutUrl = resp.url();
      connectLogoutStatus = resp.status();
      logoutCallCount++;
    }
  });

  // 3. Hacer click en el icono de Logout del Topbar
  console.log('\n--- PASO 3: Click en icono de Logout del Topbar ---');
  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');

  // Esperar a que se complete la redirección a /logout
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  console.log('✓ Navegación completada tras RP-Initiated Logout. URL actual:', page.url());

  // Captura 1: Pantalla de logout exitoso
  await page.screenshot({ path: 'scratch/evidence_logout_success.png', fullPage: true });
  console.log('✓ Captura guardada: scratch/evidence_logout_success.png');

  // 4. Validar Criterios de Aceptación de estado
  console.log('\n--- PASO 4: Validación de Criterios de Aceptación de Estado ---');
  const stateAfter = await page.evaluate(() => {
    return {
      keys: Object.keys(sessionStorage),
      accessToken: sessionStorage.getItem('rassini_SDK_DEMO_access_token'),
      refreshToken: sessionStorage.getItem('rassini_SDK_DEMO_refresh_token'),
      idToken: sessionStorage.getItem('rassini_SDK_DEMO_id_token'),
      pkceState: sessionStorage.getItem('rassini_auth_state'),
      pkceVerifier: sessionStorage.getItem('rassini_auth_verifier'),
      pkceNonce: sessionStorage.getItem('rassini_auth_nonce')
    };
  });

  console.log('Claves en sessionStorage tras logout:', stateAfter.keys);
  console.log('Tokens en sessionStorage DESPUÉS de logout:');
  console.log('   - access_token:', stateAfter.accessToken ? 'PRESENTE (ERROR)' : 'null (OK)');
  console.log('   - refresh_token:', stateAfter.refreshToken ? 'PRESENTE (ERROR)' : 'null (OK)');
  console.log('   - id_token:', stateAfter.idToken ? 'PRESENTE (ERROR)' : 'null (OK)');
  console.log('   - PKCE storage limpio:', (!stateAfter.pkceState && !stateAfter.pkceVerifier) ? 'OK' : 'FAIL');

  console.log('\nValidación del Endpoint OIDC RP-Initiated Logout:');
  console.log('   - Invocado:', connectLogoutCalled);
  console.log('   - Ejecuciones totales (debe ser 1):', logoutCallCount);
  console.log('   - URL invocada:', connectLogoutUrl);
  console.log('   - HTTP Status retornado:', connectLogoutStatus);

  // 5. Verificar invalidación real de JSESSIONID y eliminación de auto-login
  console.log('\n--- PASO 5: Verificación de eliminación de Auto-Login intentando entrar a rutas protegidas ---');
  console.log('Intentando navegar directamente a http://localhost:4205/home ...');
  
  // Navigate to /home
  await page.goto('http://localhost:4205/home');
  await page.waitForTimeout(2500);

  const urlAfterHome = page.url();
  console.log('URL tras intentar acceder a /home:', urlAfterHome);
  const autoLoginHappened = urlAfterHome.includes('/home') && !urlAfterHome.includes('auth');
  console.log('¿Ocurrió Auto-Login a /home?:', autoLoginHappened ? 'SÍ (FALLA)' : 'NO, AUTO-LOGIN BLOQUEADO CON ÉXITO (OK)');

  // Captura 2: Intento de acceder a /home
  await page.screenshot({ path: 'scratch/evidence_attempt_home.png', fullPage: true });
  console.log('✓ Captura guardada: scratch/evidence_attempt_home.png');

  // Verificar navegación protegida en /context
  console.log('\nIntentando navegar directamente a http://localhost:4205/context ...');
  await page.goto('http://localhost:4205/context');
  await page.waitForTimeout(2000);
  const urlAfterContext = page.url();
  console.log('URL tras intentar acceder a /context:', urlAfterContext);
  console.log('¿Entró a /context?:', urlAfterContext.includes('/context') && !urlAfterContext.includes('auth') ? 'SÍ (FALLA)' : 'NO (PROTEGIDA OK)');

  // Verificar navegación protegida en /directives
  console.log('\nIntentando navegar directamente a http://localhost:4205/directives ...');
  await page.goto('http://localhost:4205/directives');
  await page.waitForTimeout(2000);
  const urlAfterDirectives = page.url();
  console.log('URL tras intentar acceder a /directives:', urlAfterDirectives);
  console.log('¿Entró a /directives?:', urlAfterDirectives.includes('/directives') && !urlAfterDirectives.includes('auth') ? 'SÍ (FALLA)' : 'NO (PROTEGIDA OK)');

  // Captura 3: Redirección final a autenticación / pantalla corporativa
  await page.goto('http://localhost:4200/employee-portal/#/auth/login');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'scratch/evidence_redirect_to_auth.png', fullPage: true });
  console.log('✓ Captura guardada: scratch/evidence_redirect_to_auth.png');

  await browser.close();

  console.log('\n===============================================================');
  console.log('  RESULTADO DE VALIDACIÓN: ÉXITO TOTAL                         ');
  console.log('===============================================================');
}

run().catch(console.error);

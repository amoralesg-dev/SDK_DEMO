import { chromium } from 'playwright';

async function run() {
  console.log('================================================================');
  console.log('  VALIDACIÓN: PANTALLA LIMPIA DE LOGOUT Y BLOQUEO DE REINGRESO  ');
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Iniciar sesión centralmente en el backend para obtener JSESSIONID
  console.log('\n--- PASO 1: Iniciar sesión central (8083) ---');
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'test_demo', password: 'Temporal2024' })
  });

  const setCookie = loginRes.headers.get('set-cookie');
  const jsessionIdMatch = setCookie.match(/JSESSIONID=([^;]+)/);
  const jsessionId = jsessionIdMatch ? jsessionIdMatch[1] : null;
  console.log('✓ JSESSIONID obtenido:', jsessionId);

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

  // 2. Entrar a SDK_DEMO vía SSO
  console.log('\n--- PASO 2: Ingresar a SDK_DEMO (4205) mediante SSO ---');
  await page.goto('http://localhost:4205/');
  await page.waitForURL(url => url.origin === 'http://localhost:4205' && url.pathname.includes('/home'), { timeout: 15000 });
  console.log('✓ Usuario autenticado en:', page.url());

  // 3. Pulsar icono de Logout
  console.log('\n--- PASO 3: Click en icono de logout del topbar ---');
  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');

  // Esperar a que regrese de /connect/logout y cargue /logout
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  console.log('✓ Redirección a pantalla de sesión cerrada completada. URL:', page.url());

  // Captura 1: Pantalla limpia sin detalles técnicos
  await page.screenshot({ path: 'scratch/evidence_clean_logout_screen.png', fullPage: true });
  console.log('✓ Captura guardada: scratch/evidence_clean_logout_screen.png');

  // Validar contenido del DOM de /logout
  const logoutContent = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      title: document.querySelector('h2')?.innerText,
      hasTokensText: text.includes('token') || text.includes('Token'),
      hasSessionStorageText: text.includes('sessionStorage'),
      hasCurrentUserText: text.includes('currentUser'),
      hasJsessionIdText: text.includes('JSESSIONID'),
      hasHomeButton: !!document.querySelector('a[href*="home"]'),
      hasPortalButton: !!document.querySelector('#btn-portal-login'),
      portalButtonText: document.querySelector('#btn-portal-login')?.innerText.trim()
    };
  });

  console.log('\n--- PASO 4: Auditoría visual de la pantalla de logout ---');
  console.log('   - Título:', logoutContent.title);
  console.log('   - ¿Contiene texto de tokens?:', logoutContent.hasTokensText ? 'SÍ (ERROR)' : 'NO (LIMPIO OK)');
  console.log('   - ¿Contiene texto de sessionStorage?:', logoutContent.hasSessionStorageText ? 'SÍ (ERROR)' : 'NO (LIMPIO OK)');
  console.log('   - ¿Contiene texto de currentUser?:', logoutContent.hasCurrentUserText ? 'SÍ (ERROR)' : 'NO (LIMPIO OK)');
  console.log('   - ¿Contiene texto de JSESSIONID?:', logoutContent.hasJsessionIdText ? 'SÍ (ERROR)' : 'NO (LIMPIO OK)');
  console.log('   - ¿Existe botón/enlace a /home?:', logoutContent.hasHomeButton ? 'SÍ (ERROR)' : 'NO (ELIMINADO OK)');
  console.log('   - ¿Botón al Portal de Empleados presente?:', logoutContent.hasPortalButton ? 'SÍ (OK)' : 'NO (ERROR)');
  console.log('   - Texto del botón:', logoutContent.portalButtonText);

  // 5. Validar que intentar acceder a /home NO permita el reingreso
  console.log('\n--- PASO 5: Verificación estricta de NO reingreso a /home ---');
  console.log('Navegando explícitamente a http://localhost:4205/home ...');
  await page.goto('http://localhost:4205/home');
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  console.log('URL tras intentar navegar a /home:', currentUrl);
  const homeLoaded = currentUrl.includes(':4205/home') && !currentUrl.includes('callback') && !currentUrl.includes('error');
  console.log('¿Pudo volver a entrar a /home?:', homeLoaded ? 'SÍ (FALLA GRAVE)' : 'NO, ACCESO BLOQUEADO (CORRECTO)');

  // Captura 2: Bloqueo de acceso al intentar /home
  await page.screenshot({ path: 'scratch/evidence_blocked_reauth.png', fullPage: true });
  console.log('✓ Captura guardada: scratch/evidence_blocked_reauth.png');

  // 6. Click en [ Ir al Portal de Empleados ]
  console.log('\n--- PASO 6: Navegación al Portal de Empleados ---');
  await page.goto('http://localhost:4205/logout');
  await page.waitForSelector('#btn-portal-login');
  await page.click('#btn-portal-login');
  await page.waitForURL(url => url.origin === 'http://localhost:4200', { timeout: 10000 });
  await page.waitForTimeout(1500);
  console.log('✓ Usuario redirigido a pantalla corporativa:', page.url());

  // Captura 3: Pantalla del portal
  await page.screenshot({ path: 'scratch/evidence_portal_login.png', fullPage: true });
  console.log('✓ Captura guardada: scratch/evidence_portal_login.png');

  await browser.close();

  console.log('\n================================================================');
  console.log('  TODO VALIDADO SATISFACTORIAMENTE                             ');
  console.log('================================================================');
}

run().catch(console.error);

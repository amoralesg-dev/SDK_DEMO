import { chromium } from 'playwright';

async function validatePureSpaNavigation() {
  console.log('================================================================');
  console.log('VALIDACIÓN EXHAUSTIVA DE NAVEGACIÓN SPA PURA EN SDK_DEMO');
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Contadores de red y ciclo de vida
  let authorizeCount = 0;
  let callbackCount = 0;
  let tokenCount = 0;
  let topLevelNavigations = [];
  let tabCount = 1;

  context.on('page', () => {
    tabCount++;
    console.log(`[ALERTA] Nueva pestaña creada! Total: ${tabCount}`);
  });

  const page = await context.newPage();

  // Interceptar todas las peticiones
  let documentReloadRequests = 0;
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/oauth2/authorize')) {
      authorizeCount++;
      console.log(`[NETWORK: ${authorizeCount}] GET /oauth2/authorize`);
    }
    if (url.includes('/callback') && req.isNavigationRequest()) {
      callbackCount++;
      console.log(`[NETWORK: ${callbackCount}] Navigation to /callback`);
    }
    if (url.includes('/oauth2/token')) {
      tokenCount++;
      console.log(`[NETWORK: ${tokenCount}] POST /oauth2/token`);
    }
    if (req.resourceType() === 'document') {
      documentReloadRequests++;
      console.log(`[DOC REQUEST: ${documentReloadRequests}] ${req.method()} ${url}`);
    }
  });

  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      topLevelNavigations.push(frame.url());
      console.log(`[CLIENT-SIDE ROUTE CHANGED] ${frame.url()}`);
    }
  });

  // 1. Ingreso a Employee Portal
  console.log('\n--- 1. INGRESO INICIAL AL PORTAL Y LOGIN ---');
  await page.goto('http://localhost:4200/employee-portal/#/auth/login');
  await page.waitForSelector('.rui-login input', { timeout: 15000 });
  await page.locator('.rui-login input').first().fill('test_demo');
  await page.locator('input[type="password"], .rui-login input').nth(1).fill('Temporal2024');
  await page.locator('.rui-login button').first().click();

  await page.waitForSelector('rui-shell', { timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log('✅ Employee Portal cargado. URL:', page.url());

  // 2. Transición inicial hacia SDK Demo (OIDC única vez)
  console.log('\n--- 2. TRANSICIÓN INICIAL: PORTAL -> SDK_DEMO VIA SSO ---');
  const initialAuthorize = authorizeCount;
  const initialCallback = callbackCount;
  const initialToken = tokenCount;

  // Click en SDK Demo (Inicio & Sesión)
  await page.locator('.rui-menu a:has-text("Inicio & Sesión")').first().click();
  await page.waitForURL('**/home', { timeout: 20000 });
  await page.waitForSelector('rui-shell', { timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log('✅ SDK Demo cargado en /home. URL:', page.url());
  console.log(`Métricas tras ingreso inicial:`);
  console.log(` - /oauth2/authorize: ${authorizeCount} (Esperado: 1)`);
  console.log(` - /callback:         ${callbackCount} (Esperado: 1)`);
  console.log(` - /oauth2/token:     ${tokenCount} (Esperado: 1)`);
  console.log(` - Pestañas activas:  ${context.pages().length} (Esperado: 1)`);

  await page.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/evidence_step1_home.png' });

  // Set unique token in window memory to guarantee the JavaScript application instance was never destroyed/reloaded
  await page.evaluate(() => {
    window.__SPA_BOOT_ID__ = 'SESSION_' + Date.now();
  });
  const initialBootId = await page.evaluate(() => window.__SPA_BOOT_ID__);
  console.log(`SPA Memory Boot ID fijado: ${initialBootId}`);

  const baseDocRequests = documentReloadRequests;
  const baseAuthorize = authorizeCount;
  const baseCallback = callbackCount;
  const baseToken = tokenCount;

  // 3. Navegación Interna: Home -> Navigation -> Context -> Directives -> Guards
  console.log('\n--- 3. NAVEGACIÓN INTERNA EN SDK_DEMO (ANGULAR ROUTER EXCLUSIVO) ---');

  const steps = [
    { label: 'Navegación & Menús', expectedPath: '/navigation', file: 'evidence_step2_navigation.png' },
    { label: 'Contexto & BUs',    expectedPath: '/context',    file: 'evidence_step3_context.png' },
    { label: 'Directivas UI',     expectedPath: '/directives', file: 'evidence_step4_directives.png' },
    { label: 'Validación Guards', expectedPath: '/guards',     file: 'evidence_step5_guards.png' },
    { label: 'Inicio & Sesión',   expectedPath: '/home',       file: 'evidence_step6_return_home.png' }
  ];

  for (const step of steps) {
    console.log(`\nNavigating to: "${step.label}" (${step.expectedPath})...`);
    
    // Contadores antes del click
    const prevAuth = authorizeCount;
    const prevCallback = callbackCount;
    const prevToken = tokenCount;
    const prevDocs = documentReloadRequests;

    // Click en la opción del sidebar
    const link = page.locator(`.rui-sidebar a:has-text("${step.label}")`).first();
    await link.click();

    // Esperar a que la ruta cambie mediante Angular Router
    await page.waitForURL(`**${step.expectedPath}`, { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Verificar memoria de la instancia Angular (si recargara la página, esta variable desaparecería)
    const currentBootId = await page.evaluate(() => window.__SPA_BOOT_ID__);
    const isSameInstance = currentBootId === initialBootId;

    // Verificar que rui-shell y rui-topbar siguen montados en el DOM
    const shellPresent = await page.locator('rui-shell').count();
    const topbarPresent = await page.locator('rui-topbar').count();
    const sidebarPresent = await page.locator('rui-sidebar').count();

    console.log(` - URL actual: ${page.url()}`);
    console.log(` - Misma instancia SPA en memoria (sin reload): ${isSameInstance ? '✅ SÍ (' + currentBootId + ')' : '❌ NO'}`);
    console.log(` - Shell / Topbar / Sidebar presentes: ${shellPresent > 0 && topbarPresent > 0 && sidebarPresent > 0 ? '✅ SÍ' : '❌ NO'}`);

    // Verificar que NO hubo llamadas a SSO ni recargas HTTP
    const deltaAuth = authorizeCount - prevAuth;
    const deltaCallback = callbackCount - prevCallback;
    const deltaToken = tokenCount - prevToken;
    const deltaDocs = documentReloadRequests - prevDocs;

    console.log(` - Nuevas llamadas a /oauth2/authorize: ${deltaAuth} ${deltaAuth === 0 ? '✅' : '❌ FALLO'}`);
    console.log(` - Nuevas llamadas a /callback:         ${deltaCallback} ${deltaCallback === 0 ? '✅' : '❌ FALLO'}`);
    console.log(` - Nuevas llamadas a /oauth2/token:     ${deltaToken} ${deltaToken === 0 ? '✅' : '❌ FALLO'}`);
    console.log(` - Peticiones HTTP de documento nuevo: ${deltaDocs} ${deltaDocs === 0 ? '✅ (0 recargas)' : '❌ FALLO'}`);

    await page.screenshot({ path: `C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/${step.file}` });
  }

  // 4. Verificación Final de Métricas
  const docReloadsDuringNav = documentReloadRequests - baseDocRequests;
  console.log('\n================================================================');
  console.log('REPORTE FINAL DE AUDITORÍA DE RED Y NAVEGACIÓN');
  console.log('================================================================');
  console.log(`Total llamadas /oauth2/authorize en toda la sesión: ${authorizeCount} (Esperado: EXACTAMENTE 1)`);
  console.log(`Total llamadas /callback en toda la sesión:         ${callbackCount} (Esperado: EXACTAMENTE 1)`);
  console.log(`Total llamadas /oauth2/token en toda la sesión:     ${tokenCount} (Esperado: EXACTAMENTE 1)`);
  console.log(`Total pestañas en el navegador:                     ${context.pages().length} (Esperado: EXACTAMENTE 1)`);
  console.log(`Total recargas HTTP de documento durante navegación:${docReloadsDuringNav} (Esperado: EXACTAMENTE 0)`);

  const passed = (
    authorizeCount === 1 &&
    callbackCount === 1 &&
    tokenCount === 1 &&
    context.pages().length === 1 &&
    docReloadsDuringNav === 0
  );

  console.log(`\nESTADO GENERAL: ${passed ? '✅ 100% CUMPLIDO — CRITERIOS DE ACEPTACIÓN SATISFECHOS' : '❌ FALLO EN CRITERIOS'}`);
  console.log('================================================================');

  await browser.close();
}

validatePureSpaNavigation().catch(console.error);

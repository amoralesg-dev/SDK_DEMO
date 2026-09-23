import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';

async function main() {
  console.log('================================================================');
  console.log('  TEST PORTAL COMPLETO: PORTAL -> SDK_DEMO -> LOGOUT -> ATRÁS x2');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));

  // Monitorizar requests OAuth post-logout
  const interceptedRequests = [];
  let isMonitoring = false;
  page.on('request', req => {
    if (!isMonitoring) return;
    const url = req.url();
    if (url.includes('/oauth2/authorize') || url.includes('/callback') || url.includes('/oauth2/token')) {
      interceptedRequests.push({ url, method: req.method(), timestamp: new Date().toISOString() });
      console.warn('⚠️ [INTERCEPTED POST-LOGOUT NETWORK REQUEST]:', req.method(), url);
    }
  });

  // 1. Abrir Portal de Empleados
  console.log('--- PASO 1: Iniciar sesión en Portal de Empleados (4200) ---');
  await page.goto('http://localhost:4200/employee-portal/auth/login');
  await page.waitForTimeout(1000);
  
  // Login directo al backend para SSO
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'test_demo', password: 'Temporal2024' })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  const jsessionIdMatch = setCookie ? setCookie.match(/JSESSIONID=([^;]+)/) : null;
  const jsessionId = jsessionIdMatch ? jsessionIdMatch[1] : null;

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
  console.log('✓ Sesión SSO establecida con cookie JSESSIONID');

  // 2. Navegar a SDK Demo desde el portal (agrega http://localhost:4200 al historial de la pestaña)
  console.log('\n--- PASO 2: Navegar a SDK Demo (4205) desde el Portal ---');
  await page.goto('http://localhost:4205/');
  await page.waitForURL(url => url.pathname.includes('/home'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Usuario en SDK Demo /home:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_portal_flow_1_home.png') });

  // 3. Iniciar monitoreo y ejecutar Logout
  console.log('\n--- PASO 3: Ejecutar Logout ---');
  isMonitoring = true;
  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');

  // Esperar a que llegue a /logout
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Llegó a pantalla de sesión cerrada:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_portal_flow_2_logout.png') });

  // 4. Presionar Atrás una vez
  console.log('\n--- PASO 4: Presionar botón Atrás (1 VEZ) ---');
  await page.goBack();
  await page.waitForTimeout(1500);
  console.log('URL tras Atrás 1 vez:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_portal_flow_3_back1.png') });

  // 5. Presionar Atrás segunda vez (CASO CRÍTICO)
  console.log('\n--- PASO 5: Presionar botón Atrás (2 VECES - CASO CRÍTICO) ---');
  await page.goBack();
  await page.waitForTimeout(1500);
  console.log('URL tras Atrás 2 veces:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_portal_flow_4_back2.png') });

  // 6. Presionar Atrás cinco veces consecutivas
  console.log('\n--- PASO 6: Presionar botón Atrás (5 VECES) ---');
  for (let i = 1; i <= 5; i++) {
    try {
      await page.goBack();
      await page.waitForTimeout(300);
    } catch {
      break;
    }
  }
  await page.waitForTimeout(1000);
  console.log('URL tras Atrás 5 veces:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_portal_flow_5_back5.png') });

  // 7. Presionar Adelante
  console.log('\n--- PASO 7: Presionar botón Adelante ---');
  try {
    await page.goForward();
    await page.waitForTimeout(1000);
  } catch {}
  console.log('URL tras Adelante:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_portal_flow_6_forward.png') });

  // 8. Intentar abrir /home manualmente
  console.log('\n--- PASO 8: Intentar abrir http://localhost:4205/home manualmente ---');
  await page.goto('http://localhost:4205/home');
  await page.waitForTimeout(1500);
  console.log('URL tras abrir /home manualmente:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_portal_flow_7_manual_home.png') });

  // Auditoría final
  console.log('\n================================================================');
  console.log('  AUDITORÍA FINAL DE RED POST-LOGOUT:');
  console.log('================================================================');
  const authorizeCount = interceptedRequests.filter(r => r.url.includes('/oauth2/authorize')).length;
  const callbackCount = interceptedRequests.filter(r => r.url.includes('/callback')).length;
  const tokenCount = interceptedRequests.filter(r => r.url.includes('/oauth2/token')).length;

  console.log(`- Total /oauth2/authorize interceptados: ${authorizeCount} (Esperado: 0)`);
  console.log(`- Total /callback interceptados:          ${callbackCount} (Esperado: 0)`);
  console.log(`- Total /oauth2/token interceptados:      ${tokenCount} (Esperado: 0)`);

  const currentUrl = page.url();
  const isSafe = (authorizeCount === 0 && callbackCount === 0 && tokenCount === 0 && !currentUrl.includes('/home'));

  await browser.close();

  if (isSafe) {
    console.log('\n🎉 ¡VALIDACIÓN SATISFACTORIA! FLUJO COMPLETAMENTE SEGURO.');
    process.exit(0);
  } else {
    console.error('\n❌ VALIDACIÓN FALLIDA.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error running portal flow test:', err);
  process.exit(1);
});

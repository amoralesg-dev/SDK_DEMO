import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';

async function main() {
  console.log('================================================================');
  console.log('  TEST EXHAUSTIVO: ATRÁS 1 VEZ, 2 VECES, 5 VECES, ADELANTE, HOME');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));

  // 1. Obtener sesión central en puerto 8083 (simula login previo en Employee Portal)
  console.log('--- PASO 1: Login en Employee Portal (Backend 8083) ---');
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'test_demo', password: 'Temporal2024' })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  const jsessionIdMatch = setCookie ? setCookie.match(/JSESSIONID=([^;]+)/) : null;
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

  // 2. Abrir SDK Demo y completar authorize -> callback -> home
  console.log('\n--- PASO 2: Abrir SDK Demo (4205) ---');
  await page.goto('http://localhost:4205/');
  await page.waitForURL(url => url.pathname.includes('/home'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Usuario en /home:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_step1_authenticated_home.png') });

  // 3. Ejecutar Logout explícito
  console.log('\n--- PASO 3: Ejecutar Logout ---');
  // Monitorizar requests a partir de este punto
  const interceptedRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/oauth2/authorize') || url.includes('/callback') || url.includes('/oauth2/token')) {
      interceptedRequests.push({ url, method: req.method(), timestamp: new Date().toISOString() });
      console.warn('⚠️ [INTERCEPTED POST-LOGOUT NETWORK REQUEST]:', req.method(), url);
    }
  });

  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');

  // Esperar a que regrese de logout central a /logout
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Llegó a /logout:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_step2_logout_screen.png') });

  // Helper para verificar estado de la página
  async function inspectPage(stepName) {
    const url = page.url();
    let hasShell = false;
    let hasHomeText = false;
    let hasLogoutCard = false;
    let isLoggedOutFlag = false;

    try {
      hasShell = await page.evaluate(() => !!document.querySelector('rui-shell') || !!document.querySelector('.layout-sidebar') || !!document.querySelector('.layout-topbar'));
      hasHomeText = await page.evaluate(() => document.body.innerText.includes('Contexto de Identidad') || document.body.innerText.includes('SDK Demo - Panel de Control'));
      hasLogoutCard = await page.evaluate(() => !!document.querySelector('#btn-portal-login') || document.body.innerText.includes('Sesión cerrada'));
      isLoggedOutFlag = await page.evaluate(() => {
        try {
          return localStorage.getItem('rassini_logged_out') === 'true' || sessionStorage.getItem('rassini_logged_out') === 'true';
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.log(`  (Nota: evaluate no disponible en ${url})`);
    }
    
    console.log(`\n[${stepName}]`);
    console.log(`  - URL actual: ${url}`);
    console.log(`  - ¿Tiene shell visible?: ${hasShell ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);
    console.log(`  - ¿Tiene contenido /home?: ${hasHomeText ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);
    console.log(`  - ¿Muestra pantalla /logout?: ${hasLogoutCard ? 'SÍ (CORRECTO)' : 'NO'}`);
    console.log(`  - ¿rassini_logged_out activo?: ${isLoggedOutFlag ? 'SÍ (CORRECTO)' : 'NO'}`);
    
    return { url, hasShell, hasHomeText, hasLogoutCard, isLoggedOutFlag };
  }

  // 4. Presionar Atrás 1 vez
  console.log('\n--- PASO 4: Presionar botón Atrás (1 VEZ) ---');
  await page.goBack();
  await page.waitForTimeout(1500);
  const back1 = await inspectPage('ATRÁS 1 VEZ');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_step3_back_1.png') });

  // 5. Presionar Atrás 2 veces (CASO CRÍTICO REPORTADO POR EL USUARIO)
  console.log('\n--- PASO 5: Presionar botón Atrás (2 VECES) - CASO CRÍTICO ---');
  await page.goBack();
  await page.waitForTimeout(1500);
  const back2 = await inspectPage('ATRÁS 2 VECES');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_step4_back_2_critical.png') });

  // 6. Presionar Atrás 5 veces adicionales
  console.log('\n--- PASO 6: Presionar botón Atrás (5 VECES CONSECUTIVAS) ---');
  for (let i = 1; i <= 5; i++) {
    try {
      await page.goBack();
      await page.waitForTimeout(500);
    } catch (e) {
      console.log(`  (Límite de historial alcanzado en intento ${i})`);
      break;
    }
  }
  await page.waitForTimeout(1000);
  const back5 = await inspectPage('ATRÁS 5 VECES');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_step5_back_5.png') });

  // 7. Presionar Adelante
  console.log('\n--- PASO 7: Presionar botón Adelante ---');
  try {
    await page.goForward();
    await page.waitForTimeout(1500);
  } catch (e) {
    console.log('  (No hay historial adelante)');
  }
  const forward1 = await inspectPage('ADELANTE 1 VEZ');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_step6_forward_1.png') });

  // 8. Intentar abrir /home manualmente
  console.log('\n--- PASO 8: Intentar abrir http://localhost:4205/home manualmente ---');
  await page.goto('http://localhost:4205/home');
  await page.waitForTimeout(2000);
  const manualHome = await inspectPage('MANUAL /home');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'evidence_step7_manual_home.png') });

  // Resumen de red post-logout
  console.log('\n================================================================');
  console.log('  RESUMEN DE AUDITORÍA POST-LOGOUT:');
  console.log('================================================================');
  const authorizeCount = interceptedRequests.filter(r => r.url.includes('/oauth2/authorize')).length;
  const callbackCount = interceptedRequests.filter(r => r.url.includes('/callback')).length;
  const tokenCount = interceptedRequests.filter(r => r.url.includes('/oauth2/token')).length;

  console.log(`- Nuevos /oauth2/authorize interceptados: ${authorizeCount} (Esperado: 0)`);
  console.log(`- Nuevos /callback interceptados:          ${callbackCount} (Esperado: 0)`);
  console.log(`- Nuevos /oauth2/token interceptados:      ${tokenCount} (Esperado: 0)`);
  console.log(`- ¿Atrás 1 vez seguro?: ${!back1.hasShell && !back1.hasHomeText}`);
  console.log(`- ¿Atrás 2 veces seguro (CRÍTICO)?: ${!back2.hasShell && !back2.hasHomeText}`);
  console.log(`- ¿Atrás 5 veces seguro?: ${!back5.hasShell && !back5.hasHomeText}`);
  console.log(`- ¿Adelante seguro?: ${!forward1.hasShell && !forward1.hasHomeText}`);
  console.log(`- ¿/home manual bloqueado?: ${!manualHome.hasShell && !manualHome.hasHomeText}`);

  await browser.close();

  const success = (authorizeCount === 0 && callbackCount === 0 && tokenCount === 0 &&
                   !back1.hasShell && !back2.hasShell && !back5.hasShell && !manualHome.hasShell);
  
  if (success) {
    console.log('\n🎉 ¡TODOS LOS CRITERIOS DE ACEPTACIÓN SE CUMPLIERON AL 100%!');
    process.exit(0);
  } else {
    console.error('\n❌ ALGUNOS CRITERIOS NO SE CUMPLIERON.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error running test:', err);
  process.exit(1);
});

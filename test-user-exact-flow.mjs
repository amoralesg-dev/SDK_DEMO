import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';

async function main() {
  console.log('================================================================');
  console.log('  REPRODUCCIÓN EXACTA DEL FLUJO DEL USUARIO');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('[CONSOLE]', msg.text()));

  const interceptedRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/oauth2/authorize') || url.includes('/callback') || url.includes('/oauth2/token')) {
      interceptedRequests.push({ url, method: req.method(), time: new Date().toISOString() });
      console.warn('⚠️ [NETWORK REQUEST]:', req.method(), url);
    }
  });

  // 1. Iniciar sesión en Employee Portal (4200)
  console.log('--- PASO 1: Iniciar sesión en Employee Portal (4200) ---');
  await page.goto('http://localhost:4200/employee-portal/auth/login');
  await page.waitForTimeout(1000);

  // Iniciar sesión centralmente en el backend para obtener JSESSIONID SSO
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
  console.log('✓ Sesión iniciada con JSESSIONID:', jsessionId);

  // 2. Abrir SDK Demo (4205)
  console.log('\n--- PASO 2: Abrir SDK Demo (4205) ---');
  await page.goto('http://localhost:4205/');
  await page.waitForURL(url => url.pathname.includes('/home'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ SDK Demo abierto en:', page.url());

  // 3. Navegar por: Home, Context, Directives, Guards
  console.log('\n--- PASO 3: Navegar por Home -> Context -> Directives -> Guards ---');
  
  console.log('* Clic en Context...');
  await page.click('a[href*="context"]');
  await page.waitForTimeout(1000);
  console.log('  URL:', page.url());

  console.log('* Clic en Directives...');
  await page.click('a[href*="directives"]');
  await page.waitForTimeout(1000);
  console.log('  URL:', page.url());

  console.log('* Clic en Guards...');
  await page.click('a[href*="guards"]');
  await page.waitForTimeout(1000);
  console.log('  URL:', page.url());

  // 4. Ejecutar logout
  console.log('\n--- PASO 4: Ejecutar Logout ---');
  interceptedRequests.length = 0; // Limpiar histórico de red previo a logout
  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');

  // Esperar a que llegue a /logout
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Llegó a /logout:', page.url());

  // 5. Llegar al login corporativo (Clic en "Ir al Portal de Empleados")
  console.log('\n--- PASO 5: Llegar al login corporativo ---');
  await page.waitForSelector('#btn-portal-login', { state: 'visible' });
  await page.click('#btn-portal-login');
  await page.waitForURL(url => url.origin === 'http://localhost:4200' && url.pathname.includes('/auth/login'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Llegó al login corporativo:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'repro_step5_login_corporativo.png') });

  // Helper para inspeccionar estado
  async function inspectState(stepName) {
    const url = page.url();
    let hasShell = false;
    let hasHomeContent = false;
    let hasMenus = false;
    let isLoggedOutFlag = false;

    try {
      hasShell = await page.evaluate(() => !!document.querySelector('rui-shell') || !!document.querySelector('.layout-sidebar') || !!document.querySelector('.layout-topbar'));
      hasHomeContent = await page.evaluate(() => document.body.innerText.includes('Contexto de Identidad') || document.body.innerText.includes('SDK Demo - Panel de Control'));
      hasMenus = await page.evaluate(() => !!document.querySelector('.layout-menu') || document.body.innerText.includes('Navegación & Menús'));
      isLoggedOutFlag = await page.evaluate(() => {
        try {
          return localStorage.getItem('rassini_logged_out') === 'true' || sessionStorage.getItem('rassini_logged_out') === 'true';
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.log(`  (evaluate error en ${url}: ${e.message})`);
    }

    console.log(`\n[${stepName}]`);
    console.log(`  - URL exacta: ${url}`);
    console.log(`  - ¿Tiene shell visible?: ${hasShell}`);
    console.log(`  - ¿Tiene contenido /home?: ${hasHomeContent}`);
    console.log(`  - ¿Aparecen menús?: ${hasMenus}`);
    console.log(`  - ¿rassini_logged_out?: ${isLoggedOutFlag}`);

    return { url, hasShell, hasHomeContent, hasMenus, isLoggedOutFlag };
  }

  // 6. Presionar Atrás UNA vez
  console.log('\n--- PASO 6: Presionar Atrás UNA vez ---');
  await page.goBack();
  await page.waitForTimeout(2000);
  const back1 = await inspectState('ATRÁS 1 VEZ');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'repro_step6_back1.png') });

  // 7. Presionar Atrás una SEGUNDA vez
  console.log('\n--- PASO 7: Presionar Atrás una SEGUNDA vez ---');
  await page.goBack();
  await page.waitForTimeout(2000);
  const back2 = await inspectState('ATRÁS 2 VECES');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'repro_step7_back2.png') });

  // 8. Resumen de red y diagnóstico
  console.log('\n--- PASO 8: Diagnóstico de red post-logout ---');
  const authorizeRequests = interceptedRequests.filter(r => r.url.includes('/oauth2/authorize'));
  const callbackRequests = interceptedRequests.filter(r => r.url.includes('/callback'));
  const tokenRequests = interceptedRequests.filter(r => r.url.includes('/oauth2/token'));

  console.log(`- Total /oauth2/authorize interceptados: ${authorizeRequests.length}`);
  authorizeRequests.forEach(r => console.log(`    ${r.time} -> ${r.url}`));
  console.log(`- Total /callback interceptados: ${callbackRequests.length}`);
  callbackRequests.forEach(r => console.log(`    ${r.time} -> ${r.url}`));
  console.log(`- Total /oauth2/token interceptados: ${tokenRequests.length}`);
  tokenRequests.forEach(r => console.log(`    ${r.time} -> ${r.url}`));

  await browser.close();
}

main().catch(err => {
  console.error('Fatal error running repro test:', err);
  process.exit(1);
});

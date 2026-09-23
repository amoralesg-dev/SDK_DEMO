import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';

async function main() {
  console.log('========================================================================');
  console.log('  TEST MANUAL 100% FIEL: LOGIN UI -> MENU UI -> LOGOUT -> BACK x2');
  console.log('========================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const networkLog = [];
  page.on('request', req => {
    const url = req.url();
    const entry = { method: req.method(), url, time: new Date().toISOString() };
    networkLog.push(entry);
    if (url.includes('/oauth2/authorize') || url.includes('/callback') || url.includes('/oauth2/token') || url.includes('/logout')) {
      console.log(`  [NET REQ] ${req.method()} ${url}`);
    }
  });

  page.on('response', res => {
    const url = res.url();
    if (url.includes('/oauth2/authorize') || url.includes('/callback') || url.includes('/oauth2/token') || url.includes('/logout')) {
      console.log(`  [NET RES] ${res.status()} ${url}`);
    }
  });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[RASSINI') || text.includes('[AUTH') || text.includes('[SHELL') || text.includes('[CALLBACK]') || text.includes('[BOOTSTRAP]')) {
      console.log(`  [CONSOLE] ${text}`);
    }
  });

  // PASO 1: Login en Employee Portal mediante UI real
  console.log('--- PASO 1: Login en Employee Portal (4200) vía UI ---');
  await page.goto('http://localhost:4200/employee-portal/auth/login');
  await page.waitForSelector('input[pInputText]', { timeout: 10000 });

  await page.fill('input[pInputText]', 'test_demo');
  await page.fill('p-password input', 'Temporal2024');
  await page.click('button[pButton]');

  // Esperar a que ingrese al portal
  await page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 15000 });
  console.log('✓ URL tras login en Portal:', page.url());

  // PASO 2: Abrir SDK Demo (4205)
  console.log('\n--- PASO 2: Abrir SDK Demo (4205) ---');
  await page.goto('http://localhost:4205/');
  await page.waitForURL(url => url.pathname.includes('/home'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ SDK Demo cargado en:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'manual_step2_home.png') });

  // PASO 3: Navegar por Home -> Context -> Directives -> Guards
  console.log('\n--- PASO 3: Navegar por Home -> Context -> Directives -> Guards ---');
  
  console.log('* Navegando a Context...');
  await page.click('a[href*="context"]');
  await page.waitForURL(url => url.pathname.includes('/context'), { timeout: 10000 });
  await page.waitForTimeout(800);
  console.log('  URL:', page.url());

  console.log('* Navegando a Directives...');
  await page.click('a[href*="directives"]');
  await page.waitForURL(url => url.pathname.includes('/directives'), { timeout: 10000 });
  await page.waitForTimeout(800);
  console.log('  URL:', page.url());

  console.log('* Navegando a Guards...');
  await page.click('a[href*="guards"]');
  await page.waitForURL(url => url.pathname.includes('/guards'), { timeout: 10000 });
  await page.waitForTimeout(800);
  console.log('  URL:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'manual_step3_guards.png') });

  // PASO 4: Ejecutar Logout
  console.log('\n--- PASO 4: Ejecutar Logout ---');
  networkLog.length = 0; // Limpiar histórico de red para auditar POST-LOGOUT exclusivamente
  await page.click('.pi-sign-out');

  // Esperar a que llegue a /logout
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Pantalla de logout cargada:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'manual_step4_logout_screen.png') });

  // PASO 5: Llegar al login corporativo
  console.log('\n--- PASO 5: Llegar al login corporativo ---');
  await page.click('#btn-portal-login');
  await page.waitForURL(url => url.pathname.includes('/auth/login'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Llegó al login corporativo:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'manual_step5_portal_login.png') });

  // Helper de inspección
  async function auditCurrentState(stepLabel) {
    const url = page.url();
    let hasShell = false;
    let hasMenus = false;
    let hasHome = false;
    let isLoggedOutFlag = false;

    try {
      hasShell = await page.evaluate(() => !!document.querySelector('rui-shell') || !!document.querySelector('.layout-sidebar'));
      hasMenus = await page.evaluate(() => !!document.querySelector('.layout-menu') || document.body.innerText.includes('Navegación & Menús'));
      hasHome = await page.evaluate(() => document.body.innerText.includes('Contexto de Identidad') || document.body.innerText.includes('SDK Demo - Panel de Control'));
      isLoggedOutFlag = await page.evaluate(() => {
        try {
          return localStorage.getItem('rassini_logged_out') === 'true' || sessionStorage.getItem('rassini_logged_out') === 'true';
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.log(`  (evaluate en ${url}: ${e.message})`);
    }

    console.log(`\n[${stepLabel}]`);
    console.log(`  URL exacta        : ${url}`);
    console.log(`  Shell visible     : ${hasShell}`);
    console.log(`  Menús visibles    : ${hasMenus}`);
    console.log(`  Contenido /home   : ${hasHome}`);
    console.log(`  rassini_logged_out: ${isLoggedOutFlag}`);

    return { url, hasShell, hasMenus, hasHome, isLoggedOutFlag };
  }

  // PASO 6: Presionar Atrás UNA vez
  console.log('\n--- PASO 6: Presionar botón Atrás (1 VEZ) ---');
  await page.goBack();
  await page.waitForTimeout(2000);
  const back1 = await auditCurrentState('ATRÁS 1 VEZ');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'manual_step6_back1.png') });

  // PASO 7: Presionar Atrás SEGUNDA vez (CASO CRÍTICO REPORTADO)
  console.log('\n--- PASO 7: Presionar botón Atrás (2 VECES - CASO CRÍTICO) ---');
  await page.goBack();
  await page.waitForTimeout(2000);
  const back2 = await auditCurrentState('ATRÁS 2 VECES');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'manual_step7_back2.png') });

  // PASO 8: Mostrar diagnóstico exacto
  console.log('\n========================================================================');
  console.log('  PASO 8: AUDITORÍA EXACTA DE RED Y ESTADO');
  console.log('========================================================================');
  
  const authRequests = networkLog.filter(r => r.url.includes('/oauth2/authorize'));
  const cbRequests = networkLog.filter(r => r.url.includes('/callback'));
  const tokRequests = networkLog.filter(r => r.url.includes('/oauth2/token'));

  console.log(`1. URL exacta al segundo Atrás: ${back2.url}`);
  console.log(`2. Peticiones /oauth2/authorize posteriores al logout: ${authRequests.length}`);
  authRequests.forEach(r => console.log(`     -> ${r.time}: ${r.url}`));
  console.log(`3. Peticiones /callback posteriores al logout: ${cbRequests.length}`);
  cbRequests.forEach(r => console.log(`     -> ${r.time}: ${r.url}`));
  console.log(`4. Peticiones /oauth2/token posteriores al logout: ${tokRequests.length}`);
  tokRequests.forEach(r => console.log(`     -> ${r.time}: ${r.url}`));
  console.log(`5. Shell visible: ${back2.hasShell}`);
  console.log(`6. Menús visibles: ${back2.hasMenus}`);
  console.log(`7. Contenido /home visible: ${back2.hasHome}`);

  await browser.close();

  const isStrictlyClean = (authRequests.length === 0 && cbRequests.length === 0 && 
                           tokRequests.length === 0 && !back2.hasShell && !back2.hasMenus && !back2.hasHome);

  if (isStrictlyClean) {
    console.log('\n🎉 ¡RESULTADO: EL CASO CRÍTICO QUEDÓ RESUELTO AL 100%!');
    process.exit(0);
  } else {
    console.error('\n❌ RESULTADO: SE DETECTÓ RECONSTRUCCIÓN DE SESIÓN O VISTA PROTEGIDA.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

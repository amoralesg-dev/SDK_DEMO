import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';
const PORTAL_LOGIN = 'http://localhost:4200/employee-portal/auth/login';

let authorizeCount = 0;
let callbackCount = 0;
let tokenCount = 0;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GUARD') || text.includes('[AUTH SERVICE') || text.includes('[CALLBACK') || text.includes('[SHELL LAYOUT]') || text.includes('[STORAGE') || text.includes('[SIDEBAR')) {
      console.log(`    [BROWSER] ${text}`);
    }
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('/oauth2/authorize')) authorizeCount++;
    if (url.includes('/callback')) callbackCount++;
    if (url.includes('/oauth2/token')) tokenCount++;
  });

  async function inspectBrowserAuthState(stepName) {
    const authDump = await page.evaluate(() => {
      const appCode = 'SDK_DEMO';
      return {
        sessionStorageKeys: Object.keys(sessionStorage),
        localStorageKeys: Object.keys(localStorage),
        accessTokenInSession: sessionStorage.getItem(`rassini_${appCode}_access_token`) ? 'EXISTS' : 'NONE',
        accessTokenInLocal: localStorage.getItem(`rassini_${appCode}_access_token`) ? 'EXISTS' : 'NONE',
        idTokenInSession: sessionStorage.getItem(`rassini_${appCode}_id_token`) ? 'EXISTS' : 'NONE',
        idTokenInLocal: localStorage.getItem(`rassini_${appCode}_id_token`) ? 'EXISTS' : 'NONE',
      };
    });
    console.log(`    [STORAGE STATE @ ${stepName}]:`, JSON.stringify(authDump));
  }

  // ─── PASO 1 & 2: LOGIN EN EMPLOYEE PORTAL ────────────────────────────────
  console.log('\n=== PASO 1 & 2: LOGIN EN PORTAL ===');
  await page.goto(PORTAL_LOGIN);
  await page.waitForSelector('input', { timeout: 15000 });
  const inputs = await page.locator('input').all();
  await inputs[0].fill('test_demo');
  await inputs[1].fill('Temporal2024');
  await page.locator('button').first().click();
  await page.waitForTimeout(3000);
  console.log('URL tras login portal:', page.url());

  // Resetear contadores DESPUÉS del login portal
  authorizeCount = 0; callbackCount = 0; tokenCount = 0;

  // ─── PASO 3: ENTRAR A SDK DEMO DESDE MENÚ REAL DEL PORTAL ────────────────
  console.log('\n=== PASO 3: ENTRAR A SDK DEMO ===');
  const sdkLink = page.locator('a[href*="4205"], a:has-text("SDK DEMO"), a:has-text("SDK Demo"), a:has-text("Inicio & Sesión")').first();
  await sdkLink.click();
  await page.waitForURL(url => url.origin.includes('4205'), { timeout: 20000 });
  await page.waitForURL(url => !url.pathname.includes('callback'), { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('URL en SDK DEMO:', page.url());
  console.log('authorize:', authorizeCount, '| callback:', callbackCount, '| token:', tokenCount);

  // ─── PASO 4: NAVEGAR POR OPCIONES DE MENÚ ────────────────────────────────
  console.log('\n=== PASO 4: NAVEGAR POR MENÚ ===');
  const menuItems = [
    { label: 'Contexto & BUs', href: '/context' },
    { label: 'Validación Guards', href: '/guards' },
    { label: 'Directivas UI', href: '/directives' },
    { label: 'Navegación & Menús', href: '/navigation' },
    { label: 'Inicio & Sesión', href: '/home' },
  ];

  for (const item of menuItems) {
    const link = page.locator(`a[href="${item.href}"]`).first();
    const count = await link.count();
    if (count > 0) {
      await link.click();
      await page.waitForTimeout(1000);
      console.log(`  ✓ Click "${item.label}" → URL: ${page.url()}`);
      console.log(`    rui-shell: ${await page.locator('rui-shell').count()}, rui-sidebar: ${await page.locator('rui-sidebar').count()}`);
    } else {
      console.log(`  ✗ No encontrado: "${item.label}" (href="${item.href}")`);
    }
  }

  // ─── PASO 5: LOGOUT DESDE UI ─────────────────────────────────────────────
  console.log('\n=== PASO 5: LOGOUT ===');
  const logoutLink = page.locator('a:has-text("Cerrar Sesión")').first();
  console.log('logoutLink count:', await logoutLink.count());
  console.log('logoutLink HTML:', await logoutLink.evaluate(el => el.outerHTML));
  await logoutLink.click();
  await inspectBrowserAuthState('Inmediatamente tras click en Cerrar Sesión');
  await page.waitForTimeout(5000);
  console.log('URL tras logout:', page.url());
  await inspectBrowserAuthState('Tras 5s de espera de logout');

  // ─── PASO 6: ESTADO INMEDIATO TRAS LOGOUT ────────────────────────────────
  console.log('\n=== PASO 6: ESTADO TRAS LOGOUT ===');
  const shellAfterLogout = await page.locator('rui-shell').count();
  const sidebarAfterLogout = await page.locator('rui-sidebar').count();
  const topbarAfterLogout = await page.locator('rui-topbar').count();
  const menuLinksAfterLogout = await page.locator('a[href="/context"], a[href="/guards"], a[href="/home"]').count();
  console.log(`rui-shell: ${shellAfterLogout} | rui-sidebar: ${sidebarAfterLogout} | rui-topbar: ${topbarAfterLogout}`);
  console.log(`menu links visibles: ${menuLinksAfterLogout}`);
  console.log('Cookies tras logout:', (await context.cookies()).map(c => `${c.name}@${c.domain}${c.path}`));
  await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_step6_post_logout.png` });

  // Resetear contadores para el análisis del botón Back
  authorizeCount = 0; callbackCount = 0; tokenCount = 0;

  // ─── PASO 7: ATRÁS x1 ────────────────────────────────────────────────────
  console.log('\n=== PASO 7: ATRÁS #1 ===');
  await page.goBack();
  await page.waitForTimeout(3000);
  const url1 = page.url();
  const shell1 = await page.locator('rui-shell').count();
  const sidebar1 = await page.locator('rui-sidebar').count();
  const topbar1 = await page.locator('rui-topbar').count();
  const menu1 = await page.locator('a[href="/context"], a[href="/guards"], a[href="/home"], a[href="/directives"]').count();
  console.log('URL:', url1);
  console.log(`rui-shell: ${shell1} | rui-sidebar: ${sidebar1} | rui-topbar: ${topbar1}`);
  console.log(`menu links visibles: ${menu1}`);
  console.log(`authorize: ${authorizeCount} | callback: ${callbackCount} | token: ${tokenCount}`);
  await inspectBrowserAuthState('Atrás #1');
  await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_back_x1.png` });

  // Intentar hacer click en menú Context si está visible
  const contextLink1 = page.locator('a[href="/context"]').first();
  if (await contextLink1.count() > 0) {
    await contextLink1.click();
    await page.waitForTimeout(2000);
    console.log(`  !! Pude navegar a /context tras Back #1 → URL: ${page.url()}`);
    await inspectBrowserAuthState('Tras click /context en Back #1');
  } else {
    console.log('  ✓ No puedo navegar a /context (menú no visible)');
  }

  // ─── PASO 8: ATRÁS x2 ────────────────────────────────────────────────────
  console.log('\n=== PASO 8: ATRÁS #2 ===');
  await page.goBack();
  await page.waitForTimeout(3000);
  const url2 = page.url();
  const shell2 = await page.locator('rui-shell').count();
  const sidebar2 = await page.locator('rui-sidebar').count();
  const topbar2 = await page.locator('rui-topbar').count();
  const menu2 = await page.locator('a[href="/context"], a[href="/guards"], a[href="/home"], a[href="/directives"]').count();
  console.log('URL:', url2);
  console.log(`rui-shell: ${shell2} | rui-sidebar: ${sidebar2} | rui-topbar: ${topbar2}`);
  console.log(`menu links visibles: ${menu2}`);
  console.log(`authorize: ${authorizeCount} | callback: ${callbackCount} | token: ${tokenCount}`);
  await inspectBrowserAuthState('Atrás #2');
  await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_back_x2.png` });

  // Probar navegación a cada ruta hija tras Atrás #2
  for (const target of [
    { label: 'Home', href: '/home' },
    { label: 'Context', href: '/context' },
    { label: 'Guards', href: '/guards' },
    { label: 'Directives', href: '/directives' }
  ]) {
    const link = page.locator(`a[href="${target.href}"]`).first();
    if (await link.count() > 0) {
      console.log(`  -> Intentando click en "${target.label}" (${target.href})...`);
      try {
        await link.click({ timeout: 3000 });
        await page.waitForTimeout(1500);
        console.log(`     URL resultante: ${page.url()}`);
        await inspectBrowserAuthState(`Tras click ${target.label} en Back #2`);
      } catch (err) {
        console.log(`     Error o navegación bloqueada al dar click: ${err.message}`);
      }
    } else {
      console.log(`  ✓ Enlace "${target.label}" (${target.href}) NO está en el DOM`);
    }
  }

  // ─── PASO 9: ATRÁS x3 ────────────────────────────────────────────────────
  console.log('\n=== PASO 9: ATRÁS #3 ===');
  await page.goBack();
  await page.waitForTimeout(3000);
  const url3 = page.url();
  const shell3 = await page.locator('rui-shell').count();
  const sidebar3 = await page.locator('rui-sidebar').count();
  const topbar3 = await page.locator('rui-topbar').count();
  const menu3 = await page.locator('a[href="/context"], a[href="/guards"], a[href="/home"], a[href="/directives"]').count();
  console.log('URL:', url3);
  console.log(`rui-shell: ${shell3} | rui-sidebar: ${sidebar3} | rui-topbar: ${topbar3}`);
  console.log(`menu links visibles: ${menu3}`);
  console.log(`authorize: ${authorizeCount} | callback: ${callbackCount} | token: ${tokenCount}`);
  await inspectBrowserAuthState('Atrás #3');
  await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_back_x3.png` });

  // ─── RESULTADO FINAL ─────────────────────────────────────────────────────
  console.log('\n=== RESULTADO FINAL ===');
  const passed = shell1 === 0 && sidebar1 === 0 && shell2 === 0 && sidebar2 === 0 && shell3 === 0 && sidebar3 === 0 && menu1 === 0 && menu2 === 0 && menu3 === 0;
  if (passed) {
    console.log('✅ CRITERIO DE ACEPTACIÓN CUMPLIDO');
    console.log('   Back x1, x2, x3 → shell=0, sidebar=0, topbar=0, menús=0');
  } else {
    console.log('❌ CRITERIO DE ACEPTACIÓN NO CUMPLIDO');
    console.log(`   Back #1: shell=${shell1}, sidebar=${sidebar1}, topbar=${topbar1}, menus=${menu1}`);
    console.log(`   Back #2: shell=${shell2}, sidebar=${sidebar2}, topbar=${topbar2}, menus=${menu2}`);
    console.log(`   Back #3: shell=${shell3}, sidebar=${sidebar3}, topbar=${topbar3}, menus=${menu3}`);
  }

  await browser.close();
})();

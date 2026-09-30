/**
 * E2E Test Suite V3:
 * 1. Test Sidebar Logout single-click functionality.
 * 2. Test Header Logout single-click functionality.
 * 3. Test Back x1 to x10 and Forward x1 to x10 after logout.
 * 4. Verify ZERO visual shell/sidebar revival (rui-shell count === 0 on port 4205 when unauthenticated).
 * 5. Verify no silent re-login (callbacks = 0, tokens = 0).
 */
import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';
const PORTAL_LOGIN = 'http://localhost:4200/employee-portal/auth/login';
const SDK_ORIGIN   = 'http://localhost:4205';

let counters = { authorize: 0, callback: 0, token: 0, connectLogout: 0 };
function resetCounters() {
  counters = { authorize: 0, callback: 0, token: 0, connectLogout: 0 };
}

const results = [];
function pass(label) { results.push({ label, status: '✅ PASS' }); console.log(`  ✅ PASS: ${label}`); }
function fail(label, detail) { results.push({ label, status: `❌ FAIL — ${detail}` }); console.log(`  ❌ FAIL: ${label} — ${detail}`); }

async function getAuthState(page) {
  return page.evaluate(() => {
    const code = 'SDK_DEMO';
    return {
      accessToken: sessionStorage.getItem(`rassini_${code}_access_token`) || localStorage.getItem(`rassini_${code}_access_token`) || null,
      idToken: sessionStorage.getItem(`rassini_${code}_id_token`) || localStorage.getItem(`rassini_${code}_id_token`) || null,
      currentUser: sessionStorage.getItem(`rassini_${code}_current_user`) || localStorage.getItem(`rassini_${code}_current_user`) || null,
    };
  }).catch(() => ({ accessToken: null, idToken: null, currentUser: null }));
}

async function loginAndEnterSdk(page) {
  console.log('  -> Iniciando login en Portal...');
  await page.goto(PORTAL_LOGIN, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input', { timeout: 15000 });
  const inputs = await page.locator('input').all();
  await inputs[0].fill('test_demo');
  await inputs[1].fill('Temporal2024');
  await page.locator('button[type="submit"], button').first().click();
  await page.waitForTimeout(4000);

  console.log('  -> Haciendo click en opción SDK DEMO...');
  const sdkLink = page.locator('a[href*="4205"], a:has-text("SDK DEMO")').first();
  await sdkLink.click();
  await page.waitForURL(url => url.origin.includes('4205'), { timeout: 20000 });
  await page.waitForURL(url => !url.pathname.includes('callback'), { timeout: 20000 });
  await page.waitForTimeout(2000);
  console.log('  -> SDK DEMO cargado en:', page.url());
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', req => {
    const url = req.url();
    if (url.includes('/oauth2/authorize')) counters.authorize++;
    if (url.includes('/callback'))        counters.callback++;
    if (url.includes('/oauth2/token'))    counters.token++;
    if (url.includes('/connect/logout'))  counters.connectLogout++;
  });

  page.on('console', msg => {
    const t = msg.text();
    if (['[GUARD', '[AUTH SERVICE', '[CALLBACK', '[SHELL', '[SESSION BOOTSTRAP', '[SIDEBAR'].some(p => t.includes(p))) {
      console.log(`    [BROWSER] ${t}`);
    }
  });

  try {
    // ═══════════════════════════════════════════════════════════════
    // TEST 1: SIDEBAR LOGOUT SINGLE CLICK
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════════════');
    console.log('TEST 1: LOGOUT DESDE SIDEBAR AL PRIMER CLIC');
    console.log('══════════════════════════════════════════════════');

    await loginAndEnterSdk(page);

    resetCounters();

    // Localizar botón de logout en el sidebar
    const sidebarLogout = page.locator('rui-sidebar a:has-text("Cerrar Sesión"), .layout-sidebar a:has-text("Cerrar Sesión")').first();
    const countSidebarLogout = await sidebarLogout.count();
    if (countSidebarLogout === 0) {
      fail('T1-Sidebar Logout Encontrado', 'No se encontró el enlace en el sidebar');
    } else {
      console.log('  -> Haciendo exactamente 1 solo clic en Cerrar Sesión del sidebar...');
      await sidebarLogout.click();
      
      try {
        await page.waitForURL(url => url.href.includes('4200') && url.pathname.includes('/auth/login'), { timeout: 15000 });
        console.log('  -> Redirigido exitosamente a:', page.url());
        if (counters.connectLogout >= 1) {
          pass('T1-Sidebar Logout 1 Solo Clic → /connect/logout ejecutado y redirigido a Login Portal');
        } else {
          fail('T1-Sidebar Logout', 'No se llamó a /connect/logout');
        }
      } catch (err) {
        fail('T1-Sidebar Logout 1 Solo Clic', `Timeout esperando redirección a login: ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 2: HEADER LOGOUT SINGLE CLICK
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════════════');
    console.log('TEST 2: LOGOUT DESDE HEADER AL PRIMER CLIC');
    console.log('══════════════════════════════════════════════════');

    await loginAndEnterSdk(page);

    // Navegar internamente por varias rutas para crear historial profundo
    console.log('  -> Generando historial de navegación en SDK_DEMO...');
    const navItems = ['/context', '/navigation', '/guards', '/directives', '/home'];
    for (const route of navItems) {
      const link = page.locator(`a[href="${route}"]`).first();
      if (await link.count() > 0) {
        await link.click();
        await page.waitForTimeout(1000);
      }
    }

    resetCounters();

    // Localizar icono de logout en el topbar/header
    const headerLogout = page.locator('rui-topbar .pi-sign-out, .layout-topbar .pi-sign-out').first();
    const countHeaderLogout = await headerLogout.count();
    if (countHeaderLogout === 0) {
      fail('T2-Header Logout Encontrado', 'No se encontró el botón pi-sign-out en el header');
    } else {
      console.log('  -> Haciendo exactamente 1 solo clic en el icono de salir del header...');
      await headerLogout.click();

      try {
        await page.waitForURL(url => url.href.includes('4200') && url.pathname.includes('/auth/login'), { timeout: 15000 });
        console.log('  -> Redirigido exitosamente a:', page.url());
        if (counters.connectLogout >= 1) {
          pass('T2-Header Logout 1 Solo Clic → /connect/logout ejecutado y redirigido a Login Portal');
        } else {
          fail('T2-Header Logout', 'No se llamó a /connect/logout');
        }
      } catch (err) {
        fail('T2-Header Logout 1 Solo Clic', `Timeout: ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 3: BACK x1 HASTA x10 DESPUÉS DEL LOGOUT
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════════════');
    console.log('TEST 3: BACK x1 HASTA x10 (VERIFICACIÓN BFCACHE Y SHELL REVIVAL)');
    console.log('══════════════════════════════════════════════════');

    resetCounters();
    let visualRevivalDetected = false;

    for (let i = 1; i <= 10; i++) {
      console.log(`\n--- [BACK #${i}] ---`);
      await page.goBack();
      await page.waitForTimeout(2500);

      const currentUrl = page.url();
      const shellCount = await page.locator('rui-shell').count();
      const sidebarCount = await page.locator('rui-sidebar').count();
      const topbarCount = await page.locator('rui-topbar').count();
      const onSdkPort = currentUrl.includes('4205');
      const authState = await getAuthState(page);

      console.log(`  URL: ${currentUrl}`);
      console.log(`  onSdkPort: ${onSdkPort} | shell: ${shellCount} | sidebar: ${sidebarCount} | topbar: ${topbarCount}`);
      console.log(`  tokens: accessToken=${!!authState.accessToken} | idToken=${!!authState.idToken}`);

      if (onSdkPort && (shellCount > 0 || sidebarCount > 0 || topbarCount > 0)) {
        console.log(`  ❌ ALERTA: Shell/Sidebar visible en SDK_DEMO sin sesión!`);
        visualRevivalDetected = true;
        await page.screenshot({ path: `${ARTIFACT_DIR}/revival_back_${i}.png` });
      }

      if (counters.callback > 0 || counters.token > 0) {
        console.log(`  ❌ ALERTA: Backend emitió tokens silenciosos en Back #${i}!`);
      }
    }

    if (!visualRevivalDetected && counters.callback === 0 && counters.token === 0) {
      pass('T3-Back x1 a x10 sin revival visual ni re-emisión de tokens');
    } else {
      fail('T3-Back x1 a x10', `Revival=${visualRevivalDetected} | callbacks=${counters.callback} | tokens=${counters.token}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST 4: FORWARD x1 HASTA x10
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════════════');
    console.log('TEST 4: FORWARD x1 HASTA x10');
    console.log('══════════════════════════════════════════════════');

    let fwdRevivalDetected = false;
    for (let i = 1; i <= 10; i++) {
      console.log(`\n--- [FORWARD #${i}] ---`);
      await page.goForward();
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      const shellCount = await page.locator('rui-shell').count();
      const sidebarCount = await page.locator('rui-sidebar').count();
      const onSdkPort = currentUrl.includes('4205');

      console.log(`  URL: ${currentUrl} | onSdkPort: ${onSdkPort} | shell: ${shellCount} | sidebar: ${sidebarCount}`);
      if (onSdkPort && (shellCount > 0 || sidebarCount > 0)) {
        console.log(`  ❌ ALERTA: Shell visible en Forward #${i}!`);
        fwdRevivalDetected = true;
      }
    }

    if (!fwdRevivalDetected && counters.callback === 0 && counters.token === 0) {
      pass('T4-Forward x1 a x10 sin revival visual ni re-emisión de tokens');
    } else {
      fail('T4-Forward x1 a x10', `Revival=${fwdRevivalDetected} | callbacks=${counters.callback} | tokens=${counters.token}`);
    }

  } catch (err) {
    console.error('Error durante ejecución de pruebas:', err);
  } finally {
    await browser.close();
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('RESUMEN FINAL DE RESULTADOS');
  console.log('══════════════════════════════════════════════════');
  for (const r of results) {
    console.log(`  ${r.status} : ${r.label}`);
  }
})();

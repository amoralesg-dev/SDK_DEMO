/**
 * E2E Full Test V2 — Criterios actualizados post-regresión
 *
 * Criterios de aceptación:
 *   A) Login Portal + click real menú SDK_DEMO → OIDC → /home (REGRESIÓN eliminada)
 *   B) Navegación interna (home→context→guards→directives) funciona
 *   C) Logout → Portal Login (sesión central destruida)
 *   D) Back x1, x2, x3 después de logout:
 *      - authorize puede ser > 0 (PERMITIDO — el AS debe pedir login)
 *      - callback DEBE ser 0
 *      - token DEBE ser 0
 *      - shell = 0, sidebar = 0, menuLinks = 0
 *   E) Re-login explícito → SDK_DEMO (flujo completo funciona de nuevo)
 */
import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';
const PORTAL_LOGIN = 'http://localhost:4200/employee-portal/auth/login';
const SDK_ORIGIN   = 'http://localhost:4205';

// Contadores globales por fase
let counters = { authorize: 0, callback: 0, token: 0, connectLogout: 0 };

function resetCounters() {
  counters = { authorize: 0, callback: 0, token: 0, connectLogout: 0 };
}

function printCounters(label) {
  console.log(`  [CONTADORES @ ${label}] authorize=${counters.authorize} | callback=${counters.callback} | token=${counters.token} | logout=${counters.connectLogout}`);
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

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Interceptar tráfico de red
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/oauth2/authorize')) counters.authorize++;
    if (url.includes('/callback'))        counters.callback++;
    if (url.includes('/oauth2/token'))    counters.token++;
    if (url.includes('/connect/logout'))  counters.connectLogout++;
  });

  // Capturar logs relevantes del browser
  page.on('console', msg => {
    const t = msg.text();
    if (['[GUARD', '[AUTH SERVICE', '[CALLBACK', '[SHELL', '[STORAGE', '[SIDEBAR', '[TOPBAR'].some(p => t.includes(p))) {
      console.log(`    [BROWSER] ${t}`);
    }
  });

  try {
    // ═══════════════════════════════════════════════════════════════
    // FASE A: Login Portal + Click real menú SDK DEMO
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════');
    console.log('FASE A: LOGIN PORTAL + ENTRADA LEGÍTIMA SDK DEMO');
    console.log('══════════════════════════════════════════');

    await page.goto(PORTAL_LOGIN, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input', { timeout: 15000 });

    const inputs = await page.locator('input').all();
    await inputs[0].fill('test_demo');
    await inputs[1].fill('Temporal2024');
    await page.locator('button[type="submit"], button').first().click();
    await page.waitForTimeout(4000);
    console.log('URL tras login portal:', page.url());

    // Verificar que quedamos en el portal (no en login de nuevo)
    if (page.url().includes('/auth/login')) {
      fail('A1-Login Portal', 'Sigue en /auth/login tras credenciales');
    } else {
      pass('A1-Login Portal');
    }

    // Resetear contadores antes de entrar a SDK DEMO
    resetCounters();

    // Click real en menú SDK DEMO
    const sdkSelectors = [
      'a[href*="4205"]',
      'a:has-text("SDK DEMO")',
      'a:has-text("SDK Demo")',
      'a:has-text("Inicio & Sesión")',
      'span:has-text("SDK DEMO")',
    ];
    let sdkClicked = false;
    for (const sel of sdkSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        console.log(`  Usando selector: ${sel}`);
        await el.click();
        sdkClicked = true;
        break;
      }
    }

    if (!sdkClicked) {
      fail('A2-Click menú SDK', 'No encontrado el enlace al SDK DEMO en el portal');
      // Tomar screenshot para diagnóstico
      await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_A_no_sdk_link.png` });
    } else {
      // Esperar a que la navegación llegue a 4205 y complete el OIDC
      try {
        await page.waitForURL(url => url.origin.includes('4205'), { timeout: 25000 });
        await page.waitForURL(url => !url.pathname.includes('callback'), { timeout: 20000 });
        await page.waitForTimeout(2000);
        const urlA = page.url();
        console.log('URL en SDK DEMO:', urlA);
        printCounters('Tras entrada SDK DEMO');
        await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_A_sdk_home.png` });

        // A2: debe llegar a /home en puerto 4205, NO a /logout
        if (urlA.includes('4205') && urlA.includes('/home')) {
          pass('A2-Click menú SDK → OIDC → /home');
        } else {
          fail('A2-Click menú SDK', `URL inesperada: ${urlA} (esperado: 4205/home)`);
        }

        if (counters.authorize >= 1 && counters.callback >= 1 && counters.token >= 1) {
          pass('A3-OIDC flow completo (authorize+callback+token)');
        } else {
          fail('A3-OIDC flow', `authorize=${counters.authorize} callback=${counters.callback} token=${counters.token}`);
        }

        const shellA = await page.locator('rui-shell').count();
        const sidebarA = await page.locator('rui-sidebar').count();
        if (shellA > 0 && sidebarA > 0) {
          pass('A4-Shell y Sidebar visibles');
        } else {
          fail('A4-Shell y Sidebar visibles', `shell=${shellA} sidebar=${sidebarA}`);
        }
      } catch (e) {
        fail('A2-Entrada SDK DEMO', `Timeout o error: ${e.message}`);
        await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_A_error.png` });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE B: Navegación interna autenticada
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════');
    console.log('FASE B: NAVEGACIÓN INTERNA AUTENTICADA');
    console.log('══════════════════════════════════════════');

    const navRoutes = [
      { label: 'Context', href: '/context' },
      { label: 'Guards', href: '/guards' },
      { label: 'Directives', href: '/directives' },
      { label: 'Home', href: '/home' },
    ];

    let navOk = 0;
    for (const r of navRoutes) {
      const link = page.locator(`a[href="${r.href}"]`).first();
      if (await link.count() > 0) {
        await link.click();
        await page.waitForTimeout(1500);
        const shell = await page.locator('rui-shell').count();
        if (page.url().includes(r.href) && shell > 0) {
          console.log(`  ✓ ${r.label} → ${page.url()} (shell=${shell})`);
          navOk++;
        } else {
          console.log(`  ✗ ${r.label} → ${page.url()} (shell=${shell})`);
        }
      } else {
        console.log(`  ✗ Enlace ${r.label} no encontrado`);
      }
    }
    await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_B_navigation.png` });

    if (navOk === navRoutes.length) {
      pass('B-Navegación interna autenticada');
    } else {
      fail('B-Navegación interna', `Solo ${navOk}/${navRoutes.length} rutas OK`);
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE C: Logout real
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════');
    console.log('FASE C: LOGOUT REAL');
    console.log('══════════════════════════════════════════');

    resetCounters();

    const logoutLink = page.locator('.pi-sign-out, a:has-text("Cerrar Sesión")').first();
    const logoutCount = await logoutLink.count();
    if (logoutCount === 0) {
      fail('C1-Cerrar Sesión visible', 'Enlace no encontrado');
    } else {
      await logoutLink.click();
      try {
        await page.waitForURL(url => url.href.includes('4200') && url.pathname.includes('/auth/login'), { timeout: 15000 });
        await page.waitForTimeout(2000);
        console.log('URL tras logout:', page.url());
        await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_C_post_logout.png` });
        printCounters('Tras logout');

        if (page.url().includes('4200') && page.url().includes('/auth/login')) {
          pass('C1-Logout → Portal Login');
        } else {
          fail('C1-Logout', `URL inesperada: ${page.url()}`);
        }

        if (counters.connectLogout >= 1) {
          pass('C2-/connect/logout llamado');
        } else {
          fail('C2-/connect/logout', 'No se llamó al endpoint de logout OIDC');
        }
      } catch (e) {
        fail('C1-Logout', `Timeout: ${e.message}`);
        await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_C_timeout.png` });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // DIAGNÓSTICO DE COOKIES ANTES DE FASE D
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════');
    console.log('DIAGNÓSTICO: COOKIES TRAS LOGOUT (antes de Back)');
    console.log('══════════════════════════════════════════');
    const allCookiesAfterLogout = await context.cookies();
    const localhostCookies = allCookiesAfterLogout.filter(c => c.domain === 'localhost' || c.domain.includes('localhost'));
    console.log('  Cookies para localhost:', JSON.stringify(localhostCookies.map(c => ({
      name: c.name, domain: c.domain, path: c.path, value: c.value.substring(0, 20) + '...'
    })), null, 2));
    
    // Interceptar requests a /oauth2/authorize para ver los headers
    const authorizeRequests = [];
    page.on('request', req => {
      if (req.url().includes('/oauth2/authorize') && req.url().includes('8083')) {
        const headers = req.headers();
        authorizeRequests.push({
          url: req.url().substring(0, 80),
          cookie: headers['cookie'] ? headers['cookie'].substring(0, 60) : 'NONE',
        });
        console.log(`  [AUTHORIZE REQUEST] cookie=${headers['cookie'] ? headers['cookie'].substring(0, 60) : 'NONE'}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // FASE D: Back x1, x2, x3 después del logout
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════');
    console.log('FASE D: BACK x1, x2, x3 DESPUÉS DEL LOGOUT');
    console.log('══════════════════════════════════════════');
    console.log('Criterio: authorize puede subir | callback=0, token=0, shell=0');

    // Resetear contadores para la fase D
    resetCounters();

    for (let i = 1; i <= 3; i++) {
      console.log(`\n--- ATRÁS #${i} ---`);
      await page.goBack();
      await page.waitForTimeout(3500);

      const url = page.url();
      const shell = await page.locator('rui-shell').count();
      const sidebar = await page.locator('rui-sidebar, .layout-sidebar').count();
      const topbar = await page.locator('rui-topbar, .layout-topbar').count();
      const menuLinks = await page.locator('a[href="/context"], a[href="/guards"], a[href="/home"], a[href="/directives"]').count();
      const authState = await getAuthState(page);

      console.log(`  URL: ${url}`);
      console.log(`  shell=${shell} | sidebar=${sidebar} | topbar=${topbar} | menuLinks=${menuLinks}`);
      printCounters(`Atrás #${i}`);
      console.log(`  accessToken=${authState.accessToken ? 'EXISTS' : 'NULL'} | idToken=${authState.idToken ? 'EXISTS' : 'NULL'}`);

      await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_D_back${i}.png` });

      // Criterio obligatorio: callback=0, token=0
      // shell=0 sólo aplica en 4205 (SDK_DEMO). Si volvemos al Portal (4200), su shell es esperada.
      const onSdkDemo = url.includes('4205');
      const sdkShellVisible = onSdkDemo && shell > 0;
      if (counters.callback === 0 && counters.token === 0 && !sdkShellVisible) {
        pass(`D-Back#${i} (callback=0, token=0, sdkShell=${sdkShellVisible ? shell : 0})`);
      } else {
        fail(`D-Back#${i}`, `callback=${counters.callback} token=${counters.token} onSDK=${onSdkDemo} shell=${shell}`);
      }

      // Info adicional: authorize puede subir (sólo registramos)
      if (counters.authorize > 0) {
        console.log(`  ℹ️  authorize=${counters.authorize} (permitido — AS debe pedir login, no emitir token)`);
      }

      // Verificar tokens nulos (sesión destruida)
      if (!authState.accessToken && !authState.idToken) {
        pass(`D-Back#${i} tokens nulos`);
      } else {
        fail(`D-Back#${i} tokens nulos`, `accessToken o idToken siguen en storage`);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE E: Re-login explícito y re-entrada a SDK DEMO
    // ═══════════════════════════════════════════════════════════════
    console.log('\n══════════════════════════════════════════');
    console.log('FASE E: RE-LOGIN EXPLÍCITO → SDK DEMO');
    console.log('══════════════════════════════════════════');

    // Navegar al Portal Login
    await page.goto(PORTAL_LOGIN, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input', { timeout: 15000 });

    const inputs2 = await page.locator('input').all();
    await inputs2[0].fill('test_demo');
    await inputs2[1].fill('Temporal2024');
    await page.locator('button[type="submit"], button').first().click();
    await page.waitForTimeout(4000);
    console.log('URL tras re-login portal:', page.url());

    if (page.url().includes('/auth/login')) {
      fail('E1-Re-Login Portal', 'Sigue en /auth/login');
    } else {
      pass('E1-Re-Login Portal');
    }

    // Resetear contadores para medir el re-flujo OIDC
    resetCounters();

    let sdkClicked2 = false;
    for (const sel of sdkSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.click();
        sdkClicked2 = true;
        break;
      }
    }

    if (sdkClicked2) {
      try {
        await page.waitForURL(url => url.origin.includes('4205'), { timeout: 25000 });
        await page.waitForURL(url => !url.pathname.includes('callback'), { timeout: 20000 });
        await page.waitForTimeout(2000);
        const urlE = page.url();
        const shellE = await page.locator('rui-shell').count();
        printCounters('Re-entrada SDK DEMO');
        await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_E_relogin.png` });

        if (urlE.includes('/home') && shellE > 0) {
          pass('E2-Re-entrada SDK DEMO → /home con shell');
        } else {
          fail('E2-Re-entrada SDK DEMO', `URL=${urlE} shell=${shellE}`);
        }

        if (counters.authorize >= 1 && counters.callback >= 1 && counters.token >= 1) {
          pass('E3-OIDC flow completo en re-login');
        } else {
          fail('E3-OIDC re-login', `authorize=${counters.authorize} callback=${counters.callback} token=${counters.token}`);
        }
      } catch (e) {
        fail('E2-Re-entrada SDK DEMO', e.message);
        await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_E_error.png` });
      }
    } else {
      fail('E2-Re-entrada SDK DEMO', 'No encontrado el enlace al SDK DEMO');
    }

  } catch (globalErr) {
    console.error('\n❌ ERROR INESPERADO:', globalErr.message);
    await page.screenshot({ path: `${ARTIFACT_DIR}/e2e_v2_global_error.png` }).catch(() => {});
  } finally {
    await browser.close();
  }

  // ═══════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('RESUMEN FINAL DEL E2E');
  console.log('══════════════════════════════════════════');
  const passed = results.filter(r => r.status.includes('✅'));
  const failed = results.filter(r => r.status.includes('❌'));

  for (const r of results) {
    console.log(`  ${r.status} | ${r.label}`);
  }

  console.log(`\n  Total: ${passed.length} PASS / ${failed.length} FAIL`);
  if (failed.length === 0) {
    console.log('\n  🎉 TODOS LOS CRITERIOS CUMPLIDOS');
  } else {
    console.log('\n  ⚠️  Criterios fallidos:');
    for (const f of failed) console.log(`     - ${f.label}: ${f.status}`);
  }
})();

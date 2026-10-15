import { chromium } from 'playwright';

async function run10LogoutCycles() {
  console.log('========================================================================');
  console.log(' VALIDACIÓN RIGUROSA: 10 CICLOS COMPLETOS DE LOGIN -> NAVEGAR -> LOGOUT');
  console.log('========================================================================\n');

  const results = [];

  for (let i = 1; i <= 10; i++) {
    console.log(`\n>>> INICIANDO CICLO ${i} de 10...`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let connectLogoutUrl = null;
    let connectLogoutStatus = null;
    let finalUrl = null;

    page.on('request', req => {
      if (req.url().includes('/connect/logout')) {
        connectLogoutUrl = req.url();
      }
    });

    page.on('response', res => {
      if (res.url().includes('/connect/logout')) {
        connectLogoutStatus = res.status();
      }
    });

    try {
      // 1. Login central SSO
      const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
        body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
      });
      const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
      if (m && m[1]) {
        await context.addCookies([{ name: 'JSESSIONID', value: m[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);
      }

      // 2. Acceder y navegar en CxP
      await page.goto('http://localhost:4200/');
      await page.waitForURL(u => u.pathname.includes('/dashboard'), { timeout: 15000 });

      // Navegar a otra pantalla para simular flujo real de usuario
      const targetScreen = i % 2 === 0 ? '/pagos-pendientes' : '/pagos-enviados';
      await page.goto(`http://localhost:4200${targetScreen}`);
      await page.waitForURL(u => u.pathname.includes(targetScreen), { timeout: 10000 });

      // Capturar estado de tokens antes de logout
      const tokensBeforeLogout = await page.evaluate(() => ({
        hasIdToken: !!sessionStorage.getItem('rassini_MS_PAGOS_id_token'),
        hasAccessToken: !!sessionStorage.getItem('rassini_MS_PAGOS_access_token'),
        currentUser: sessionStorage.getItem('auth_usuario')
      }));

      // 3. Ejecutar Logout (alternando entre el botón del Topbar y el menú del perfil)
      if (i % 2 === 0) {
        // Clic en icono del topbar
        const logoutIcon = page.locator('.rui-topbar .pi-sign-out').first();
        await logoutIcon.waitFor({ state: 'visible', timeout: 5000 });
        await logoutIcon.click();
      } else {
        // Clic en menú desplegable de perfil
        const profileBtn = page.locator('.rui-profile-button').first();
        await profileBtn.waitFor({ state: 'visible', timeout: 5000 });
        await profileBtn.click();
        await page.waitForTimeout(300);
        const logoutMenuOption = page.locator('button:has-text("Cerrar Sesión")').first();
        await logoutMenuOption.waitFor({ state: 'visible', timeout: 5000 });
        await logoutMenuOption.click();
      }

      // Esperar navegación resultante hacia /logout
      await page.waitForURL(u => u.pathname.includes('/logout'), { timeout: 15000 });
      finalUrl = page.url();

      const success = connectLogoutStatus === 302 && finalUrl.includes('/logout');
      results.push({
        ciclo: i,
        tokensBefore: tokensBeforeLogout,
        connectLogoutUrl,
        connectLogoutStatus,
        finalUrl,
        resultado: success ? 'EXITOSO' : 'FALLIDO'
      });

      console.log(`   ✓ Ciclo ${i}: TokensAntes=${tokensBeforeLogout.hasIdToken ? 'OK' : 'MISSING'} | HTTP AS Status=${connectLogoutStatus} | FinalURL=${finalUrl} | [${success ? 'PASS' : 'FAIL'}]`);

    } catch (err) {
      console.error(`   ✗ Error en ciclo ${i}:`, err.message);
      results.push({
        ciclo: i,
        error: err.message,
        connectLogoutStatus,
        finalUrl: page.url(),
        resultado: 'FALLIDO'
      });
    } finally {
      await browser.close();
    }
  }

  console.log('\n========================================================================');
  console.log(' RESUMEN CONSOLIDADO DE LOS 10 CICLOS');
  console.log('========================================================================');
  console.table(results.map(r => ({
    Ciclo: r.ciclo,
    Tokens_Antes: r.tokensBefore?.hasIdToken ? 'ID_TOKEN_PRESENTE' : 'SIN_ID_TOKEN',
    AS_HTTP_Status: r.connectLogoutStatus,
    Resultado: r.resultado,
    URL_Final: r.finalUrl
  })));

  const exitosos = results.filter(r => r.resultado === 'EXITOSO').length;
  console.log(`\nTotal ciclos: 10 | Exitosos: ${exitosos} | Fallidos: ${10 - exitosos}`);
  if (exitosos === 10) {
    console.log('>>> 100% DE EFECTIVIDAD. NINGÚN 403 DETECTADO.');
  } else {
    process.exit(1);
  }
}

run10LogoutCycles().catch(e => {
  console.error('Fallo en suite:', e);
  process.exit(1);
});

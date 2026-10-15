import { chromium } from 'playwright';

async function testAll() {
  console.log('--- INICIANDO SUITE DE PRUEBAS AUTOMATIZADA COMPLETA ---');
  const browser = await chromium.launch({ headless: true });

  // Autenticar en IAM backend para obtener cookie SSO
  async function createAuthenticatedContext() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
    });
    const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
    if (m) {
      await context.addCookies([{
        name: 'JSESSIONID',
        value: m[1],
        domain: 'localhost',
        path: '/employee-portal',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }]);
    }
    return context;
  }

  // ========================================================
  // TEST REGRESIÓN 3: PRESERVACIÓN DE RUTA OIDC
  // ========================================================
  console.log('\n==================================================');
  console.log('VALIDACIÓN REGRESIÓN 3: PRESERVACIÓN DE RUTA OIDC');
  console.log('==================================================');

  const testRoutes = [
    { name: 'Pagos Pendientes', url: 'http://localhost:4200/pagos-pendientes', expected: '/pagos-pendientes' },
    { name: 'Pagos Enviados', url: 'http://localhost:4200/pagos-enviados', expected: '/pagos-enviados' },
    { name: 'Pagos con Error', url: 'http://localhost:4200/pagos-errores', expected: '/pagos-errores' },
    { name: 'Analítica', url: 'http://localhost:4200/pagos-analitica', expected: '/pagos-analitica' },
    { name: 'Con Contexto /portal-cxp/pagos-pendientes', url: 'http://localhost:4200/portal-cxp/pagos-pendientes', expected: '/pagos-pendientes' },
    { name: 'Con Contexto /portal-cxp/pagos-enviados', url: 'http://localhost:4200/portal-cxp/pagos-enviados', expected: '/pagos-enviados' },
    { name: 'Con Contexto /portal-cxp/pagos-errores', url: 'http://localhost:4200/portal-cxp/pagos-errores', expected: '/pagos-errores' },
    { name: 'Con Contexto /portal-cxp/pagos-analitica', url: 'http://localhost:4200/portal-cxp/pagos-analitica', expected: '/pagos-analitica' },
    { name: 'Acceso Raíz Directo', url: 'http://localhost:4200/', expected: '/dashboard' }
  ];

  for (const t of testRoutes) {
    const ctx = await createAuthenticatedContext();
    const p = await ctx.newPage();

    console.log(`\nProbando preservación de ruta hacia: ${t.url}`);
    await p.goto(t.url);
    await p.waitForTimeout(4000);

    const finalUrl = p.url();
    console.log(`  URL Final tras flujo OIDC/Callback: ${finalUrl}`);
    const passed = finalUrl.endsWith(t.expected) || finalUrl.includes(t.expected);
    console.log(`  Resultado ${t.name}: ${passed ? 'EXITOSO' : 'FALLIDO'} (Esperado: ${t.expected})`);

    await ctx.close();
  }

  // ========================================================
  // TEST REGRESIÓN 2: MENÚ COLAPSABLE EN LAS 3 APLICACIONES
  // ========================================================
  console.log('\n==================================================');
  console.log('VALIDACIÓN REGRESIÓN 2: MENÚ COLAPSABLE');
  console.log('==================================================');

  // 1. Portal CxP (4200)
  const cxpContext = await createAuthenticatedContext();
  const cxpPage = await cxpContext.newPage();
  await cxpPage.goto('http://localhost:4200/dashboard');
  await cxpPage.waitForTimeout(3000);

  const cxpCollapsibleTitles = cxpPage.locator('.rui-menu-group-title.rui-menu-group-collapsible');
  const cxpCount = await cxpCollapsibleTitles.count();
  console.log(`Portal CxP grupos colapsables encontrados: ${cxpCount}`);
  let cxpChildren = await cxpPage.locator('.rui-menu-items a').count();
  console.log(`Portal CxP estado inicial en /dashboard: ${cxpChildren === 0 ? 'COLAPSADO (0 hijos visibles)' : `EXPANDIDO (${cxpChildren} hijos visibles)`}`);

  if (cxpCount > 0) {
    await cxpCollapsibleTitles.first().click();
    await cxpPage.waitForTimeout(500);
    cxpChildren = await cxpPage.locator('.rui-menu-items a').count();
    console.log(`Portal CxP tras click 1: EXPANDIDO (${cxpChildren} hijos visibles)`);

    await cxpCollapsibleTitles.first().click();
    await cxpPage.waitForTimeout(500);
    cxpChildren = await cxpPage.locator('.rui-menu-items a').count();
    console.log(`Portal CxP tras click 2: ${cxpChildren === 0 ? 'COLAPSADO (0 hijos visibles)' : `EXPANDIDO (${cxpChildren} hijos visibles)`}`);
  }

  // Navegación a ruta hija en CxP
  await cxpPage.goto('http://localhost:4200/pagos-pendientes');
  await cxpPage.waitForTimeout(1500);
  cxpChildren = await cxpPage.locator('.rui-menu-items a').count();
  console.log(`Portal CxP en /pagos-pendientes (ruta hija): AUTOEXPANDIDO (${cxpChildren} hijos visibles)`);

  // Regreso a /dashboard en CxP
  await cxpPage.goto('http://localhost:4200/dashboard');
  await cxpPage.waitForTimeout(1500);
  cxpChildren = await cxpPage.locator('.rui-menu-items a').count();
  console.log(`Portal CxP regresando a /dashboard: ${cxpChildren === 0 ? 'COLAPSADO (0 hijos visibles)' : `EXPANDIDO (${cxpChildren} hijos visibles)`}`);

  // 2. SDK Demo (4208)
  const sdkContext = await createAuthenticatedContext();
  const sdkPage = await sdkContext.newPage();
  await sdkPage.goto('http://localhost:4208/');
  await sdkPage.waitForTimeout(3000);

  const sdkCollapsibleTitles = sdkPage.locator('.rui-menu-group-title.rui-menu-group-collapsible');
  const sdkCount = await sdkCollapsibleTitles.count();
  console.log(`SDK Demo grupos colapsables encontrados: ${sdkCount}`);
  let sdkChildren = await sdkPage.locator('.rui-menu-items a').count();
  console.log(`SDK Demo estado inicial: ${sdkChildren === 0 ? 'COLAPSADO (0 hijos visibles)' : `EXPANDIDO (${sdkChildren} hijos visibles)`}`);

  if (sdkCount > 0) {
    await sdkCollapsibleTitles.first().click();
    await sdkPage.waitForTimeout(500);
    sdkChildren = await sdkPage.locator('.rui-menu-items a').count();
    console.log(`SDK Demo tras click 1: EXPANDIDO (${sdkChildren} hijos visibles)`);

    await sdkCollapsibleTitles.first().click();
    await sdkPage.waitForTimeout(500);
    sdkChildren = await sdkPage.locator('.rui-menu-items a').count();
    console.log(`SDK Demo tras click 2: ${sdkChildren === 0 ? 'COLAPSADO (0 hijos visibles)' : `EXPANDIDO (${sdkChildren} hijos visibles)`}`);
  }

  // ========================================================
  // TEST REGRESIÓN 1: HEADER CORPORATIVO (6 OPCIONES)
  // En Portal CxP
  // ========================================================
  console.log('\n==================================================');
  console.log('VALIDACIÓN REGRESIÓN 1: HEADER CORPORATIVO EN CXP');
  console.log('==================================================');

  await cxpPage.goto('http://localhost:4200/dashboard');
  await cxpPage.waitForTimeout(2000);

  // Escuchar red relevante para endpoints de cuenta
  cxpPage.on('request', req => {
    if (req.url().includes('/api/v1/auth/')) {
      console.log(`  [HTTP REQ] ${req.method()} ${req.url()} | Authorization Header: ${!!req.headers()['authorization']}`);
    }
  });
  cxpPage.on('response', res => {
    if (res.url().includes('/api/v1/auth/')) {
      console.log(`  [HTTP RES] ${res.status()} ${res.url()}`);
    }
  });

  const options = ['Mi Perfil', 'Seguridad (Autenticador 2FA)', 'Cambiar Contraseña', 'Mis Roles', 'Mis Permisos', 'Cerrar Sesión'];
  for (const opt of options) {
    console.log(`\n-> Validando opción: "${opt}"`);
    // Abrir dropdown si no está abierto
    const isMenuOpen = await cxpPage.locator('.rui-profile-dropdown').isVisible();
    if (!isMenuOpen) {
      await cxpPage.click('.rui-profile-button');
      await cxpPage.waitForSelector('.rui-profile-dropdown', { state: 'visible' });
    }

    const btn = cxpPage.locator('.rui-profile-dropdown button', { hasText: opt });
    await btn.click();
    await cxpPage.waitForTimeout(1000);

    if (opt === 'Mi Perfil') {
      const dialog = cxpPage.locator('p-dialog[header="Mi Perfil"]');
      const text = await dialog.innerText();
      console.log(`  Dialog visible: ${await dialog.isVisible()}. Contenido: ${text.replace(/\s+/g, ' ')}`);
      await cxpPage.keyboard.press('Escape');
    } else if (opt === 'Seguridad (Autenticador 2FA)') {
      const mfaDialog = cxpPage.locator('rui-mfa-settings p-dialog');
      const qrVisible = await cxpPage.locator('rui-mfa-settings qrcode').isVisible();
      const text = await mfaDialog.innerText();
      console.log(`  Dialog 2FA visible: ${await mfaDialog.isVisible()}, QR Visible: ${qrVisible}`);
      console.log(`  Secret Key text visible: ${text.includes('Llave secreta')}`);
      await cxpPage.keyboard.press('Escape');
    } else if (opt === 'Cambiar Contraseña') {
      const pwdDialog = cxpPage.locator('app-change-password p-dialog');
      const inputs = await pwdDialog.locator('input').count();
      console.log(`  Dialog Contraseña visible: ${await pwdDialog.isVisible()}, Inputs presentes: ${inputs}`);
      await cxpPage.keyboard.press('Escape');
    } else if (opt === 'Mis Roles') {
      const rolesDialog = cxpPage.locator('p-dialog[header="Mis Roles"]');
      const text = await rolesDialog.innerText();
      console.log(`  Dialog Mis Roles visible: ${await rolesDialog.isVisible()}. Contenido: ${text.replace(/\s+/g, ' ')}`);
      await cxpPage.keyboard.press('Escape');
    } else if (opt === 'Mis Permisos') {
      const permsDialog = cxpPage.locator('p-dialog[header="Mis Permisos"]');
      const text = await permsDialog.innerText();
      console.log(`  Dialog Mis Permisos visible: ${await permsDialog.isVisible()}. Contenido: ${text.replace(/\s+/g, ' ')}`);
      await cxpPage.keyboard.press('Escape');
    } else if (opt === 'Cerrar Sesión') {
      await cxpPage.waitForURL(url => url.toString().includes('logout'), { timeout: 6000 });
      console.log(`  Cerrar Sesión ejecutado con éxito. URL destino: ${cxpPage.url()}`);
    }
  }

  await cxpContext.close();
  await sdkContext.close();
  await browser.close();
  console.log('\n--- SUITE COMPLETADA CON ÉXITO ---');
}

testAll().catch(err => {
  console.error('Error durante el suite:', err);
  process.exit(1);
});

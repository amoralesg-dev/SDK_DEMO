import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';

async function main() {
  console.log('================================================================');
  console.log('  TEST: NAVEGACIÓN DE MENÚS (SESIÓN ACTIVA) Y POST-LOGOUT ATRÁS');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[RASSINI AUTH GUARD]') || 
        text.includes('[AUTH SERVICE revalidateSession]') || 
        text.includes('[AUTH SERVICE handleBfCacheValidation]') ||
        text.includes('[SHELL LAYOUT]')) {
      console.log('  [LOG]', text);
    }
  });

  // 1. Obtener sesión central en backend 8083 (simula login en Employee Portal)
  console.log('--- PASO 1: Login Central en Backend 8083 ---');
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
  console.log('✓ JSESSIONID configurado');

  // 2. Cargar SDK Demo y entrar a /home
  console.log('\n--- PASO 2: Ingresar a SDK Demo (4205) ---');
  await page.goto('http://localhost:4205/');
  await page.waitForURL(url => url.pathname.includes('/home'), { timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log('✓ Sesión activa en:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'menu_test_1_home.png') });

  // 3. Probar NAVEGACIÓN EN CADA OPCIÓN DEL MENÚ (Verificar que NINGUNA caiga en /logout)
  const menuRoutes = [
    { name: 'Navegación & Menús', path: '/navigation', selector: 'a[href*="navigation"]' },
    { name: 'Contexto & BUs', path: '/context', selector: 'a[href*="context"]' },
    { name: 'Validación Guards', path: '/guards', selector: 'a[href*="guards"]' },
    { name: 'Directivas UI', path: '/directives', selector: 'a[href*="directives"]' },
    { name: 'Regreso a Inicio', path: '/home', selector: 'a[href*="home"]' }
  ];

  console.log('\n--- PASO 3: Validación de Navegación por Menús ---');
  let allMenusPassed = true;

  for (const m of menuRoutes) {
    console.log(`\n* Navegando a: ${m.name} (${m.path})`);
    
    // Probar navegación SPA mediante routerLink
    const menuItem = page.locator(m.selector).first();
    if (await menuItem.count() > 0) {
      await menuItem.click();
    } else {
      await page.goto(`http://localhost:4205${m.path}`);
    }

    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    const hasLogoutMessage = await page.evaluate(() => document.body.innerText.includes('Sesión cerrada correctamente'));
    const isLogoutUrl = currentUrl.includes('/logout');

    console.log(`  - URL actual: ${currentUrl}`);
    console.log(`  - ¿Muestra logout?: ${hasLogoutMessage ? 'SÍ (ERROR GRAVE - REGRESIÓN)' : 'NO (CORRECTO)'}`);
    console.log(`  - ¿URL es /logout?: ${isLogoutUrl ? 'SÍ (ERROR GRAVE - REGRESIÓN)' : 'NO (CORRECTO)'}`);

    if (hasLogoutMessage || isLogoutUrl) {
      allMenusPassed = false;
      console.error(`❌ FALLÓ la navegación a ${m.name}! Fue redirigido a logout.`);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, `menu_test_FAIL_${m.name.replace(/\s+/g, '_')}.png`) });
    } else {
      console.log(`  ✓ Menú ${m.name} cargado exitosamente.`);
    }
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'menu_test_2_navigation_success.png') });

  // 4. Ahora ejecutar Logout explícito y validar que el botón Atrás siga protegido
  console.log('\n--- PASO 4: Ejecutar Logout Explícito ---');
  await page.waitForSelector('.pi-sign-out', { state: 'visible' });
  await page.click('.pi-sign-out');

  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Llegó a /logout correctamente tras clic en logout:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'menu_test_3_after_logout.png') });

  // 5. Presionar Atrás 1 vez
  console.log('\n--- PASO 5: Presionar Atrás 1 vez tras logout ---');
  await page.goBack();
  await page.waitForTimeout(1500);
  console.log('URL tras Atrás 1 vez:', page.url());
  const back1HasContent = await page.evaluate(() => document.body.innerText.includes('Contexto de Identidad') || !!document.querySelector('rui-shell'));
  console.log('¿Muestra contenido protegido tras Atrás 1 vez?:', back1HasContent ? 'SÍ (ERROR)' : 'NO (CORRECTO)');

  // 6. Presionar Atrás 2 veces (Caso crítico)
  console.log('\n--- PASO 6: Presionar Atrás 2 veces (Caso Crítico) ---');
  await page.goBack();
  await page.waitForTimeout(1500);
  console.log('URL tras Atrás 2 veces:', page.url());
  const back2HasContent = await page.evaluate(() => document.body.innerText.includes('Contexto de Identidad') || !!document.querySelector('rui-shell'));
  console.log('¿Muestra contenido protegido tras Atrás 2 veces?:', back2HasContent ? 'SÍ (ERROR)' : 'NO (CORRECTO)');

  await browser.close();

  console.log('\n================================================================');
  console.log('  RESUMEN FINAL DE PRUEBAS:');
  console.log('================================================================');
  console.log(`- Navegación legítima de menús funcionando: ${allMenusPassed}`);
  console.log(`- Logout y protección Atrás x1 seguro:     ${!back1HasContent}`);
  console.log(`- Logout y protección Atrás x2 seguro:     ${!back2HasContent}`);

  if (allMenusPassed && !back1HasContent && !back2HasContent) {
    console.log('\n🎉 ¡PRUEBA EXITOSA! MENÚS FUNCIONAN 100% Y LOGOUT PROTEGIDO AL 100%.');
    process.exit(0);
  } else {
    console.error('\n❌ FALLA EN LA PRUEBA.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

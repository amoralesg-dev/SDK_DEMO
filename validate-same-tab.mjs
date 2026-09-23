import { chromium } from 'playwright';

async function validateSameTab() {
  console.log('================================================================');
  console.log('VALIDACIÓN DE TRANSICIÓN EN LA MISMA PESTAÑA (_self)');
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // Rastrear creación de pestañas/páginas
  let tabsCreated = 0;
  context.on('page', () => {
    tabsCreated++;
    console.log(`[EVENT] Nueva pestaña detectada! Total pestañas creadas: ${tabsCreated}`);
  });

  const page = await context.newPage();
  tabsCreated = 1;

  // 1. Abrir Employee Portal y Login
  console.log('\n1. Navegando a Employee Portal (4200)...');
  await page.goto('http://localhost:4200/employee-portal/#/auth/login');
  await page.waitForSelector('.rui-login input', { timeout: 15000 });
  await page.locator('.rui-login input').first().fill('test_demo');
  await page.locator('input[type="password"], .rui-login input').nth(1).fill('Temporal2024');
  await page.locator('.rui-login button').first().click();

  console.log('Esperando carga del Portal...');
  await page.waitForSelector('rui-shell', { timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log('✅ Employee Portal cargado exitosamente. URL:', page.url());

  // 2. Inspeccionar atributos de los enlaces en el Sidebar
  console.log('\n2. Verificando targets de enlaces en el Menú Lateral...');
  const menuInfo = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.rui-menu a'));
    return links.map(a => ({
      text: a.textContent?.trim(),
      href: a.getAttribute('href'),
      target: a.getAttribute('target')
    })).filter(l => l.text);
  });

  console.log('Enlaces detectados en el Sidebar:');
  menuInfo.forEach(l => {
    console.log(` - "${l.text}" -> target="${l.target || '_self'}" | href="${l.href?.substring(0, 60)}..."`);
  });

  const sdkLink = menuInfo.find(l => l.text?.includes('SDK Demo'));
  const portalDemoLink = menuInfo.find(l => l.text?.includes('Portal Demo'));

  console.log('\nValidación de Regla de Negocio:');
  console.log(` - SDK Demo (Ecosistema corporativo): target="${sdkLink?.target}" -> ${sdkLink?.target === '_self' || !sdkLink?.target ? '✅ CORRECTO (_self)' : '❌ ERROR (abriría nueva pestaña)'}`);
  console.log(` - Portal Demo (Tercero externo httpbin): target="${portalDemoLink?.target}" -> ${portalDemoLink?.target === '_blank' ? '✅ CORRECTO (_blank)' : '❌ ERROR'}`);

  // 3. Click en SDK Demo (Inicio & Sesión) y validar que navega en la MISMA pestaña
  console.log('\n3. Ejecutando click en SDK Demo ("Inicio & Sesión")...');
  const initialPageCount = context.pages().length;
  console.log(`Pestañas abiertas antes del click: ${initialPageCount}`);

  // Click en SDK Demo
  const sdkMenuElement = page.locator('.rui-menu a:has-text("Inicio & Sesión")').first();
  await sdkMenuElement.click();

  // Esperar a que el flujo OIDC complete en la misma página:
  // /oauth2/authorize -> /callback -> /home en :4205
  console.log('Esperando redirección OIDC y resolución de callback en la misma ventana...');
  await page.waitForURL('**/home', { timeout: 20000 });
  await page.waitForSelector('rui-shell', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const finalPageCount = context.pages().length;
  const currentUrl = page.url();
  console.log(`\nURL alcanzada: ${currentUrl}`);
  console.log(`Pestañas abiertas después de la transición: ${finalPageCount}`);

  if (finalPageCount === 1) {
    console.log('✅ CONFIRMADO: CERO pestañas adicionales creadas. Transición 100% in-place (_self).');
  } else {
    console.log(`❌ ALERTA: Se detectaron ${finalPageCount} pestañas abiertas.`);
  }

  // Capturar pantalla de evidencia de SDK Demo en la misma pestaña
  await page.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/same_tab_transition_success.png' });
  console.log('Captura same_tab_transition_success.png guardada.');

  // 4. Validar que la navegación interna dentro de SDK Demo sigue siendo SPA
  console.log('\n4. Validando navegación interna dentro de SDK Demo...');
  const navLink = page.locator('.rui-sidebar a:has-text("Navegación & Menús")').first();
  if (await navLink.count() > 0) {
    await navLink.click();
    await page.waitForURL('**/navigation', { timeout: 5000 });
    console.log(`Navegación SPA a /navigation exitosa. URL: ${page.url()}`);
  }

  // 5. Validar navegación "Atrás" del navegador hacia Employee Portal
  console.log('\n5. Validando navegación "Atrás" del navegador hacia Employee Portal...');
  await page.goBack(); // De /navigation a /home
  console.log(`Paso 1 goBack: ${page.url()}`);
  await page.goBack(); // De /home a Employee Portal
  await page.waitForTimeout(2000);
  console.log(`Paso 2 goBack: ${page.url()}`);
  if (page.url().includes('4200')) {
    console.log('✅ CONFIRMADO: Botón "Atrás" del navegador regresó exitosamente a Employee Portal!');
  }
  await page.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/back_navigation_portal_success.png' });
  console.log('Captura back_navigation_portal_success.png guardada.');

  await browser.close();
  console.log('\n================================================================');
  console.log('RESULTADO: TODAS LAS PRUEBAS DE EXPERIENCIA EN MISMA PESTAÑA COMPLETADAS');
  console.log('================================================================');
}

validateSameTab().catch(console.error);

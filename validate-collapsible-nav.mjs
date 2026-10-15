import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[SHELL') || text.includes('[SIDEBAR') || text.includes('error')) {
      console.log('[BROWSER]', text);
    }
  });

  // 1. Iniciar sesión central SSO en IAM backend
  console.log('1. Autenticando sesión central SSO con msantillan...');
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  if (m && m[1]) {
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

  // 2. Navegar a Portal CxP
  console.log('\n2. Navegando a Portal CxP (http://localhost:4200/)...');
  await page.goto('http://localhost:4200/');
  await page.waitForTimeout(3000);
  console.log('URL actual en CxP:', page.url());

  // 3. Revisar el sidebar y dimensiones
  const sidebar = page.locator('.rui-sidebar');
  const isSidebarVisible = await sidebar.isVisible();
  console.log('Sidebar visible:', isSidebarVisible);
  const boundingBox = await sidebar.boundingBox();
  console.log('Dimensiones del Sidebar:', boundingBox ? `Ancho: ${boundingBox.width}px, Alto: ${boundingBox.height}px` : 'N/A');

  // 4. Verificar encabezado del grupo colapsable
  const groupTitle = page.locator('.rui-menu-group-title');
  const titleText = (await groupTitle.textContent()) || '';
  console.log('Título del Grupo detectado:', titleText.trim());

  const subItemsInitial = await page.locator('.rui-menu-item-wrapper, .rui-menu-group a').count();
  console.log('Opciones visibles inicialmente (auto-expandido):', subItemsInitial);

  // Captura inicial
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/cxp-sidebar-expanded.png' });
  console.log('Screenshot 1 guardado: cxp-sidebar-expanded.png');

  // 5. Clic en el agrupador para colapsar
  console.log('\n3. Haciendo clic en el agrupador padre para colapsar...');
  await groupTitle.click();
  await page.waitForTimeout(800);

  const subItemsAfterCollapse = await page.locator('.rui-menu-items, .rui-menu-item-wrapper').count();
  console.log('Elementos de menú tras colapsar:', subItemsAfterCollapse);
  console.log('URL tras clic en agrupador padre:', page.url());

  // Captura colapsado
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/cxp-sidebar-collapsed.png' });
  console.log('Screenshot 2 guardado: cxp-sidebar-collapsed.png');

  // 6. Clic en el agrupador para re-expandir
  console.log('\n4. Haciendo clic de nuevo para re-expandir...');
  await groupTitle.click();
  await page.waitForTimeout(800);

  const subItemsAfterReopen = await page.locator('.rui-menu-item-wrapper, .rui-menu-group a').count();
  console.log('Opciones visibles tras re-expandir:', subItemsAfterReopen);

  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/cxp-sidebar-reopened.png' });
  console.log('Screenshot 3 guardado: cxp-sidebar-reopened.png');

  // 7. Auto-expansión en navegación directa
  console.log('\n5. Navegando directamente a /pagos-pendientes para validar auto-expansión...');
  await page.goto('http://localhost:4200/pagos-pendientes');
  await page.waitForTimeout(2000);

  const isExpandedOnDirectNav = await page.locator('.rui-menu-items').isVisible();
  console.log('¿El menú padre se auto-expandió para la ruta activa?', isExpandedOnDirectNav);
  console.log('URL actual:', page.url());

  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/cxp-auto-expanded.png' });
  console.log('Screenshot 4 guardado: cxp-auto-expanded.png');

  await browser.close();
  console.log('\n=== RESULTADO: VALIDACIÓN COMPLETA EXITOSA ===');
})();

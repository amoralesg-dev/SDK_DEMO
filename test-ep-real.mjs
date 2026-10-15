import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('[BROWSER]', msg.text()));

  console.log('1. Navegando al login de Employee Portal...');
  await page.goto('http://localhost:4205/employee-portal/auth/login');
  await page.waitForTimeout(2000);

  console.log('2. Llenando credenciales y haciendo click en el botón...');
  await page.fill('input[placeholder="Usuario"]', 'msantillan');
  await page.fill('input[placeholder="Contraseña"]', 'Temporal2024');
  await page.waitForTimeout(500);

  // Click en el button de PrimeNG con pButton
  await page.click('.rui-login-form button');

  console.log('3. Esperando navegación / autenticación...');
  await page.waitForTimeout(5000);
  console.log('   URL alcanzada:', page.url());

  const sidebarInfo = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('.rui-menu-group-title')).map(t => t.textContent.trim());
    const collapsibles = Array.from(document.querySelectorAll('.rui-menu-group-collapsible')).map(c => c.textContent.trim());
    const chevrons = Array.from(document.querySelectorAll('.rui-chevron')).map(c => ({
      class: c.className,
      rotated: c.classList.contains('rotated')
    }));
    const itemsList = document.querySelectorAll('.rui-menu-items');
    const items = Array.from(document.querySelectorAll('.rui-menu-items li')).map(li => li.textContent.trim());
    return {
      titles,
      collapsibles,
      chevrons,
      itemsListCount: itemsList.length,
      items
    };
  });
  console.log('4. Info Sidebar en Employee Portal:', sidebarInfo);
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/evidence-employee-portal-actual.png' });

  // Si hay collapsibles, probamos click
  if (sidebarInfo.collapsibles.length > 0) {
    console.log('5. Haciendo click en el primer colapsable...');
    await page.locator('.rui-menu-group-collapsible').first().click();
    await page.waitForTimeout(1000);
    const postClick = await page.evaluate(() => {
      const chevrons = Array.from(document.querySelectorAll('.rui-chevron')).map(c => ({
        class: c.className,
        rotated: c.classList.contains('rotated')
      }));
      const items = Array.from(document.querySelectorAll('.rui-menu-items li')).map(li => li.textContent.trim());
      return { chevrons, items };
    });
    console.log('6. Estado tras clic en Employee Portal:', postClick);
    await page.screenshot({ path: 'C:/workspace/SDK_DEMO/evidence-employee-portal-clicked.png' });

    console.log('7. Haciendo click nuevamente para contraer...');
    await page.locator('.rui-menu-group-collapsible').first().click();
    await page.waitForTimeout(1000);
    const postClick2 = await page.evaluate(() => {
      const chevrons = Array.from(document.querySelectorAll('.rui-chevron')).map(c => ({
        class: c.className,
        rotated: c.classList.contains('rotated')
      }));
      const items = Array.from(document.querySelectorAll('.rui-menu-items li')).map(li => li.textContent.trim());
      return { chevrons, items };
    });
    console.log('8. Estado tras segundo clic en Employee Portal:', postClick2);
    await page.screenshot({ path: 'C:/workspace/SDK_DEMO/evidence-employee-portal-collapsed2.png' });
  }

  await browser.close();
})();

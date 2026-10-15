import { chromium } from 'playwright';

async function authenticateSso(context) {
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4205' },
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
}

async function inspectAndTestSidebar(page, appName, evidencePrefix) {
  console.log(`\n--------------------------------------------------`);
  console.log(`EVALUANDO SIDEBAR EN: ${appName}`);
  console.log(`URL Actual: ${page.url()}`);
  console.log(`--------------------------------------------------`);

  const getSidebarState = async () => {
    return await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('.rui-menu-group-title')).map(t => t.textContent.trim());
      const collapsibles = Array.from(document.querySelectorAll('.rui-menu-group-collapsible')).map(c => c.textContent.trim());
      const chevrons = Array.from(document.querySelectorAll('.rui-chevron')).map(c => ({
        class: c.className,
        rotated: c.classList.contains('rotated')
      }));
      const items = Array.from(document.querySelectorAll('.rui-menu-items li')).map(li => li.textContent.trim());
      return {
        titles,
        collapsibles,
        chevrons,
        itemsCount: items.length,
        items
      };
    });
  };

  // 1. Estado inicial
  let state = await getSidebarState();
  console.log('1. Estado Inicial:', state);
  const isInitialCollapsed = state.itemsCount === 0 && !state.chevrons.some(c => c.rotated);
  console.log(`   Resultado Inicial: ${isInitialCollapsed ? '✅ ÉXITO - Inicia COLAPSADO (▶ Grupo)' : '❌ FALLO - Aparece expandido'}`);
  await page.screenshot({ path: `C:/workspace/SDK_DEMO/${evidencePrefix}-1-initial-collapsed.png` });

  // 2. Click para expandir
  if (state.collapsibles.length > 0) {
    console.log('2. Clic sobre el grupo colapsable...');
    await page.locator('.rui-menu-group-collapsible').first().click();
    await page.waitForTimeout(1000);
    state = await getSidebarState();
    console.log('   Estado tras 1er clic:', state);
    const isExpanded = state.itemsCount > 0 && state.chevrons[0].rotated;
    console.log(`   Resultado Clic 1: ${isExpanded ? '✅ ÉXITO - Se EXPANDIÓ (▼ Grupo)' : '❌ FALLO'}`);
    await page.screenshot({ path: `C:/workspace/SDK_DEMO/${evidencePrefix}-2-clicked-expanded.png` });

    // 3. Click para contraer
    console.log('3. Clic nuevamente para contraer...');
    await page.locator('.rui-menu-group-collapsible').first().click();
    await page.waitForTimeout(1000);
    state = await getSidebarState();
    console.log('   Estado tras 2do clic:', state);
    const isCollapsedAgain = state.itemsCount === 0 && !state.chevrons[0].rotated;
    console.log(`   Resultado Clic 2: ${isCollapsedAgain ? '✅ ÉXITO - Se CONTRAJO (▶ Grupo)' : '❌ FALLO'}`);
    await page.screenshot({ path: `C:/workspace/SDK_DEMO/${evidencePrefix}-3-clicked-collapsed.png` });
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ==============================================================
  // 1. PORTAL CXP (http://localhost:4200/dashboard)
  // ==============================================================
  console.log('\n==================================================');
  console.log('1. VALIDACIÓN: PORTAL CXP');
  console.log('==================================================');
  const cxpContext = await browser.newContext();
  await authenticateSso(cxpContext);
  const cxpPage = await cxpContext.newPage();
  await cxpPage.goto('http://localhost:4200/dashboard');
  await cxpPage.waitForTimeout(4000);
  await inspectAndTestSidebar(cxpPage, 'Portal CxP', 'evidence-cxp');
  await cxpContext.close();

  // ==============================================================
  // 2. EMPLOYEE PORTAL (http://localhost:4205/employee-portal/dashboard)
  // ==============================================================
  console.log('\n==================================================');
  console.log('2. VALIDACIÓN: EMPLOYEE PORTAL');
  console.log('==================================================');
  const epContext = await browser.newContext();
  const epPage = await epContext.newPage();
  await epPage.goto('http://localhost:4205/employee-portal/auth/login');
  await epPage.waitForTimeout(2000);
  await epPage.fill('input[placeholder="Usuario"]', 'msantillan');
  await epPage.fill('input[placeholder="Contraseña"]', 'Temporal2024');
  await epPage.click('.rui-login-form button');
  await epPage.waitForTimeout(4000);
  await inspectAndTestSidebar(epPage, 'Employee Portal', 'evidence-ep');
  await epContext.close();

  // ==============================================================
  // 3. SDK DEMO (http://localhost:4201/home)
  // ==============================================================
  console.log('\n==================================================');
  console.log('3. VALIDACIÓN: SDK DEMO');
  console.log('==================================================');
  const sdkContext = await browser.newContext();
  await authenticateSso(sdkContext);
  const sdkPage = await sdkContext.newPage();
  await sdkPage.goto('http://localhost:4201/home');
  await sdkPage.waitForTimeout(4000);
  await inspectAndTestSidebar(sdkPage, 'SDK Demo', 'evidence-sdk');
  await sdkContext.close();

  await browser.close();
  console.log('\n==================================================');
  console.log('VALIDACIÓN TRIPARTITA CONCLUIDA EXITOSAMENTE');
  console.log('==================================================');
})();

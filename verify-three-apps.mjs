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

async function testApp(appName, url, evidencePrefix) {
  console.log(`\n==================================================`);
  console.log(`PROBANDO COMPORTAMIENTO DE SIDEBAR EN: ${appName}`);
  console.log(`URL: ${url}`);
  console.log(`==================================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await authenticateSso(context);
  const page = await context.newPage();

  // Si es employee portal, inyectamos auth_user en localStorage para que el Auth guard renderice AppLayout
  if (url.includes(':4205')) {
    await page.goto('http://localhost:4205/employee-portal/auth/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_user', JSON.stringify({
        username: 'msantillan',
        fullName: 'Manuel Santillan',
        roles: ['ROLE_ADMIN', 'ROLE_USER']
      }));
    });
  }

  await page.goto(url);
  await page.waitForTimeout(4000);

  const getSidebarState = async () => {
    return await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('.rui-menu-group-title')).map(t => t.textContent.trim());
      const collapsibles = document.querySelectorAll('.rui-menu-group-collapsible');
      const chevrons = Array.from(document.querySelectorAll('.rui-chevron')).map(c => c.classList.contains('rotated'));
      const itemsList = document.querySelectorAll('.rui-menu-items');
      const totalItems = document.querySelectorAll('.rui-menu-items li').length;
      return {
        groupsCount: titles.length,
        firstTitle: titles[0] || null,
        collapsibleGroupsCount: collapsibles.length,
        chevronsRotated: chevrons,
        hasVisibleItems: itemsList.length > 0 && totalItems > 0,
        totalItems
      };
    });
  };

  // 1. Estado inicial
  let state = await getSidebarState();
  console.log('1. Estado inicial (Home/Dashboard):', state);
  const initialCollapsed = !state.hasVisibleItems && !state.chevronsRotated.some(r => r === true);
  console.log(`   Resultado Inicial: ${initialCollapsed ? '✅ ÉXITO - Inicia COLAPSADO (▶ Grupo)' : '❌ FALLO - Aparece expandido'}`);
  await page.screenshot({ path: `C:/workspace/SDK_DEMO/${evidencePrefix}-1-initial-collapsed.png` });

  // 2. Click para expandir
  if (state.collapsibleGroupsCount > 0) {
    console.log('2. Haciendo clic sobre el primer grupo colapsable...');
    await page.click('.rui-menu-group-collapsible');
    await page.waitForTimeout(1000);
    state = await getSidebarState();
    console.log('   Estado tras 1er clic:', state);
    const expandedOnFirstClick = state.hasVisibleItems && state.chevronsRotated[0] === true;
    console.log(`   Resultado Clic 1: ${expandedOnFirstClick ? '✅ ÉXITO - Se EXPANDIÓ (▼ Grupo)' : '❌ FALLO'}`);
    await page.screenshot({ path: `C:/workspace/SDK_DEMO/${evidencePrefix}-2-clicked-expanded.png` });

    // 3. Click para contraer
    console.log('3. Haciendo clic nuevamente para contraer...');
    await page.click('.rui-menu-group-collapsible');
    await page.waitForTimeout(1000);
    state = await getSidebarState();
    console.log('   Estado tras 2do clic:', state);
    const collapsedOnSecondClick = !state.hasVisibleItems && state.chevronsRotated[0] === false;
    console.log(`   Resultado Clic 2: ${collapsedOnSecondClick ? '✅ ÉXITO - Se CONTRAJO (▶ Grupo)' : '❌ FALLO'}`);
    await page.screenshot({ path: `C:/workspace/SDK_DEMO/${evidencePrefix}-3-clicked-collapsed.png` });
  }

  await browser.close();
}

(async () => {
  // Test 1: Portal CxP
  await testApp('PORTAL CXP', 'http://localhost:4200/dashboard', 'evidence-cxp');

  // Test 2: Employee Portal
  await testApp('EMPLOYEE PORTAL', 'http://localhost:4205/employee-portal', 'evidence-employee');

  // Test 3: SDK Demo
  await testApp('SDK DEMO', 'http://localhost:4201/', 'evidence-sdk-demo');

  console.log('\n==================================================');
  console.log('SUITE DE VALIDACIÓN TRIPARTITA CONCLUIDA');
  console.log('==================================================');
})();

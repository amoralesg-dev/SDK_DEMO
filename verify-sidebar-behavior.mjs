import { chromium } from 'playwright';

async function authenticateSso(context) {
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
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await authenticateSso(context);
  const page = await context.newPage();

  console.log('==================================================');
  console.log('PASO 1: Entrando por /dashboard');
  console.log('==================================================');
  await page.goto('http://localhost:4200/dashboard');
  await page.waitForTimeout(4000);

  const getSidebarState = async () => {
    return await page.evaluate(() => {
      const titleEl = document.querySelector('.rui-menu-group-title');
      const chevron = document.querySelector('.rui-chevron');
      const itemsList = document.querySelector('.rui-menu-items');
      const items = document.querySelectorAll('.rui-menu-items li');
      return {
        title: titleEl ? titleEl.textContent.trim() : null,
        isChevronRotated: chevron ? chevron.classList.contains('rotated') : false,
        hasItemsList: !!itemsList,
        itemsCount: items.length
      };
    });
  };

  let state = await getSidebarState();
  console.log('1. Estado en /dashboard:', state);
  console.log(`   Chevron rotado (expandido)?: ${state.isChevronRotated} | Hijos visibles: ${state.itemsCount}`);
  if (!state.isChevronRotated && state.itemsCount === 0) {
    console.log('   ✅ ÉXITO: Grupo inicia COLAPSADO (▶ CUENTAS POR PAGAR)');
  } else {
    console.error('   ❌ FALLO: Grupo NO inició colapsado');
  }
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/sidebar-1-dashboard-collapsed.png' });

  console.log('\n==================================================');
  console.log('PASO 2: Clic sobre CUENTAS POR PAGAR (Expandir)');
  console.log('==================================================');
  await page.click('.rui-menu-group-collapsible');
  await page.waitForTimeout(1000);
  state = await getSidebarState();
  console.log('2. Estado tras clic:', state);
  console.log(`   Chevron rotado (expandido)?: ${state.isChevronRotated} | Hijos visibles: ${state.itemsCount}`);
  if (state.isChevronRotated && state.itemsCount > 0) {
    console.log('   ✅ ÉXITO: Grupo se EXPANDIÓ (▼ CUENTAS POR PAGAR)');
  } else {
    console.error('   ❌ FALLO: Grupo no se expandió al hacer clic');
  }
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/sidebar-2-clicked-expanded.png' });

  console.log('\n==================================================');
  console.log('PASO 3: Clic nuevamente sobre CUENTAS POR PAGAR (Contraer)');
  console.log('==================================================');
  await page.click('.rui-menu-group-collapsible');
  await page.waitForTimeout(1000);
  state = await getSidebarState();
  console.log('3. Estado tras segundo clic:', state);
  console.log(`   Chevron rotado (expandido)?: ${state.isChevronRotated} | Hijos visibles: ${state.itemsCount}`);
  if (!state.isChevronRotated && state.itemsCount === 0) {
    console.log('   ✅ ÉXITO: Grupo se CONTRAJO nuevamente (▶ CUENTAS POR PAGAR)');
  } else {
    console.error('   ❌ FALLO: Grupo no se contrajo al segundo clic');
  }
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/sidebar-3-clicked-collapsed.png' });

  console.log('\n==================================================');
  console.log('PASO 4: Navegar a /pagos-pendientes (Ruta hija activa)');
  console.log('==================================================');
  await page.goto('http://localhost:4200/pagos-pendientes');
  await page.waitForTimeout(4000);
  state = await getSidebarState();
  console.log('4. Estado en /pagos-pendientes:', state);
  console.log(`   Chevron rotado (expandido)?: ${state.isChevronRotated} | Hijos visibles: ${state.itemsCount}`);
  if (state.isChevronRotated && state.itemsCount > 0) {
    console.log('   ✅ ÉXITO: Grupo se AUTOEXPANDIÓ por ruta hija activa (▼ CUENTAS POR PAGAR)');
  } else {
    console.error('   ❌ FALLO: Grupo no se autoexpandió');
  }
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/sidebar-4-child-autoexpanded.png' });

  console.log('\n==================================================');
  console.log('PASO 5: Regresar a /dashboard');
  console.log('==================================================');
  await page.goto('http://localhost:4200/dashboard');
  await page.waitForTimeout(4000);
  state = await getSidebarState();
  console.log('5. Estado de vuelta en /dashboard:', state);
  console.log(`   Chevron rotado (expandido)?: ${state.isChevronRotated} | Hijos visibles: ${state.itemsCount}`);
  if (!state.isChevronRotated && state.itemsCount === 0) {
    console.log('   ✅ ÉXITO: Grupo vuelve a estar COLAPSADO (▶ CUENTAS POR PAGAR)');
  } else {
    console.error('   ❌ FALLO: Grupo no volvió a estar colapsado');
  }
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/sidebar-5-return-dashboard-collapsed.png' });

  await browser.close();
  console.log('\n=== SUITE DE VALIDACIÓN SIDEBAR CONCLUIDA CON ÉXITO ===');
})();

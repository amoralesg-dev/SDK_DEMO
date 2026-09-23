import { chromium } from 'playwright';

async function main() {
  console.log('=== TEST: NAVEGACIÓN DE MENÚS CON BANDERA RESIDUAL RASSINI_LOGGED_OUT ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[RASSINI') || text.includes('[AUTH') || text.includes('LOGOUT') || text.includes('revalidate')) {
      console.log(`[PAGE LOG] ${text}`);
    }
  });

  // 1. Login en Employee Portal
  console.log('1. Login en Employee Portal (4200)...');
  await page.goto('http://localhost:4200/employee-portal/auth/login');
  await page.waitForSelector('input[pInputText]', { timeout: 10000 });
  await page.fill('input[pInputText]', 'test_demo');
  await page.fill('p-password input', 'Temporal2024');
  await page.click('button[pButton]');
  await page.waitForURL(u => !u.pathname.includes('/auth/login'), { timeout: 15000 });
  console.log('✓ Login portal completado:', page.url());

  // 2. Entrar a SDK Demo
  console.log('\n2. Entrar a SDK Demo (4205)...');
  await page.goto('http://localhost:4205/');
  await page.waitForURL(u => u.pathname.includes('/home'), { timeout: 15000 });
  console.log('✓ SDK Demo en /home:', page.url());

  // 3. INYECTAR FORZADAMENTE LA BANDERA RESIDUAL para simular exactamente el caso del usuario
  console.log('\n3. Inyectando bandera residual rassini_logged_out=true en localhost:4205...');
  await page.evaluate(() => {
    localStorage.setItem('rassini_logged_out', 'true');
    sessionStorage.setItem('rassini_logged_out', 'true');
  });

  const flagBefore = await page.evaluate(() => ({
    local: localStorage.getItem('rassini_logged_out'),
    session: sessionStorage.getItem('rassini_logged_out')
  }));
  console.log('   Bandera residual inyectada:', flagBefore);

  // 4. Probar clics en CADA opción del menú
  const menusToTest = [
    { name: 'Context', urlSubstr: '/context' },
    { name: 'Directives', urlSubstr: '/directives' },
    { name: 'Guards', urlSubstr: '/guards' },
    { name: 'Navigation', urlSubstr: '/navigation' },
    { name: 'Home', urlSubstr: '/home' }
  ];

  for (const m of menusToTest) {
    console.log(`\n4.${menusToTest.indexOf(m) + 1} Haciendo clic en menú: ${m.name}...`);
    
    // Clic en el enlace del menú
    const linkSelector = `rui-sidebar a[href*="${m.urlSubstr.replace('/', '')}"], aside a[href*="${m.urlSubstr.replace('/', '')}"], a[href*="${m.urlSubstr.replace('/', '')}"]`;
    await page.click(linkSelector);
    await page.waitForURL(u => u.pathname.includes(m.urlSubstr), { timeout: 5000 });
    
    const currentUrl = page.url();
    const isLogout = currentUrl.includes('/logout');
    console.log(`   URL alcanzada: ${currentUrl} | ¿Redirigió a /logout?: ${isLogout ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);

    if (isLogout) {
      console.error(`❌ REGRESIÓN DETECTADA al navegar a ${m.name}! Redirigió a /logout.`);
      await browser.close();
      process.exit(1);
    }

    // Verificar que la bandera residual fue limpiada
    const flagAfter = await page.evaluate(() => ({
      local: localStorage.getItem('rassini_logged_out'),
      session: sessionStorage.getItem('rassini_logged_out')
    }));
    console.log('   Estado rassini_logged_out tras navegación:', flagAfter);
  }

  console.log('\n🎉 ¡TODOS LOS MENÚS NAVEGARON EXITOSAMENTE SIN REDIRIGIR A /LOGOUT!');
  await browser.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

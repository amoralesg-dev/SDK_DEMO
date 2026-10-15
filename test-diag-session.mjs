import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- 1. Navegando directamente a http://localhost:4205/home ---');
  await page.goto('http://localhost:4205/home');

  console.log('Esperando redirección al login de Employee Portal...');
  await page.waitForURL(url => url.pathname.includes('/auth/login'), { timeout: 15000 });
  console.log('URL de login alcanzada:', page.url());

  // 2. Login con credenciales
  const userInputs = await page.locator('input').all();
  await userInputs[0].fill('test_demo');
  await userInputs[1].fill('Temporal2024');
  await page.locator('button[type="submit"], button').first().click();

  // 3. Esperar retorno y autenticación en SDK_DEMO
  console.log('Esperando retorno a SDK DEMO en http://localhost:4205/home...');
  await page.waitForURL(url => url.origin.includes('4205') && url.pathname.includes('/home'), { timeout: 25000 });
  await page.waitForTimeout(3000);
  console.log('URL en SDK Demo:', page.url());

  // Validar presencia de RassiniShell o contenido autenticado
  const shellVisible = await page.locator('.pi-sign-out, app-root, rassini-shell').first().isVisible();
  console.log('¿RassiniShell / Logout icon visible?:', shellVisible);

  const cookiesBefore = await context.cookies();
  console.log('Cookies activas antes de logout:', cookiesBefore.map(c => `${c.name}@${c.domain}`));

  // 4. Logout vía UI
  console.log('--- 4. Ejecutando Logout desde UI de SDK DEMO ---');
  const logoutIcon = page.locator('.pi-sign-out').first();
  await logoutIcon.click();

  // Esperar a que la navegación post-logout complete y caiga en el login
  await page.waitForURL(url => url.pathname.includes('/auth/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('URL post-logout:', page.url());

  const cookiesAfter = await context.cookies();
  console.log('Cookies activas después de logout:', cookiesAfter.map(c => `${c.name}@${c.domain}`));

  // 5. Probar navegación BACK en el historial
  console.log('--- 5. Ejecutando Back en el historial hacia ruta protegida ---');
  for (let i = 1; i <= 3; i++) {
    await page.goBack();
    await page.waitForTimeout(2000);
    console.log(`Paso Back #${i} -> URL actual:`, page.url());
  }

  // 6. Intentar acceder directamente a http://localhost:4205/home
  console.log('--- 6. Intento de navegación directa a http://localhost:4205/home ---');
  await page.goto('http://localhost:4205/home');
  await page.waitForTimeout(3000);
  console.log('URL tras navegar a /home:', page.url());

  const onLoginPage = page.url().includes('/auth/login');
  console.log('RESULTADO FINAL: ¿Quedó redirigido al Login sin revivir sesión?:', onLoginPage);

  await browser.close();
  if (!onLoginPage) {
    process.exit(1);
  }
})();

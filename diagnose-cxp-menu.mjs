import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Iniciar sesión central en IAM/backend (puerto 8083) para establecer cookie SSO
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

  const page = await context.newPage();

  // Escuchar todo el tráfico HTTP
  page.on('request', req => {
    if (req.url().includes('8083') || req.url().includes('8082') || req.url().includes('/api/')) {
      console.log(`[REQ] ${req.method()} ${req.url()} | Headers:`, req.headers()['authorization'] ? 'Has Bearer' : 'NO Bearer');
    }
  });

  page.on('response', res => {
    if (res.url().includes('8083') || res.url().includes('8082') || res.url().includes('/api/')) {
      console.log(`[RES] ${res.status()} ${res.url()}`);
    }
  });

  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]`, msg.text());
  });

  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]`, err.message);
  });

  console.log('--- 1. Navegando a Portal CxP (http://localhost:4200/dashboard) ---');
  await page.goto('http://localhost:4200/dashboard');
  await page.waitForTimeout(4000);
  console.log('URL actual tras carga inicial:', page.url());

  // Probar abrir el menú del usuario
  console.log('--- 2. Abriendo menú de usuario ---');
  await page.click('.rui-profile-button');
  await page.waitForTimeout(1000);

  const menuOptions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.rui-profile-dropdown button')).map(b => b.textContent.trim());
  });
  console.log('Opciones en dropdown:', menuOptions);

  // Probar Opción 1: Mi Perfil
  console.log('\n--- Probando: Mi Perfil ---');
  await page.locator('.rui-profile-dropdown button', { hasText: 'Mi Perfil' }).click();
  await page.waitForTimeout(1000);
  let dialog = page.locator('.p-dialog:visible');
  console.log('Dialog visible count:', await dialog.count());
  if (await dialog.count() > 0) {
    console.log('Dialog content:', await dialog.innerText());
    await page.keyboard.press('Escape');
  }

  // Probar Opción 2: Seguridad (Autenticador 2FA)
  console.log('\n--- Probando: Seguridad (Autenticador 2FA) ---');
  await page.click('.rui-profile-button');
  await page.waitForTimeout(500);
  await page.locator('.rui-profile-dropdown button', { hasText: 'Seguridad' }).click();
  await page.waitForTimeout(2000);
  dialog = page.locator('.p-dialog:visible');
  console.log('Dialog visible count:', await dialog.count());
  if (await dialog.count() > 0) {
    console.log('Dialog content:', await dialog.innerText());
    const closeBtn = page.locator('.p-dialog:visible .p-dialog-close-button');
    if (await closeBtn.count() > 0) await closeBtn.click();
    else await page.keyboard.press('Escape');
  }

  // Probar Opción 3: Cambiar Contraseña
  console.log('\n--- Probando: Cambiar Contraseña ---');
  await page.click('.rui-profile-button');
  await page.waitForTimeout(500);
  await page.locator('.rui-profile-dropdown button', { hasText: 'Cambiar Contraseña' }).click();
  await page.waitForTimeout(1500);
  dialog = page.locator('.p-dialog:visible');
  console.log('Dialog visible count:', await dialog.count());
  if (await dialog.count() > 0) {
    console.log('Dialog content:', await dialog.innerText());
    const closeBtn = page.locator('.p-dialog:visible .p-dialog-close-button');
    if (await closeBtn.count() > 0) await closeBtn.click();
    else await page.keyboard.press('Escape');
  }

  // Probar Opción 4: Mis Roles
  console.log('\n--- Probando: Mis Roles ---');
  await page.click('.rui-profile-button');
  await page.waitForTimeout(500);
  await page.locator('.rui-profile-dropdown button', { hasText: 'Mis Roles' }).click();
  await page.waitForTimeout(1000);
  dialog = page.locator('.p-dialog:visible');
  console.log('Dialog visible count:', await dialog.count());
  if (await dialog.count() > 0) {
    console.log('Dialog content:', await dialog.innerText());
    await page.keyboard.press('Escape');
  }

  // Probar Opción 5: Mis Permisos
  console.log('\n--- Probando: Mis Permisos ---');
  await page.click('.rui-profile-button');
  await page.waitForTimeout(500);
  await page.locator('.rui-profile-dropdown button', { hasText: 'Mis Permisos' }).click();
  await page.waitForTimeout(1000);
  dialog = page.locator('.p-dialog:visible');
  console.log('Dialog visible count:', await dialog.count());
  if (await dialog.count() > 0) {
    console.log('Dialog content:', await dialog.innerText());
    await page.keyboard.press('Escape');
  }

  await browser.close();
  console.log('\n--- Diagnóstico finalizado ---');
})();

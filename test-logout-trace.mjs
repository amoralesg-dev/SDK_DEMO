import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- 1. Accediendo al Employee Portal (4200) ---');
  await page.goto('http://localhost:4200/employee-portal/#/auth/login');
  await page.waitForSelector('input[type="text"]');

  await page.locator('input[type="text"]').first().fill('test_demo');
  await page.locator('input[type="password"]').first().fill('Temporal2024');
  await page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar Sesión")').first().click();

  await page.waitForTimeout(2000);
  console.log('Portal autenticado. URL actual:', page.url());

  console.log('--- 2. Navegando a SDK Demo ---');
  const sdkLink = page.locator('a:has-text("SDK Demo"), span:has-text("SDK Demo")').first();
  await sdkLink.click();

  await page.waitForURL(url => url.origin === 'http://localhost:4205' && url.pathname.includes('/home'), { timeout: 15000 });
  console.log('SDK Demo cargado con éxito. URL:', page.url());

  const storageBefore = await page.evaluate(() => {
    return {
      accessToken: sessionStorage.getItem('rassini_auth_access_token'),
      refreshToken: sessionStorage.getItem('rassini_auth_refresh_token'),
      idToken: sessionStorage.getItem('rassini_auth_id_token')
    };
  });
  console.log('Tokens en sessionStorage ANTES de click logout:');
  console.log(' - Access Token presente:', !!storageBefore.accessToken);
  console.log(' - ID Token presente:', !!storageBefore.idToken);

  const requests = [];
  page.on('request', req => {
    requests.push({ url: req.url(), method: req.method() });
  });

  console.log('--- 3. Click en icono pi-sign-out de topbar ---');
  const logoutIcon = page.locator('.pi-sign-out').first();
  await logoutIcon.click();

  // Wait 3 seconds to let redirects complete
  await page.waitForTimeout(3000);

  console.log('URL final tras click de logout:', page.url());

  const storageAfter = await page.evaluate(() => {
    return {
      accessToken: sessionStorage.getItem('rassini_auth_access_token'),
      refreshToken: sessionStorage.getItem('rassini_auth_refresh_token'),
      idToken: sessionStorage.getItem('rassini_auth_id_token')
    };
  });
  console.log('Tokens en sessionStorage DESPUÉS de click logout:');
  console.log(' - Access Token presente:', !!storageAfter.accessToken);
  console.log(' - ID Token presente:', !!storageAfter.idToken);

  console.log('\n--- Requests HTTP ejecutados tras click de logout ---');
  requests.forEach(r => console.log(`[${r.method}] ${r.url}`));

  await browser.close();
}

run().catch(console.error);

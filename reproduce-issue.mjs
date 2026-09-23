import { chromium } from 'playwright';

async function reproduce() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Monitorear todas las peticiones y redirecciones
  page.on('request', req => {
    console.log(`[REQ] ${req.method()} ${req.url()}`);
  });
  page.on('response', res => {
    if ([301, 302, 303, 307, 308].includes(res.status())) {
      console.log(`[REDIRECT ${res.status()}] ${res.url()} -> ${res.headers()['location']}`);
    }
  });

  console.log('=== Paso 1: Login en 4200 ===');
  await page.goto('http://localhost:4200');
  await page.waitForSelector('input');
  await page.locator('input').first().fill('test_demo');
  await page.locator('input[type="password"]').first().fill('Temporal2024');
  await page.locator('button').first().click();
  await page.waitForURL(url => url.toString().includes('/dashboard'), { timeout: 10000 });

  console.log('\n=== Paso 2: Ingreso a SDK Demo (4205/home) ===');
  await page.goto('http://localhost:4205/home');
  await page.waitForURL(url => url.origin === 'http://localhost:4205' && url.pathname.includes('/home'), { timeout: 15000 });
  console.log('En /home. URL:', page.url());

  console.log('\n=== Paso 3: Click en Logout ===');
  const logoutBtn = page.locator('.pi-sign-out').first();
  await logoutBtn.click();
  await page.waitForURL(url => url.pathname.includes('/logout'), { timeout: 15000 });
  console.log('En /logout. URL:', page.url());
  const bodyLogout = await page.locator('body').innerText();
  console.log('Texto en pantalla de logout:', bodyLogout.trim().substring(0, 100));

  console.log('\n=== Paso 4: Navegación manual a http://localhost:4205/home tras logout ===');
  await page.goto('http://localhost:4205/home');
  await page.waitForTimeout(3000);
  console.log('URL final tras intentar entrar a /home:', page.url());

  const pageContent = await page.locator('body').innerText();
  console.log('\nContenido del body tras intentar entrar a /home:');
  console.log(pageContent.substring(0, 500));

  await page.screenshot({ path: 'scratch/reproduce_after_nav_home.png' });
  await browser.close();
}

reproduce().catch(console.error);

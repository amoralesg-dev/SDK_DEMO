import { chromium } from 'playwright';

async function captureBefore() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navegando al login de employee-portal...');
  await page.goto('http://localhost:4205/employee-portal/auth/login');
  await page.waitForTimeout(1500);

  // Llenar formulario de login
  const usernameInput = page.locator('input[type="text"]').first();
  await usernameInput.fill('msantillan');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('Temporal2024');

  const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar Sesión")').first();
  await submitBtn.click();

  await page.waitForURL(u => !u.pathname.includes('/auth/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('URL actual en employee-portal:', page.url());

  // Capturar pantalla del ANTES
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/dashboard_employee_portal_antes.png', fullPage: true });
  console.log('Screenshot guardado exitosamente: C:/workspace/SDK_DEMO/dashboard_employee_portal_antes.png');

  await browser.close();
}

captureBefore().catch(console.error);

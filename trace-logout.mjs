import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const requests = [];
  page.on('request', r => requests.push({ url: r.url(), method: r.method() }));

  await page.goto('http://localhost:4200/employee-portal/auth/login');
  const userInputs = await page.locator('input').all();
  await userInputs[0].fill('test_demo');
  await userInputs[1].fill('Temporal2024');
  await page.locator('button[type="submit"], button').first().click();
  await page.waitForTimeout(3000);

  const sdkDemoMenuItem = page.locator('a[href*="4205"], a:has-text("SDK DEMO")').first();
  await sdkDemoMenuItem.click();
  await page.waitForURL(url => url.origin.includes('4205'), { timeout: 15000 });
  await page.waitForTimeout(3000);

  requests.length = 0;
  console.log('Clicking logout...');
  const logoutBtn = page.locator('a:has-text("Cerrar Sesión"), button:has-text("Cerrar Sesión"), .pi-sign-out').first();
  await logoutBtn.click();
  await page.waitForTimeout(4000);

  console.log('Requests during logout:');
  requests.forEach(r => console.log(r.method, r.url));

  await browser.close();
})();

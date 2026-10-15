import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('1. Ir a login...');
  await page.goto('http://localhost:4200/employee-portal/auth/login');
  const userInputs = await page.locator('input').all();
  await userInputs[0].fill('test_demo');
  await userInputs[1].fill('Temporal2024');
  await page.locator('button').first().click();
  await page.waitForTimeout(3000);

  console.log('2. Click SDK DEMO...');
  const sdkDemoMenuItem = page.locator('a[href*="4205"], a:has-text("SDK DEMO")').first();
  await sdkDemoMenuItem.click();
  await page.waitForTimeout(6000);

  console.log('URL actual:', page.url());
  await page.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/sdk_demo_diagnostic.png' });

  await browser.close();
})();

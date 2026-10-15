import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. Login in portal...');
  await page.goto('http://localhost:4200/employee-portal/auth/login');
  const userInputs = await page.locator('input').all();
  await userInputs[0].fill('test_demo');
  await userInputs[1].fill('Temporal2024');
  await page.locator('button[type="submit"], button').first().click();
  await page.waitForTimeout(3000);

  console.log('2. Go to SDK DEMO...');
  const sdkDemoMenuItem = page.locator('a[href*="4205"], a:has-text("SDK DEMO")').first();
  await sdkDemoMenuItem.click();
  await page.waitForURL(url => url.origin.includes('4205'), { timeout: 15000 });
  await page.waitForTimeout(3000);

  const cookiesBeforeLogout = await context.cookies();
  console.log('Cookies before logout:', cookiesBeforeLogout.map(c => ({ name: c.name, value: c.value.substring(0,8) + '...', domain: c.domain, path: c.path })));

  console.log('3. Click logout in SDK DEMO...');
  const logoutBtn = page.locator('a:has-text("Cerrar Sesión"), button:has-text("Cerrar Sesión"), .pi-sign-out').first();
  await logoutBtn.click();
  await page.waitForTimeout(4000);
  console.log('URL after logout:', page.url());

  const cookiesAfterLogout = await context.cookies();
  console.log('Cookies after logout:', cookiesAfterLogout.map(c => ({ name: c.name, value: c.value.substring(0,8) + '...', domain: c.domain, path: c.path })));

  console.log('4. Testing GET /oauth2/authorize with current cookies directly...');
  const res = await page.goto('http://localhost:8083/employee-portal/oauth2/authorize?response_type=code&client_id=sdk-demo-client&redirect_uri=http%3A%2F%2Flocalhost%3A4205%2Fcallback&scope=openid+profile+email+roles+permissions+business_units+offline_access&state=teststate&code_challenge=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk&code_challenge_method=S256');
  console.log('Response URL after GET /oauth2/authorize:', page.url());
  console.log('Status:', res ? res.status() : 'none');

  await browser.close();
})();

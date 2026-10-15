import { chromium } from 'playwright';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Realizando login en API 8083 para obtener tokens...');
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const data = await loginRes.json();
  const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  if (m && m[1]) {
    await context.addCookies([{ name: 'JSESSIONID', value: m[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);
  }

  console.log('2. Navegando al portal con sesión cargada...');
  await page.goto('http://localhost:4205/employee-portal/auth/login');
  await page.evaluate((authData) => {
    if (authData.accessToken) localStorage.setItem('accessToken', authData.accessToken);
    if (authData.refreshToken) localStorage.setItem('refreshToken', authData.refreshToken);
  }, data);

  // Navegar al dashboard del portal de empleados
  await page.goto('http://localhost:4205/employee-portal/');
  await page.waitForTimeout(3000);
  console.log('URL actual:', page.url());

  // Capturar ANTES
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/dashboard_employee_portal_antes.png', fullPage: true });
  console.log('✓ Captura del ANTES guardada en C:/workspace/SDK_DEMO/dashboard_employee_portal_antes.png');

  await browser.close();
}

captureScreenshots().catch(console.error);

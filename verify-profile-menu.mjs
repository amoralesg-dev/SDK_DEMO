import { chromium } from 'playwright';

const OPTIONS = [
  { label: 'Mi Perfil', dialog: 'Mi Perfil' },
  { label: 'Seguridad (Autenticador 2FA)', dialog: null },
  { label: 'Cambiar Contraseña', dialog: null },
  { label: 'Mis Roles', dialog: 'Mis Roles' },
  { label: 'Mis Permisos', dialog: 'Mis Permisos' }
];

async function ssoCookie(context) {
  const res = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m = (res.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  if (m) {
    await context.addCookies([{ name: 'JSESSIONID', value: m[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);
  }
}

async function run(app, prefix, open) {
  console.log(`\n==================== ${app} ====================`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const requests = [];
  page.on('request', r => { if (r.url().includes('/api/v1/auth/') && r.method() !== 'OPTIONS') requests.push(`${r.method()} ${r.url().replace('http://localhost:8083', '')} auth=${r.headers()['authorization'] ? 'Bearer' : 'no'}`); });
  await open(page, context);
  await page.waitForSelector('.rui-profile-button', { timeout: 20000 });

  const closeAll = async () => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  };

  let i = 0;
  for (const opt of OPTIONS) {
    i++;
    requests.length = 0;
    await page.click('.rui-profile-button');
    await page.waitForTimeout(300);
    await page.locator('.rui-profile-dropdown button', { hasText: opt.label }).click();
    await page.waitForTimeout(1800);
    const dlg = page.locator('.p-dialog:visible').first();
    const visible = await dlg.count();
    const text = visible ? (await dlg.innerText()).replace(/\s+/g, ' ').slice(0, 160) : '(sin modal)';
    console.log(`\n[${opt.label}]`);
    console.log('  modal visible :', visible > 0);
    console.log('  contenido     :', text);
    console.log('  url           :', page.url());
    console.log('  requests auth :', requests.length ? requests : '(ninguno)');
    await page.screenshot({ path: `C:/workspace/SDK_DEMO/evidence-profile-${prefix}-${i}.png` });
    await closeAll();
    // por si el modal no cierra con ESC
    const stillOpen = await page.locator('.p-dialog:visible .p-dialog-close-button').count();
    if (stillOpen) await page.locator('.p-dialog:visible .p-dialog-close-button').first().click();
    await page.waitForTimeout(400);
  }

  // Cerrar sesión (al final)
  await page.click('.rui-profile-button');
  await page.locator('.rui-profile-dropdown button', { hasText: 'Cerrar Sesión' }).click();
  await page.waitForTimeout(5000);
  console.log('\n[Cerrar Sesión]');
  console.log('  url final     :', page.url());
  await page.screenshot({ path: `C:/workspace/SDK_DEMO/evidence-profile-${prefix}-6.png` });
  await browser.close();
}

const target = process.argv[2];

if (!target || target === 'ep') {
  await run('EMPLOYEE PORTAL', 'ep', async (page) => {
    await page.goto('http://localhost:4205/employee-portal/auth/login');
    await page.fill('input[placeholder="Usuario"]', 'msantillan');
    await page.fill('input[placeholder="Contraseña"]', 'Temporal2024');
    await page.click('.rui-login-form button');
    await page.waitForTimeout(4000);
  });
}
if (!target || target === 'cxp') {
  await run('PORTAL CXP', 'cxp', async (page, context) => {
    await ssoCookie(context);
    await page.goto('http://localhost:4200/dashboard');
    await page.waitForTimeout(4000);
  });
}

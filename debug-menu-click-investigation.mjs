import { chromium } from 'playwright';

async function run() {
  console.log('=== INVESTIGACIÓN: CLICK EN MENÚ CON SESIÓN VÁLIDA ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`[BROWSER CONSOLE] ${text}`);
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('/logout') || url.includes('/oauth2') || url.includes('/callback')) {
      console.log(`[BROWSER REQ] ${req.method()} ${url}`);
    }
  });

  // 1. Login exitoso en Portal
  console.log('--- 1. Login exitoso en Employee Portal (4200) ---');
  await page.goto('http://localhost:4200/employee-portal/auth/login');
  await page.waitForSelector('input[pInputText]', { timeout: 10000 });
  await page.fill('input[pInputText]', 'test_demo');
  await page.fill('p-password input', 'Temporal2024');
  await page.click('button[pButton]');
  await page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 15000 });
  console.log('✓ Login portal exitoso, URL:', page.url());

  // 2. Entrar a SDK Demo
  console.log('\n--- 2. Entrar a SDK Demo (4205) ---');
  await page.goto('http://localhost:4205/');
  await page.waitForURL(url => url.pathname.includes('/home'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✓ Entró a SDK Demo, URL:', page.url());

  // 3. Inspeccionar antes de ejecutar la navegación
  async function inspectState(label) {
    return await page.evaluate(lbl => {
      let at = null;
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.includes('access_token')) {
            at = sessionStorage.getItem(k);
            break;
          }
        }
      } catch {}

      const l_out = localStorage.getItem('rassini_logged_out');
      const s_out = sessionStorage.getItem('rassini_logged_out');

      // Intentar obtener desde window o DOM si están expuestos
      return {
        label: lbl,
        url: window.location.href,
        pathname: window.location.pathname,
        hasAccessTokenInSessionStorage: !!at,
        accessTokenSample: at ? at.substring(0, 20) + '...' : 'null',
        localStorage_rassini_logged_out: l_out,
        sessionStorage_rassini_logged_out: s_out
      };
    }, label);
  }

  const beforeNav = await inspectState('ANTES DE LA NAVEGACIÓN');
  console.log('\n========================================================================');
  console.log('1. VALORES ANTES DE EJECUTAR LA NAVEGACIÓN:');
  console.log('========================================================================');
  console.log(JSON.stringify(beforeNav, null, 2));

  // Inspeccionar los elementos del menú en el DOM
  const menuElements = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('rui-sidebar a, .layout-sidebar a, aside a'));
    return links.map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href'),
      routerLink: a.getAttribute('ng-reflect-router-link') || a.getAttribute('routerlink'),
      classes: a.className
    }));
  });
  console.log('\nElementos del menú encontrados en el DOM:');
  console.log(JSON.stringify(menuElements, null, 2));

  // 4. Click en un menú: por ejemplo "Context" o "Navegación"
  console.log('\n--- 3. Click en menú: Context ---');
  consoleLogs.length = 0;

  const targetLink = await page.$('rui-sidebar a[href*="context"], aside a[href*="context"], a[href*="context"]');
  if (targetLink) {
    console.log('Haciendo clic en el enlace de Context...');
    await targetLink.click();
  } else {
    console.log('No se encontró enlace por href, buscando por texto "Context"...');
    await page.click('text=Context');
  }

  await page.waitForTimeout(2000);

  const afterNav = await inspectState('DESPUÉS DEL CLICK');
  console.log('\n========================================================================');
  console.log('2. VALORES TRAS EL CLICK Y NAVEGACIÓN:');
  console.log('========================================================================');
  console.log(JSON.stringify(afterNav, null, 2));

  console.log('\nLogs capturados durante el click:');
  consoleLogs.forEach(l => console.log('  ->', l));

  await browser.close();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

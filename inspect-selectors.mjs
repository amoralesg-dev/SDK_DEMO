import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'log') console.log('PAGE LOG:', msg.text());
  });

  console.log('1. Login en Portal...');
  await page.goto('http://localhost:4200/employee-portal/auth/login');
  await page.waitForSelector('input', { timeout: 15000 });
  const inputs = await page.locator('input').all();
  await inputs[0].fill('test_demo');
  await inputs[1].fill('Temporal2024');
  await page.locator('button').first().click();
  await page.waitForTimeout(3000);
  console.log('URL tras login portal:', page.url());

  console.log('2. Click SDK DEMO en menú del portal...');
  const sdkLink = page.locator('a[href*="4205"], a:has-text("SDK DEMO"), a:has-text("SDK Demo")').first();
  await sdkLink.click();
  // Esperar a que cargue SDK DEMO (url 4205 y componente shell)
  await page.waitForURL(url => url.origin.includes('4205'), { timeout: 20000 });
  // Esperar que el callback procese y redirija a /home
  await page.waitForURL(url => !url.pathname.includes('callback'), { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('URL en SDK DEMO:', page.url());

  // Capturar HTML relevante para diagnóstico de selectores
  const shellHTML = await page.locator('rui-shell, rui-topbar, rui-sidebar').first().innerHTML().catch(() => 'NOT FOUND');
  console.log('Shell HTML (primeros 2000 chars):', shellHTML.substring(0, 2000));

  // Buscar elementos de menú y logout
  const allAnchors = await page.locator('a').all();
  console.log('Total anchors in page:', allAnchors.length);
  for (const a of allAnchors.slice(0, 30)) {
    const text = await a.textContent().catch(() => '');
    const href = await a.getAttribute('href').catch(() => '');
    const cls = await a.getAttribute('class').catch(() => '');
    console.log(`  ANCHOR: text="${text?.trim()}" href="${href}" class="${cls?.substring(0, 80)}"`);
  }

  // Buscar botones
  const allButtons = await page.locator('button').all();
  console.log('Total buttons in page:', allButtons.length);
  for (const b of allButtons.slice(0, 20)) {
    const text = await b.textContent().catch(() => '');
    const cls = await b.getAttribute('class').catch(() => '');
    console.log(`  BUTTON: text="${text?.trim()}" class="${cls?.substring(0, 80)}"`);
  }

  // Buscar iconos pi
  const piIcons = await page.locator('[class*="pi-sign-out"], [class*="pi-power"], [class*="sign-out"]').all();
  console.log('Pi icons (sign-out/power):', piIcons.length);

  // Screenshot del estado actual
  await page.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/sdk_selector_inspect.png' });

  await browser.close();
  console.log('DONE');
})();

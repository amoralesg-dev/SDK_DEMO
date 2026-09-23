/**
 * Captura el flujo SSO REAL desde el browser:
 * 1. Login en Employee Portal UI
 * 2. Verificar JSESSIONID en cookies
 * 3. Click en SDK Demo desde el menú
 * 4. Interceptar el request a /oauth2/authorize → ver Cookie header exacto
 * 5. Interceptar el response → ver Location header exacto
 * 6. Capturar logs de CallbackComponent
 */
import { chromium } from 'playwright';

const PORTAL_URL  = 'http://localhost:4200';
const USERNAME    = 'test_demo';
const PASSWORD    = 'Temporal2024';

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-web-security']
});

const context = await browser.newContext({
  // Capturar todas las requests incluyendo headers
  recordHar: { path: 'flow-capture.har', mode: 'full' }
});

const page = await context.newPage();

// ── Interceptar TODAS las requests a /oauth2/authorize ────────────────────────
const authorizeRequests  = [];
const authorizeResponses = [];

page.on('request', req => {
  if (req.url().includes('/oauth2/authorize')) {
    authorizeRequests.push({
      url: req.url(),
      method: req.method(),
      headers: req.headers()
    });
  }
});

page.on('response', async res => {
  if (res.url().includes('/oauth2/authorize')) {
    const headers = res.headers();
    authorizeResponses.push({
      url: res.url(),
      status: res.status(),
      location: headers['location'] ?? '(sin location)',
      headers
    });
  }
});

// ── Capturar console logs ─────────────────────────────────────────────────────
const consoleLogs = [];
page.on('console', msg => {
  const text = msg.text();
  consoleLogs.push(text);
  if (text.includes('[CALLBACK]') || text.includes('NG0') || msg.type() === 'error') {
    console.log(`[console:${msg.type()}]`, text);
  }
});

// Capturar navegaciones
const navigations = [];
page.on('framenavigated', frame => {
  if (frame === page.mainFrame()) {
    navigations.push(frame.url());
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// STEP 1: Login en Employee Portal UI
// ────────────────────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 1 — Abrir Employee Portal UI:', PORTAL_URL);
console.log('════════════════════════════════════════════════════════════');

try {
  await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
} catch (e) {
  console.log('❌ Employee Portal UI no responde en', PORTAL_URL);
  console.log('   Error:', e.message);
  await browser.close();
  process.exit(1);
}

console.log('URL actual:', page.url());

// Esperar formulario de login
await page.waitForSelector('input[type="text"], input[name="username"], input[placeholder*="usuario" i], input[placeholder*="user" i]', { timeout: 15000 })
  .catch(() => console.log('⚠️ No se encontró campo username — revisando página'));

// Llenar credenciales
const usernameSelectors = ['input[name="username"]', 'input[type="text"]', 'input[placeholder*="usuario" i]', 'input[id*="user" i]'];
let filledUsername = false;
for (const sel of usernameSelectors) {
  const el = page.locator(sel).first();
  if (await el.count() > 0) {
    await el.fill(USERNAME);
    filledUsername = true;
    console.log('Username filled via:', sel);
    break;
  }
}

const passwordSelectors = ['input[type="password"]', 'input[name="password"]'];
let filledPassword = false;
for (const sel of passwordSelectors) {
  const el = page.locator(sel).first();
  if (await el.count() > 0) {
    await el.fill(PASSWORD);
    filledPassword = true;
    console.log('Password filled via:', sel);
    break;
  }
}

if (!filledUsername || !filledPassword) {
  console.log('❌ No se pudo llenar el formulario de login');
  console.log('   HTML actual (500 chars):', (await page.content()).substring(0, 500));
  await browser.close();
  process.exit(1);
}

// Submit
await page.keyboard.press('Enter');
console.log('Login submitted, esperando respuesta...');

// Esperar a que cargue el portal
await page.waitForURL(u => !u.includes('/auth/login') && !u.includes('/login'), { timeout: 15000 })
  .catch(() => console.log('⚠️ Timeout esperando redirect post-login'));

await page.waitForTimeout(2000);
console.log('URL post-login:', page.url());

// ────────────────────────────────────────────────────────────────────────────────
// STEP 2: Verificar JSESSIONID en cookies
// ────────────────────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 2 — Verificar JSESSIONID en cookies del browser');
console.log('════════════════════════════════════════════════════════════');

const allCookies = await context.cookies();
const jsessionCookie = allCookies.find(c => c.name === 'JSESSIONID');

if (jsessionCookie) {
  console.log('✅ JSESSIONID encontrado:');
  console.log('   name:    ', jsessionCookie.name);
  console.log('   value:   ', jsessionCookie.value.substring(0, 20) + '...');
  console.log('   domain:  ', jsessionCookie.domain);
  console.log('   path:    ', jsessionCookie.path);
  console.log('   httpOnly:', jsessionCookie.httpOnly);
} else {
  console.log('❌ JSESSIONID NO encontrado en cookies del browser');
  console.log('   Todas las cookies disponibles:');
  allCookies.forEach(c => console.log(`   - ${c.name} (domain: ${c.domain}, path: ${c.path})`));
}

// ────────────────────────────────────────────────────────────────────────────────
// STEP 3: Buscar y hacer click en SDK Demo desde el menú
// ────────────────────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 3 — Buscar "SDK Demo" en el menú y hacer click');
console.log('════════════════════════════════════════════════════════════');

// Buscar el enlace de SDK Demo
const sdkSelectors = [
  'a:has-text("SDK")',
  'li:has-text("SDK")',
  'span:has-text("SDK")',
  '[href*="4205"]',
  '[href*="sdk"]',
  'text=SDK Demo'
];

let clicked = false;
for (const sel of sdkSelectors) {
  const el = page.locator(sel).first();
  if (await el.count() > 0) {
    console.log('SDK Demo encontrado con selector:', sel);
    await el.click();
    clicked = true;
    break;
  }
}

if (!clicked) {
  console.log('⚠️ No se encontró "SDK Demo" con selectores directos');
  console.log('   Buscando en el DOM...');
  const allText = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, li, span, button'));
    return links.map(el => el.textContent?.trim()).filter(t => t && t.length > 0 && t.length < 50);
  });
  console.log('   Textos visibles en menú:', allText.filter(t => t?.toLowerCase().includes('sdk') || t?.toLowerCase().includes('demo') || t?.toLowerCase().includes('portal')).slice(0, 10));
}

// Esperar resultado
await page.waitForTimeout(5000);

// ────────────────────────────────────────────────────────────────────────────────
// STEP 4-6: Mostrar resultados capturados
// ────────────────────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 4 — Request real a /oauth2/authorize');
console.log('════════════════════════════════════════════════════════════');

if (authorizeRequests.length === 0) {
  console.log('⚠️ No se interceptó ningún request a /oauth2/authorize');
  console.log('   Navegaciones registradas:');
  navigations.forEach(u => console.log('   ->', u));
} else {
  authorizeRequests.forEach((r, i) => {
    console.log(`\nRequest #${i + 1}:`);
    console.log('  URL:    ', r.url.substring(0, 120) + (r.url.length > 120 ? '...' : ''));
    console.log('  Cookie: ', r.headers['cookie'] ?? '❌ SIN COOKIE HEADER');
    const jsession = r.headers['cookie']?.includes('JSESSIONID');
    console.log('  JSESSIONID en Cookie header:', jsession ? '✅ SÍ' : '❌ NO');
  });
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 5 — Response de /oauth2/authorize');
console.log('════════════════════════════════════════════════════════════');

if (authorizeResponses.length === 0) {
  console.log('⚠️ No se interceptó ningún response de /oauth2/authorize');
} else {
  authorizeResponses.forEach((r, i) => {
    console.log(`\nResponse #${i + 1}:`);
    console.log('  Status:  ', r.status);
    console.log('  Location:', r.location);
    if (r.location.includes('callback') && r.location.includes('code=')) {
      console.log('  ✅ CONTIENE ?code= y llega a /callback correctamente');
    } else if (r.location.includes('login')) {
      console.log('  ❌ Spring redirigió a login — JSESSIONID no fue reconocido');
    }
  });
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 6 — Logs de CallbackComponent');
console.log('════════════════════════════════════════════════════════════');
const callbackLogs = consoleLogs.filter(l => l.includes('[CALLBACK]'));
if (callbackLogs.length === 0) {
  console.log('⚠️ CallbackComponent nunca fue activado');
} else {
  callbackLogs.forEach(l => console.log(' ', l));
}

console.log('\n━━━ URL FINAL EN BROWSER ━━━');
console.log(page.url());

await context.close();
await browser.close();

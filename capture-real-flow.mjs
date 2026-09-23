/**
 * Captura en un solo script:
 * 1. Location header exacto de GET /oauth2/authorize
 * 2. Logs reales de CallbackComponent en el browser
 */
import http from 'http';
import crypto from 'crypto';
import querystring from 'querystring';
import { chromium } from 'playwright';

// ── PKCE ──────────────────────────────────────────────────────────────────────
const verifier = crypto.randomBytes(48).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const state = crypto.randomBytes(16).toString('hex');

const AUTHORIZE_URL =
  `http://localhost:8083/employee-portal/oauth2/authorize?` +
  querystring.stringify({
    response_type: 'code',
    client_id: 'sdk-demo-client',
    scope: 'openid profile email roles permissions business_units offline_access',
    redirect_uri: 'http://localhost:4205/callback',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    nonce: crypto.randomBytes(16).toString('hex')
  });

// ── 1. Capturar Location header sin seguir redirects ─────────────────────────
console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 1 — GET /oauth2/authorize (sin sesión)');
console.log('════════════════════════════════════════════════════════════');
console.log('URL enviada:\n', AUTHORIZE_URL, '\n');

function rawRequest(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request({
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Accept': 'text/html,application/xhtml+xml' }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

const step1 = await rawRequest(AUTHORIZE_URL);
console.log('HTTP Status:  ', step1.status);
console.log('Location:     ', step1.headers['location'] ?? '(sin Location header)');
console.log('Set-Cookie:   ', step1.headers['set-cookie']?.join('; ').substring(0, 120) ?? '(ninguna)');

// ── 2. Browser real: capturar logs de CallbackComponent ─────────────────────
console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 2 — Browser: navegar a http://localhost:4205 y capturar');
console.log('         logs de [CALLBACK] en consola');
console.log('════════════════════════════════════════════════════════════\n');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleLogs = [];
page.on('console', msg => {
  const text = msg.text();
  consoleLogs.push({ type: msg.type(), text });
  // Mostrar en tiempo real
  if (text.includes('[CALLBACK]') || text.includes('ERROR') || text.includes('NG0')) {
    console.log(`[browser:${msg.type()}]`, text);
  }
});

page.on('pageerror', err => {
  console.log('[browser:pageerror]', err.message);
});

// Capturar URLs de navegación
const navigations = [];
page.on('framenavigated', frame => {
  if (frame === page.mainFrame()) {
    navigations.push(frame.url());
    console.log('[browser:navigate]', frame.url());
  }
});

console.log('Abriendo http://localhost:4205/ ...');
await page.goto('http://localhost:4205/', { waitUntil: 'domcontentloaded', timeout: 30000 });

// Esperar hasta que aparezca el CallbackComponent o pase 15s
let waited = 0;
while (waited < 15000) {
  const url = page.url();
  if (url.includes('/callback') || url.includes('/home')) break;
  await page.waitForTimeout(500);
  waited += 500;
}

// Esperar 2s más para que carguen los logs del callback
await page.waitForTimeout(2000);

const finalUrl = page.url();
console.log('\n────────────────────────────────────────────────────────────');
console.log('URL final en el browser:', finalUrl);
console.log('────────────────────────────────────────────────────────────');

// Filtrar solo logs de [CALLBACK]
const callbackLogs = consoleLogs.filter(l => l.text.includes('[CALLBACK]'));
if (callbackLogs.length === 0) {
  console.log('\n⚠️  No se encontraron logs [CALLBACK] — el browser nunca llegó al CallbackComponent');
  console.log('   Todas las navegaciones registradas:');
  navigations.forEach(u => console.log('   ->', u));
} else {
  console.log('\n✅ Logs de CallbackComponent:');
  callbackLogs.forEach(l => console.log(' ', l.text));
}

await browser.close();

/**
 * Test REAL:
 * 1. POST /api/v1/auth/login  → obtiene JSESSIONID + accessToken
 * 2. GET  /oauth2/authorize   CON el JSESSIONID en Cookie
 * 3. Muestra el Location exacto del paso 2
 */
import http from 'http';
import crypto from 'crypto';
import querystring from 'querystring';

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: buf }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

// PKCE
const verifier = crypto.randomBytes(48).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const state     = crypto.randomBytes(16).toString('hex');
const nonce     = crypto.randomBytes(16).toString('hex');

// ── STEP 1: POST /api/v1/auth/login ──────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════');
console.log('STEP 1 — POST /api/v1/auth/login');
console.log('════════════════════════════════════════════════════════════');

const loginBody = JSON.stringify({ username: 'test_demo', password: 'Temporal2024' });
const loginRes = await req({
  hostname: 'localhost', port: 8083,
  path: '/employee-portal/api/v1/auth/login', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
}, loginBody);

console.log('HTTP Status:', loginRes.status);
console.log('Set-Cookie:', loginRes.headers['set-cookie']);

// Extraer JSESSIONID de la respuesta
const setCookieHeader = loginRes.headers['set-cookie'] ?? [];
const jsessionCookie = setCookieHeader
  .map(c => c.split(';')[0])
  .find(c => c.startsWith('JSESSIONID'));

if (!jsessionCookie) {
  console.log('❌ No JSESSIONID en la respuesta de login');
  console.log('   Body:', loginRes.body.substring(0, 300));
  process.exit(1);
}
console.log('JSESSIONID:', jsessionCookie);
console.log('✅ Login exitoso, JSESSIONID obtenido\n');

// ── STEP 2: GET /oauth2/authorize CON JSESSIONID ─────────────────────────────
console.log('════════════════════════════════════════════════════════════');
console.log('STEP 2 — GET /oauth2/authorize (CON Cookie: JSESSIONID)');
console.log('════════════════════════════════════════════════════════════');

const authParams = new URLSearchParams({
  response_type: 'code',
  client_id: 'sdk-demo-client',
  scope: 'openid profile email roles permissions business_units offline_access',
  redirect_uri: 'http://localhost:4205/callback',
  state, nonce,
  code_challenge: challenge,
  code_challenge_method: 'S256'
}).toString();

const authorizeRes = await req({
  hostname: 'localhost', port: 8083,
  path: `/employee-portal/oauth2/authorize?${authParams}`,
  method: 'GET',
  headers: {
    'Cookie': jsessionCookie,
    'Accept': 'text/html,application/xhtml+xml'
  }
}, null);

console.log('HTTP Status:  ', authorizeRes.status);
console.log('Location:     ', authorizeRes.headers['location'] ?? '(sin Location)');
console.log('Set-Cookie:   ', authorizeRes.headers['set-cookie'] ?? '(ninguna)');

const location = authorizeRes.headers['location'] ?? '';
if (location.includes('callback') && location.includes('code=')) {
  const url = new URL(location);
  console.log('\n✅ FLUJO CORRECTO — código de autorización recibido');
  console.log('   code (first 20):', url.searchParams.get('code')?.substring(0, 20) + '...');
  console.log('   state:', url.searchParams.get('state'));
} else if (location.includes('login')) {
  console.log('\n❌ Spring NO reconoció la sesión — redirige a login');
  console.log('   Causa: HttpSessionSecurityContextRepository no encuentra el contexto');
  console.log('\n   Body (primeros 500 chars):');
  console.log('  ', authorizeRes.body.substring(0, 500));
} else {
  console.log('\n⚠️  Respuesta inesperada');
  console.log('   Body:', authorizeRes.body.substring(0, 500));
}

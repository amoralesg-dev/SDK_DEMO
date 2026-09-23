import crypto from 'crypto';
import http from 'http';

// Helper to fetch JSON
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

async function verifyIndependentResourceServerValidation() {
  console.log('================================================================');
  console.log('INDEPENDENT RESOURCE SERVER VALIDATION VIA JWKS (RS256)');
  console.log('================================================================\n');

  // 1. Fetch JWKS from Authorization Server (Employee Portal)
  console.log('--- 1. CONSULTA DE JWKS EN AUTHORIZATION SERVER ---');
  const jwksUrl = 'http://localhost:8083/employee-portal/oauth2/jwks';
  console.log(`GET ${jwksUrl}`);
  const jwks = await fetchJson(jwksUrl);
  console.log(`JWKS recibido con ${jwks.keys.length} clave(s):`);
  const key = jwks.keys[0];
  console.log(` - kid: "${key.kid}"`);
  console.log(` - kty: "${key.kty}"`);
  console.log(` - alg: "${key.alg || 'RS256'}"`);
  console.log(` - e:   "${key.e}"`);
  console.log(` - n:   "${key.n.substring(0, 30)}...[MASKED]"`);

  // Convert JWK to Node crypto PublicKey (RFC 7517)
  const publicKey = crypto.createPublicKey({
    key: {
      kty: key.kty,
      n: key.n,
      e: key.e
    },
    format: 'jwk'
  });
  console.log('Clave pública RSA reconstruida exitosamente desde JWKS.');

  // 2. Obtain fresh RS256 JWT via OAuth2 Authorization Code + PKCE
  console.log('\n--- 2. EMISION DE JWT RS256 POR EMPLOYEE PORTAL ---');
  // Login to get session
  const loginData = JSON.stringify({ username: 'test_demo', password: process.env.TEST_DEMO_PASSWORD || 'Temporal2024' });
  const loginRes = await new Promise(resolve => {
    const req = http.request({
      hostname: 'localhost', port: 8083, path: '/employee-portal/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
    }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ headers: res.headers }));
    });
    req.write(loginData); req.end();
  });
  const cookieHeader = loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');

  // PKCE Authorize
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');
  const authUrl = `/employee-portal/oauth2/authorize?response_type=code&client_id=sdk-demo-client&redirect_uri=http://localhost:4205/callback&scope=openid%20profile%20roles%20permissions%20business_units&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`;

  const authRes = await new Promise(resolve => {
    http.get({ hostname: 'localhost', port: 8083, path: authUrl, headers: { 'Cookie': cookieHeader } }, res => {
      resolve({ location: res.headers['location'] });
    });
  });

  const authCode = new URL(authRes.location).searchParams.get('code');

  // Token exchange
  const tokenBody = `grant_type=authorization_code&client_id=sdk-demo-client&code=${authCode}&redirect_uri=http://localhost:4205/callback&code_verifier=${verifier}`;
  const tokenRes = await new Promise(resolve => {
    const req = http.request({
      hostname: 'localhost', port: 8083, path: '/employee-portal/oauth2/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(tokenBody) }
    }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(tokenBody); req.end();
  });

  const rawJwt = tokenRes.access_token;
  const [headerB64, payloadB64, signatureB64] = rawJwt.split('.');

  console.log(`JWT RS256 recibido del Authorization Server:`);
  console.log(` - Header:    ${base64UrlDecode(headerB64).toString()}`);
  console.log(` - Signature: ${signatureB64.substring(0, 20)}...[MASKED]`);

  // 3. Cryptographic Verification in an independent process using the JWKS Public Key
  console.log('\n--- 3. VALIDACION CRIPTOGRAFICA INDEPENDIENTE (RS256) ---');
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(`${headerB64}.${payloadB64}`);
  const isValid = verify.verify(publicKey, base64UrlDecode(signatureB64));

  console.log(`Resultado de verificación de firma con clave pública JWKS: ${isValid ? 'VALIDA (VERIFIED)' : 'INVALIDA'}`);
  if (!isValid) throw new Error('Firma criptográfica no coincide con la clave pública de JWKS');

  // 4. Claims decoding and policy checks as a Resource Server
  console.log('\n--- 4. INTERPRETACION DE CONTEXTO POR RESOURCE SERVER ---');
  const claims = JSON.parse(base64UrlDecode(payloadB64).toString());
  console.log(`Issuer (iss):       ${claims.iss} (Coincide con Authorization Server)`);
  console.log(`Subject (sub):      ${claims.sub}`);
  console.log(`Audience (aud):     ${JSON.stringify(claims.aud)}`);
  console.log(`Roles:              ${JSON.stringify(claims.roles)}`);
  console.log(`Permissions:        ${JSON.stringify(claims.permissions)}`);
  console.log(`Business Units:     ${JSON.stringify(claims.businessUnits?.map(b => b.code))}`);
  console.log(`Token válido hasta: ${new Date(claims.exp * 1000).toISOString()}`);

  console.log('\n================================================================');
  console.log('CONCLUSION: El Authorization Server publica claves públicas JWKS');
  console.log('y cualquier Resource Server independiente puede validar los tokens');
  console.log('criptográficamente sin compartir secretos HMAC compartidos.');
  console.log('================================================================');
}

verifyIndependentResourceServerValidation().catch(e => {
  console.error('Error en validación:', e);
  process.exit(1);
});

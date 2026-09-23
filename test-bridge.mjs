import http from 'http';

function postJson(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost', port: 8083, path: path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(b || '{}') }));
    });
    req.on('error', reject); req.write(postData); req.end();
  });
}

function getHttp(path, token, cookie) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (cookie) headers['Cookie'] = cookie;
    const req = http.request({
      hostname: 'localhost', port: 8083, path: path, method: 'GET', headers: headers
    }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
    });
    req.on('error', reject); req.end();
  });
}

async function testFullBridge() {
  console.log('================================================================');
  console.log('TEST PUENTE: POST /auth/login -> HttpSession -> /oauth2/authorize');
  console.log('================================================================');

  console.log('\n1. POST /api/v1/auth/login con test_demo...');
  const loginRes = await postJson('/employee-portal/api/v1/auth/login', {
    username: 'test_demo',
    password: 'Temporal2024'
  });
  console.log(`Status: ${loginRes.status}`);
  const setCookies = loginRes.headers['set-cookie'] || [];
  console.log(`Set-Cookie headers recibidos (${setCookies.length}):`);
  setCookies.forEach(c => console.log(`   ${c}`));

  const jsessionCookie = setCookies.find(c => c.startsWith('JSESSIONID='));
  console.log(`JSESSIONID presente: ${!!jsessionCookie}`);
  if (jsessionCookie) {
    console.log(`Valor de Cookie: ${jsessionCookie.split(';')[0]}`);
  }

  const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');

  console.log('\n2. GET /oauth2/authorize usando la cookie de sesión JSESSIONID...');
  const authPath = '/employee-portal/oauth2/authorize?response_type=code&client_id=sdk-demo-client&redirect_uri=http://localhost:4205/callback&scope=openid%20profile%20roles%20permissions%20business_units&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&state=xyz123';
  
  const authRes = await getHttp(authPath, null, cookieHeader);
  console.log(`Status de /oauth2/authorize: ${authRes.status} (Esperado: 302 hacia callback)`);
  console.log(`Location Header: ${authRes.headers['location']}`);

  if (authRes.headers['location']) {
    const loc = authRes.headers['location'];
    if (loc.includes('/api/v1/auth/login')) {
      console.log('FALLO: Redirigió a LoginUrlAuthenticationEntryPoint (/api/v1/auth/login)!');
    } else if (loc.includes('http://localhost:4205/callback?code=')) {
      console.log('ÉXITO TOTAL: Sesión reconocida por SAS. Código de autorización generado en callback.');
      const code = new URL(loc).searchParams.get('code');
      console.log(`Authorization Code: ${code.substring(0, 10)}...[MASKED]`);
    } else {
      console.log(`Redirección a otra URL: ${loc}`);
    }
  }
}

testFullBridge().catch(console.error);

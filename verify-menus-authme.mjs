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

async function verifyAuthMe() {
  console.log('--- 1. LOGIN test_demo ---');
  const loginRes = await postJson('/employee-portal/api/v1/auth/login', {
    username: 'test_demo',
    password: 'Temporal2024'
  });
  console.log(`Login status: ${loginRes.status}`);
  const setCookies = loginRes.headers['set-cookie'];
  const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');

  console.log('\n--- 2. GET /api/v1/auth/me ---');
  const meRes = await getHttp('/employee-portal/api/v1/auth/me', null, cookieHeader);
  console.log(`HTTP Status: ${meRes.status}`);
  const meData = JSON.parse(meRes.body);

  const sdkRoot = meData.menus?.find(m => m.code === 'SDK_DEMO_ROOT');
  console.log(`Menú raíz SDK_DEMO_ROOT:`);
  console.log(` - code: ${sdkRoot?.code}`);
  console.log(` - targetType: ${sdkRoot?.targetType}`);
  console.log(` - externalUrl: ${sdkRoot?.externalUrl}`);
  console.log(` - resolvedUrl: ${sdkRoot?.resolvedUrl}`);

  console.log(`\nSubmenús SDK_DEMO (${sdkRoot?.children?.length || 0}):`);
  for (const child of (sdkRoot?.children || [])) {
    console.log(`Item [${child.code}]:`);
    console.log(`  label:       "${child.label}"`);
    console.log(`  targetType:  ${child.targetType}`);
    console.log(`  externalUrl: ${child.externalUrl}`);
    console.log(`  resolvedUrl: ${child.resolvedUrl}`);
    console.log(`  route:       ${child.route}`);
  }
}

verifyAuthMe().catch(console.error);

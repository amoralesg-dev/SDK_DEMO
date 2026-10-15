import { chromium } from 'playwright';
import crypto from 'crypto';

const ARTIFACT_DIR = 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let authorizeCount = 0;
  let callbackCount = 0;
  let tokenCount = 0;

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GUARD') || text.includes('[AUTH SERVICE') || text.includes('[CALLBACK') || text.includes('[SHELL') || text.includes('[STORAGE')) {
      console.log(`    [LOG] ${text}`);
    }
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('/oauth2/authorize')) authorizeCount++;
    if (url.includes('/callback')) callbackCount++;
    if (url.includes('/oauth2/token')) tokenCount++;
  });

  console.log('\n================================================================');
  console.log('PRUEBA MÍNIMA: rassiniAuthGuard (Sin token -> NO OAuth, -> /logout)');
  console.log('================================================================\n');

  // 1. Login central en backend 8083 para establecer la sesión del usuario (JSESSIONID SSO)
  console.log('--- 1. Login en Backend 8083 (test_demo) ---');
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test_demo', password: 'Temporal2024' })
  });
  const setCookie = loginRes.headers.get('set-cookie');
  const jsessionIdMatch = setCookie ? setCookie.match(/JSESSIONID=([^;]+)/) : null;
  const jsessionId = jsessionIdMatch ? jsessionIdMatch[1] : null;

  await context.addCookies([
    {
      name: 'JSESSIONID',
      value: jsessionId,
      domain: 'localhost',
      path: '/employee-portal',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }
  ]);
  console.log('✓ JSESSIONID SSO establecido:', jsessionId);

  // 2. Simular el flujo legítimo inicial de entrada a SDK DEMO vía handshake OIDC
  console.log('\n--- 2. Iniciar sesión legítima en SDK DEMO vía OIDC ---');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');

  // Navegar a SDK DEMO para inicializar el origen localhost:4205
  await page.goto('http://localhost:4205/logout');
  await page.waitForTimeout(500);

  // Guardar PKCE en sessionStorage de SDK DEMO
  await page.evaluate(({ s, n, v }) => {
    sessionStorage.setItem('rassini_auth_state', s);
    sessionStorage.setItem('rassini_auth_nonce', n);
    sessionStorage.setItem('rassini_auth_verifier', v);
  }, { s: state, n: nonce, v: verifier });

  // Iniciar handshake OIDC con el Authorization Server
  const authUrl = `http://localhost:8083/employee-portal/oauth2/authorize?response_type=code&client_id=sdk-demo-client&redirect_uri=http%3A%2F%2Flocalhost%3A4205%2Fcallback&scope=openid+profile+email+roles+permissions+business_units+offline_access&state=${state}&nonce=${nonce}&code_challenge=${challenge}&code_challenge_method=S256`;
  await page.goto(authUrl);

  // Esperar a que /callback intercambie tokens y navegue a /home
  await page.waitForURL(url => url.pathname.includes('/home'), { timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log('✓ Usuario autenticado legítimamente en SDK DEMO:', page.url());

  // 3. Navegar por rutas protegidas para poblar el historial
  console.log('\n--- 3. Navegación por rutas protegidas (poblando historial) ---');
  await page.click('a[href*="context"]');
  await page.waitForTimeout(1000);
  console.log('  -> en /context:', page.url());

  await page.click('a[href*="guards"]');
  await page.waitForTimeout(1000);
  console.log('  -> en /guards:', page.url());

  await page.click('a[href*="home"]');
  await page.waitForTimeout(1000);
  console.log('  -> en /home:', page.url());

  // 4. Click en "Cerrar Sesión" (Logout)
  console.log('\n--- 4. Ejecutar LOGOUT ---');
  await page.click('.pi-sign-out');
  await page.waitForURL(url => url.origin.includes('4200') && url.pathname.includes('/auth/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('✓ Logout ejecutado, navegó al Portal Login:', page.url());

  // Resetear contadores de red antes de probar la navegación Atrás
  authorizeCount = 0;
  callbackCount = 0;
  tokenCount = 0;

  // 6. ATRÁS x1
  console.log('\n--- 6. ATRÁS x1 ---');
  await page.goBack();
  await page.waitForTimeout(2000);
  const url1 = page.url();
  const shell1 = await page.locator('rui-shell').count();
  const sidebar1 = await page.locator('rui-sidebar, .layout-sidebar').count();
  const topbar1 = await page.locator('rui-topbar, .layout-topbar').count();
  const menuLinks1 = await page.locator('a[href="/context"], a[href="/guards"], a[href="/home"]').count();
  console.log(`  URL: ${url1}`);
  console.log(`  shell: ${shell1} | sidebar: ${sidebar1} | topbar: ${topbar1} | menuLinks: ${menuLinks1}`);
  console.log(`  authorize: ${authorizeCount} | callback: ${callbackCount} | token: ${tokenCount}`);
  await page.screenshot({ path: `${ARTIFACT_DIR}/min_test_back1.png` });

  // 7. ATRÁS x2
  console.log('\n--- 7. ATRÁS x2 ---');
  await page.goBack();
  await page.waitForTimeout(2000);
  const url2 = page.url();
  const shell2 = await page.locator('rui-shell').count();
  const sidebar2 = await page.locator('rui-sidebar, .layout-sidebar').count();
  const topbar2 = await page.locator('rui-topbar, .layout-topbar').count();
  const menuLinks2 = await page.locator('a[href="/context"], a[href="/guards"], a[href="/home"]').count();
  console.log(`  URL: ${url2}`);
  console.log(`  shell: ${shell2} | sidebar: ${sidebar2} | topbar: ${topbar2} | menuLinks: ${menuLinks2}`);
  console.log(`  authorize: ${authorizeCount} | callback: ${callbackCount} | token: ${tokenCount}`);
  await page.screenshot({ path: `${ARTIFACT_DIR}/min_test_back2.png` });

  // 8. ATRÁS x3
  console.log('\n--- 8. ATRÁS x3 ---');
  await page.goBack();
  await page.waitForTimeout(2000);
  const url3 = page.url();
  const shell3 = await page.locator('rui-shell').count();
  const sidebar3 = await page.locator('rui-sidebar, .layout-sidebar').count();
  const topbar3 = await page.locator('rui-topbar, .layout-topbar').count();
  const menuLinks3 = await page.locator('a[href="/context"], a[href="/guards"], a[href="/home"]').count();
  console.log(`  URL: ${url3}`);
  console.log(`  shell: ${shell3} | sidebar: ${sidebar3} | topbar: ${topbar3} | menuLinks: ${menuLinks3}`);
  console.log(`  authorize: ${authorizeCount} | callback: ${callbackCount} | token: ${tokenCount}`);
  await page.screenshot({ path: `${ARTIFACT_DIR}/min_test_back3.png` });

  // Conclusión
  const allClear = (shell1 === 0 && sidebar1 === 0 && topbar1 === 0 && menuLinks1 === 0) &&
                   (shell2 === 0 && sidebar2 === 0 && topbar2 === 0 && menuLinks2 === 0) &&
                   (shell3 === 0 && sidebar3 === 0 && topbar3 === 0 && menuLinks3 === 0) &&
                   (authorizeCount === 0 && callbackCount === 0 && tokenCount === 0);

  console.log('\n================================================================');
  console.log('RESULTADO DE LA PRUEBA MÍNIMA:');
  console.log('================================================================');
  if (allClear) {
    console.log('✅ DEMOSTRADO CON ÉXITO:');
    console.log('   Al eliminar buildAuthorizationUrl() del guard cuando no hay tokens:');
    console.log('   - shell = 0');
    console.log('   - sidebar = 0');
    console.log('   - topbar = 0');
    console.log('   - menuLinks = 0');
    console.log('   - authorize = 0');
    console.log('   - callback = 0');
    console.log('   - token = 0');
    console.log('   El auto-login del guard era la causa raíz directa del defecto.');
  } else {
    console.log('❌ No se cumplió el resultado esperado.');
  }

  await browser.close();
})();

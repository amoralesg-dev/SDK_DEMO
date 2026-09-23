import http from 'http';
import crypto from 'crypto';
import { chromium } from 'playwright';

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

async function getAuthCode() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');

  const loginBody = JSON.stringify({ username: 'test_demo', password: 'Temporal2024' });
  const loginRes = await req({
    hostname: 'localhost', port: 8083,
    path: '/employee-portal/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) }
  }, loginBody);

  const jsessionCookie = (loginRes.headers['set-cookie'] || [])
    .map(c => c.split(';')[0])
    .find(c => c.startsWith('JSESSIONID'));

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

  const location = authorizeRes.headers['location'] || '';
  return { location, verifier, state, nonce };
}

async function inspect(page, name) {
  return await page.evaluate((name) => {
    const bodyStyle = window.getComputedStyle(document.body);
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const appRoot = document.querySelector('app-root');
    const ruiShell = document.querySelector('rui-shell');
    const ruiShellContent = document.querySelector('.rui-shell-content');
    const layoutWrapper = document.querySelector('.layout-wrapper');
    const layoutMain = document.querySelector('.layout-main');

    const cssVars = [
      '--surface-ground',
      '--surface-card',
      '--surface-border',
      '--text-color',
      '--text-color-secondary',
      '--primary-color',
      '--p-primary-color',
      '--p-content-background'
    ];
    const varsValues = {};
    for (const v of cssVars) {
      varsValues[v] = htmlStyle.getPropertyValue(v).trim() || bodyStyle.getPropertyValue(v).trim();
    }

    const favicon = document.querySelector('link[rel*="icon"]')?.href || 'none';
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    const styles = document.querySelectorAll('style').length;

    // Get cards
    const cards = Array.from(document.querySelectorAll('.surface-card, .card, [class*="card"], .p-card')).slice(0, 3).map(card => {
      const s = window.getComputedStyle(card);
      return {
        tag: card.tagName,
        classes: card.className,
        backgroundColor: s.backgroundColor,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
        padding: s.padding
      };
    });

    return {
      appName: name,
      title: document.title,
      favicon,
      body: {
        classes: document.body.className,
        fontFamily: bodyStyle.fontFamily,
        color: bodyStyle.color,
        backgroundColor: bodyStyle.backgroundColor,
        margin: bodyStyle.margin,
        padding: bodyStyle.padding
      },
      appRoot: {
        classes: appRoot ? appRoot.className : 'NOT FOUND',
        tagName: appRoot?.tagName
      },
      layoutWrapper: layoutWrapper ? {
        classes: layoutWrapper.className,
        backgroundColor: window.getComputedStyle(layoutWrapper).backgroundColor
      } : null,
      layoutMain: layoutMain ? {
        classes: layoutMain.className,
        backgroundColor: window.getComputedStyle(layoutMain).backgroundColor
      } : null,
      ruiShell: ruiShell ? {
        classes: ruiShell.className,
        display: window.getComputedStyle(ruiShell).display
      } : null,
      ruiShellContent: ruiShellContent ? {
        classes: ruiShellContent.className,
        backgroundColor: window.getComputedStyle(ruiShellContent).backgroundColor,
        padding: window.getComputedStyle(ruiShellContent).padding,
        marginLeft: window.getComputedStyle(ruiShellContent).marginLeft
      } : null,
      cards,
      cssVars: varsValues,
      links,
      styleTagsCount: styles
    };
  }, name);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Employee Portal
  const portalPage = await context.newPage();
  console.log('1. Loading Employee Portal...');
  await portalPage.goto('http://localhost:4200');
  await portalPage.waitForSelector('.rui-login input', { timeout: 15000 });
  await portalPage.locator('.rui-login input').first().fill('test_demo');
  await portalPage.locator('input[type="password"], .rui-login input').nth(1).fill('Temporal2024');
  await portalPage.locator('.rui-login button').first().click();
  
  await portalPage.waitForSelector('rui-shell', { timeout: 15000 });
  await portalPage.waitForTimeout(2000);

  const portalInfo = await inspect(portalPage, 'Employee Portal (4200)');
  await portalPage.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/portal_real_state.png' });
  console.log('Portal screenshot saved.');

  // 2. SDK DEMO
  console.log('2. Loading SDK Demo via OIDC code flow...');
  const sdkPage = await context.newPage();
  sdkPage.on('console', msg => console.log('[sdkPage console]', msg.type(), msg.text()));
  sdkPage.on('pageerror', err => console.log('[sdkPage error]', err.message));
  
  // Set PKCE code_verifier in sessionStorage before callback
  const { location, verifier, state, nonce } = await getAuthCode();
  console.log('Auth redirect URL:', location);
  
  // Navigate to callback URL
  await sdkPage.goto('http://localhost:4205');
  await sdkPage.evaluate(({ v, s, n }) => {
    sessionStorage.setItem('rassini_auth_verifier', v);
    sessionStorage.setItem('rassini_auth_state', s);
    sessionStorage.setItem('rassini_auth_nonce', n);
  }, { v: verifier, s: state, n: nonce });
  
  await sdkPage.goto(location);
  await sdkPage.waitForSelector('rui-shell', { timeout: 15000 });
  await sdkPage.waitForTimeout(2000);

  const sdkInfo = await inspect(sdkPage, 'SDK_DEMO (4205)');
  await sdkPage.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/sdk_real_state.png' });
  console.log('SDK Demo screenshot saved.');

  await browser.close();

  console.log('\n============================== COMPARISON DUMP ==============================');
  console.log(JSON.stringify({ portalInfo, sdkInfo }, null, 2));
}

run().catch(console.error);

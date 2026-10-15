import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = 'C:/workspace/ROC_PortalCxP/front/dist';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function serve(dir, port) {
  const base = path.join(ROOT, dir, 'browser');
  const root = fs.existsSync(base) ? base : path.join(ROOT, dir);
  return new Promise(res => {
    const s = http.createServer((req, rs) => {
      let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
      rs.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rs);
    }).listen(port, () => res(s));
  });
}

const results = [];
const rec = (c, ok, d) => { results.push({ c, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${c} | ${d}`); };

const browser = await chromium.launch({ headless: true });

// ---------- CASO 2 (DEV/local build servido): contingencia con OIDC no disponible ----------
// Build "dev" servido en 4301: issuer remoto inalcanzable => OIDC no funciona; contingencia debe operar.
for (const [name, port, expectExists] of [['v-dev', 4301, true], ['v-qa', 4302, false], ['v-prod', 4303, false]]) {
  const srv = await serve(name, port);
  const ctx = await browser.newContext();
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  // Simular backend ms-pagos del entorno (el build apunta a IP/host externos) para aislar la validación de la ruta.
  await page.route('**/ms-pagos/**', async route => {
    const u = route.request().url();
    if (u.endsWith('/usuarios/login')) {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ id: 1, usuario: 'msantillan', nombre: 'Monica', bu: 'ALL', rol: 'CXP_USER', activo: true }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' });
  });
  await page.goto(`http://localhost:${port}/contingencia`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const url = page.url();
  const hasForm = await page.locator('#contingencia-submit').count();
  if (expectExists) {
    rec(`${name} /contingencia existe`, hasForm === 1 && url.includes('/contingencia'), url);
    await page.fill('input[name=usuario]', 'msantillan');
    await page.fill('input[name=password]', 'Temporal2024');
    await page.click('#contingencia-submit');
    await page.waitForURL(u => u.pathname.includes('/contingencia/app/pagos-pendientes'), { timeout: 8000 }).catch(() => {});
    rec(`${name} login contingencia -> pagos-pendientes`, page.url().includes('/contingencia/app/pagos-pendientes'), page.url());
    // protegida: sin sesión
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await p2.goto(`http://localhost:${port}/contingencia/app/pagos-pendientes`, { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(2000);
    rec(`${name} ruta contingencia protegida sin sesión`, !p2.url().includes('/app/'), p2.url());
    await ctx2.close();
    // no aparece en menú: texto "contingencia" ausente en ruta principal no aplica (OIDC redirige); verificamos que el shell no la enlaza
  } else {
    rec(`${name} /contingencia NO existe`, hasForm === 0 && !url.includes('/contingencia'), `url final=${url}`);
    await page.goto(`http://localhost:${port}/contingencia/app/pagos-pendientes`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    rec(`${name} /contingencia/app/* NO existe`, !page.url().includes('/contingencia'), `url final=${page.url()}`);
  }
  await ctx.close();
  srv.close();
}

// ---------- CASO 1 (local real, OIDC funcionando): ya validado por rassini shell ----------
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const r = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m = (r.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  await ctx.addCookies([{ name: 'JSESSIONID', value: m[1], domain: 'localhost', path: '/employee-portal', httpOnly: true, secure: false, sameSite: 'Lax' }]);
  await page.goto('http://localhost:4200/pagos-pendientes');
  await page.waitForURL(u => u.pathname.includes('/pagos-pendientes'), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const hasShell = await page.locator('rui-shell').count();
  const html = await page.content();
  rec('CASO1 OIDC normal -> Pagos Pendientes con rui-shell', page.url().includes('/pagos-pendientes') && hasShell === 1, page.url());
  rec('CASO1 contingencia NO aparece en shell/menú', !/contingencia/i.test(html), 'html sin "contingencia"');
  await ctx.close();
}

// ---------- CASO 2 real local: contingencia contra ms-pagos real en 8082 ----------
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage(); page.setDefaultTimeout(10000);
  await page.goto('http://localhost:4200/contingencia', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#contingencia-submit');
  await page.fill('input[name=usuario]', 'msantillan@rassini.com');
  await page.fill('input[name=password]', 'incorrecta');
  await page.click('#contingencia-submit');
  await page.waitForSelector('#contingencia-error', { timeout: 8000 }).catch(() => {});
  rec('CASO2 local real: credencial incorrecta muestra error', (await page.locator('#contingencia-error').count()) === 1 && page.url().endsWith('/contingencia'), page.url());
  await page.fill('input[name=password]', 'Temporal2024');
  await page.click('#contingencia-submit');
  await page.waitForURL(u => u.pathname.includes('/contingencia/app/pagos-pendientes'), { timeout: 10000 }).catch(() => {});
  rec('CASO2 local real: login contingencia con ms-pagos real', page.url().includes('/contingencia/app/pagos-pendientes'), page.url());
  await page.waitForTimeout(2500);
  const bodyTxt = await page.locator('body').innerText();
  rec('CASO2 local real: Pagos Pendientes renderiza sin rui-shell', /Pagos Pendientes/i.test(bodyTxt) && (await page.locator('rui-shell').count()) === 0, 'rui-shell=0');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  rec('CASO2 local real: refresh mantiene contingencia sin loops', page.url().includes('/contingencia/app/pagos-pendientes'), page.url());
  for (const r of ['pagos-enviados', 'pagos-errores', 'pagos-analitica']) {
    await page.click(`a[href$="/contingencia/app/${r}"]`);
    await page.waitForTimeout(1200);
    rec(`CASO2 local real: navega a ${r}`, page.url().endsWith(r), page.url());
  }
  await page.click('#contingencia-logout');
  await page.waitForTimeout(1000);
  rec('CASO2 local real: salir limpia sesión y vuelve a /contingencia', page.url().endsWith('/contingencia') && !(await page.evaluate(() => sessionStorage.getItem('auth_usuario'))), page.url());
  await page.goto('http://localhost:4200/contingencia/app/pagos-pendientes', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  rec('CASO2 local real: ruta protegida sin sesión rebota', !page.url().includes('/app/'), page.url());
  await ctx.close();
}

await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\nTOTAL: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);

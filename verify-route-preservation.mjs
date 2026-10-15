import { chromium } from 'playwright';

const targetRoutes = [
  { name: 'Pagos Pendientes', url: 'http://localhost:4200/pagos-pendientes', expectedPath: '/pagos-pendientes' },
  { name: 'Pagos Enviados', url: 'http://localhost:4200/pagos-enviados', expectedPath: '/pagos-enviados' },
  { name: 'Pagos con Error', url: 'http://localhost:4200/pagos-errores', expectedPath: '/pagos-errores' },
  { name: 'Analítica', url: 'http://localhost:4200/pagos-analitica', expectedPath: '/pagos-analitica' }
];

async function authenticateSso(context) {
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:4200' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);
  if (m && m[1]) {
    await context.addCookies([{
      name: 'JSESSIONID',
      value: m[1],
      domain: 'localhost',
      path: '/employee-portal',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }]);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const target of targetRoutes) {
    console.log(`\n==================================================`);
    console.log(`PROBANDO RUTA SOLICITADA: ${target.name} (${target.url})`);
    console.log(`==================================================`);

    // Contexto aislado por cada prueba para simular que no tiene sesión en CxP
    const context = await browser.newContext();
    await authenticateSso(context);

    const page = await context.newPage();

    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('CALLBACK') || txt.includes('OIDC') || txt.includes('Target')) {
        console.log('[BROWSER]', txt);
      }
    });

    console.log(`1. Navegando directamente a: ${target.url}...`);
    await page.goto(target.url);

    // Esperar redirección OIDC -> AS -> /callback -> pantalla destino final
    await page.waitForTimeout(4000);

    const finalUrl = page.url();
    console.log(`2. URL Final alcanzada: ${finalUrl}`);

    const parsedFinal = new URL(finalUrl);
    const success = parsedFinal.pathname === target.expectedPath;

    console.log(`3. Resultado: ${success ? '✅ ÉXITO - Pantalla correcta' : '❌ FALLO - No navegó a la pantalla esperada'}`);
    if (!success) {
      console.error(`   Esperado: ${target.expectedPath} | Recibido: ${parsedFinal.pathname}`);
    }

    const screenshotPath = `C:/workspace/SDK_DEMO/evidence-${target.expectedPath.replace('/', '')}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`4. Evidencia gráfica guardada en: ${screenshotPath}`);

    await context.close();
  }

  // Validación adicional: Dashboard directo sigue funcionando
  console.log(`\n==================================================`);
  console.log(`VALIDANDO ACCESO DIRECTO A DASHBOARD: /dashboard`);
  console.log(`==================================================`);
  const context = await browser.newContext();
  await authenticateSso(context);
  const page = await context.newPage();
  await page.goto('http://localhost:4200/dashboard');
  await page.waitForTimeout(4000);
  const finalDashboardUrl = page.url();
  console.log(`URL Final para dashboard: ${finalDashboardUrl}`);
  console.log(`Resultado Dashboard: ${finalDashboardUrl.includes('/dashboard') ? '✅ ÉXITO' : '❌ FALLO'}`);
  await page.screenshot({ path: 'C:/workspace/SDK_DEMO/evidence-dashboard.png' });
  await context.close();

  await browser.close();
  console.log('\n=== SUITE COMPLETA DE VALIDACIÓN CONCLUIDA ===');
})();

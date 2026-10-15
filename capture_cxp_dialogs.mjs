import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // 1. Iniciar sesión central en IAM
  const loginRes = await fetch('http://localhost:8083/employee-portal/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'msantillan', password: 'Temporal2024' })
  });
  const m = (loginRes.headers.get('set-cookie') || '').match(/JSESSIONID=([^;]+)/);

  async function createContext() {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (m) {
      await ctx.addCookies([{
        name: 'JSESSIONID',
        value: m[1],
        domain: 'localhost',
        path: '/employee-portal',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }]);
    }
    return ctx;
  }

  // --- CAPTURA EN PORTAL CXP ---
  console.log('Capturando Portal CxP...');
  const cxpCtx = await createContext();
  const cxpPage = await cxpCtx.newPage();
  await cxpPage.goto('http://localhost:4200/dashboard');
  await cxpPage.waitForTimeout(3000);

  // Perfil
  await cxpPage.click('.rui-profile-button');
  await cxpPage.waitForTimeout(500);
  await cxpPage.locator('.rui-profile-dropdown button:has-text("Mi Perfil")').click();
  await cxpPage.waitForTimeout(1000);
  await cxpPage.screenshot({ path: 'cxp-homologado-perfil.png' });
  await cxpPage.keyboard.press('Escape');
  await cxpPage.waitForTimeout(500);

  // 2FA
  await cxpPage.click('.rui-profile-button');
  await cxpPage.waitForTimeout(500);
  await cxpPage.locator('.rui-profile-dropdown button:has-text("Seguridad")').click();
  await cxpPage.waitForTimeout(2000);
  await cxpPage.screenshot({ path: 'cxp-homologado-2fa.png' });
  await cxpPage.keyboard.press('Escape');
  await cxpPage.waitForTimeout(500);

  // Contraseña
  await cxpPage.click('.rui-profile-button');
  await cxpPage.waitForTimeout(500);
  await cxpPage.locator('.rui-profile-dropdown button:has-text("Cambiar Contraseña")').click();
  await cxpPage.waitForTimeout(1000);
  await cxpPage.screenshot({ path: 'cxp-homologado-password.png' });
  await cxpPage.keyboard.press('Escape');
  await cxpPage.waitForTimeout(500);

  // Roles
  await cxpPage.click('.rui-profile-button');
  await cxpPage.waitForTimeout(500);
  await cxpPage.locator('.rui-profile-dropdown button:has-text("Mis Roles")').click();
  await cxpPage.waitForTimeout(1000);
  await cxpPage.screenshot({ path: 'cxp-homologado-roles.png' });
  await cxpPage.keyboard.press('Escape');
  await cxpPage.waitForTimeout(500);

  // Permisos
  await cxpPage.click('.rui-profile-button');
  await cxpPage.waitForTimeout(500);
  await cxpPage.locator('.rui-profile-dropdown button:has-text("Mis Permisos")').click();
  await cxpPage.waitForTimeout(1000);
  await cxpPage.screenshot({ path: 'cxp-homologado-permisos.png' });
  await cxpPage.keyboard.press('Escape');
  await cxpPage.waitForTimeout(500);

  await browser.close();
  console.log('Capturas CxP homologadas completadas.');
})();

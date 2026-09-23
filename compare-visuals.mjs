import { chromium } from 'playwright';

async function inspect(page, name) {
  return await page.evaluate((name) => {
    const bodyStyle = window.getComputedStyle(document.body);
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const appRoot = document.querySelector('app-root');
    const ruiShell = document.querySelector('rui-shell');
    const ruiShellContent = document.querySelector('.rui-shell-content');
    const layoutWrapper = document.querySelector('.layout-wrapper');
    const layoutMain = document.querySelector('.layout-main');

    // Get css variables
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

    // Favicon
    const favicon = document.querySelector('link[rel*="icon"]')?.href || 'none';

    // Style and link tags
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    const styles = document.querySelectorAll('style').length;

    return {
      appName: name,
      title: document.title,
      favicon,
      htmlBackground: htmlStyle.backgroundColor,
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
      firstCard: (() => {
        const card = document.querySelector('.surface-card, .card, [class*="card"], .p-card');
        if (!card) return null;
        const s = window.getComputedStyle(card);
        return {
          classes: card.className,
          backgroundColor: s.backgroundColor,
          borderRadius: s.borderRadius,
          boxShadow: s.boxShadow,
          padding: s.padding
        };
      })(),
      cssVars: varsValues,
      links,
      styleTagsCount: styles
    };
  }, name);
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  const page = await context.newPage();
  console.log('1. Logging in to Employee Portal...');
  await page.goto('http://localhost:4200');
  
  await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 15000 });
  await page.locator('input[type="text"], input[name="username"]').first().fill('test_demo');
  await page.locator('input[type="password"]').first().fill('Temporal2024');
  await page.keyboard.press('Enter');

  await page.waitForURL(u => !u.includes('/auth/login') && !u.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('Portal loaded, current URL:', page.url());

  const portalInfo = await inspect(page, 'Employee Portal (4200)');
  await page.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/portal_real_state.png' });

  // Now click SDK Demo or open SDK Demo in a new page within the same authenticated context
  console.log('2. Opening SDK Demo...');
  const pageSdk = await context.newPage();
  // We can trigger /oauth2/authorize directly with client_id=sdk-demo-client or open http://localhost:4205/home
  await pageSdk.goto('http://localhost:4205/home');
  // Wait for redirect to /oauth2/authorize and back to /callback and then /home
  await pageSdk.waitForURL('**/home', { timeout: 15000 });
  await pageSdk.waitForTimeout(2000);
  console.log('SDK Demo loaded, current URL:', pageSdk.url());

  const sdkInfo = await inspect(pageSdk, 'SDK_DEMO (4205)');
  await pageSdk.screenshot({ path: 'C:/Users/amoralesg/.gemini/antigravity-cli/brain/c031b7f3-0bde-4a0a-aa50-14c07ea9ae61/sdk_real_state.png' });

  await browser.close();

  console.log('=== COMPARISON RESULTS ===');
  console.log(JSON.stringify({ portalInfo, sdkInfo }, null, 2));
}

run().catch(console.error);

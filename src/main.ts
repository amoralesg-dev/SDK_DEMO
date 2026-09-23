import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

console.log('[MAIN START] Bootstrapping Angular Application...');

bootstrapApplication(App, appConfig)
  .then(() => console.log('[BOOTSTRAP SUCCESS] Angular Application Bootstrapped successfully.'))
  .catch((err) => console.error('[BOOTSTRAP ERROR]', err));

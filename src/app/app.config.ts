import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { 
  provideRassiniCorporate, 
  CorporateOidcConfig,
  provideRassiniTheme
} from '@rassini/rassini-ui';

import { routes } from './app.routes';

export const SDK_DEMO_OIDC_CONFIG: CorporateOidcConfig = {
  applicationCode: 'SDK_DEMO',
  clientId: 'sdk-demo-client',
  issuer: 'http://localhost:8083/employee-portal',
  redirectUri: 'http://localhost:4205/callback',
  postLogoutRedirectUri: 'http://localhost:4205',
  scope: 'openid profile email roles permissions business_units offline_access',
  allowedApiOrigins: [
    'http://localhost:8083'
  ]
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    provideRassiniTheme(),
    provideRassiniCorporate({
      oidc: SDK_DEMO_OIDC_CONFIG
    })
  ]
};

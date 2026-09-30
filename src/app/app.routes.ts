import { Routes } from '@angular/router';
import { 
  rassiniAuthGuard, 
  rassiniPermissionGuard 
} from '@rassini/rassini-ui';

import { ShellLayoutComponent } from './layout/shell-layout.component';
import { HomeComponent } from './pages/home.component';
import { CallbackComponent } from './pages/callback.component';
import { AccessDeniedComponent } from './pages/access-denied.component';
import { NavigationDemoComponent } from './pages/navigation-demo.component';
import { ContextDemoComponent } from './pages/context-demo.component';
import { GuardsDemoComponent, GuardsAuthorizedComponent } from './pages/guards-demo.component';
import { DirectivesDemoComponent } from './pages/directives-demo.component';
import { LogoutComponent } from './pages/logout.component';

export const routes: Routes = [
  // 1. Rutas Públicas / Sesión (Completamente fuera del Shell Corporativo)
  {
    path: 'logout',
    component: LogoutComponent
  },
  {
    path: 'callback',
    component: CallbackComponent
  },
  {
    path: 'access-denied',
    component: AccessDeniedComponent
  },

  // 2. Shell Corporativo Autenticado (Protegido con rassiniAuthGuard)
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [rassiniAuthGuard],
    canActivateChild: [rassiniAuthGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        component: HomeComponent
      },
      {
        path: 'navigation',
        component: NavigationDemoComponent
      },
      {
        path: 'context',
        component: ContextDemoComponent
      },
      {
        path: 'guards',
        component: GuardsDemoComponent
      },
      {
        path: 'guards/authorized',
        component: GuardsAuthorizedComponent,
        canActivate: [rassiniPermissionGuard],
        data: { permission: 'SDK_DEMO_ACCESS' }
      },
      {
        path: 'guards/restricted',
        component: GuardsAuthorizedComponent,
        canActivate: [rassiniPermissionGuard],
        data: { permission: 'SDK_DEMO_ADMIN' }
      },
      {
        path: 'directives',
        component: DirectivesDemoComponent
      }
    ]
  },

  // Fallback seguro: Redirige a logout si no coincide ninguna ruta
  { path: '**', redirectTo: 'logout' }
];

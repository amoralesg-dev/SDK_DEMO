import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { 
  AuthenticationService, 
  NavigationService, 
  RassiniShell,
  RassiniMenuItem,
  CorporateNavigationMenu
} from '@rassini/rassini-ui';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RassiniShell],
  template: `
    @if (authService.isAuthenticated()) {
      <rui-shell 
        [menu]="menuTree()" 
        (logout)="onLogout()">
        <router-outlet></router-outlet>
      </rui-shell>
    }
  `
})
export class ShellLayoutComponent implements OnInit {
  readonly authService = inject(AuthenticationService);
  readonly navService = inject(NavigationService);

  readonly menuTree = computed<RassiniMenuItem[]>(() => {
    if (!this.authService.isAuthenticated()) {
      return [];
    }
    const rawMenus = this.navService.menus();
    if (!rawMenus || rawMenus.length === 0) {
      return [
        {
          label: 'SDK Demo App',
          items: [
            { label: 'Inicio & Sesión', icon: 'pi pi-home', routerLink: '/home' },
            { label: 'Navegación & Menús', icon: 'pi pi-compass', routerLink: '/navigation' },
            { label: 'Contexto & BUs', icon: 'pi pi-cog', routerLink: '/context' },
            { label: 'Validación Guards', icon: 'pi pi-shield', routerLink: '/guards' },
            { label: 'Directivas UI', icon: 'pi pi-palette', routerLink: '/directives' }
          ]
        }
      ];
    }

    return this.mapCorporateMenusToRassiniItems(rawMenus);
  });

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', (event: PageTransitionEvent) => {
        if (!this.authService.isAuthenticated() || !this.authService.hasValidTokenInStorage()) {
          this.navService.clear();
          window.location.replace('http://localhost:4200/employee-portal/auth/login');
        }
      });
    }

    if (this.authService.isAuthenticated()) {
      this.navService.loadNavigation('SDK_DEMO').subscribe();
    }
  }

  onLogout(): void {
    console.log('[SHELL LAYOUT] onLogout() triggered by rui-shell');
    this.navService.clear();
    this.authService.logout(true);
  }

  private mapCorporateMenusToRassiniItems(menus: CorporateNavigationMenu[]): RassiniMenuItem[] {
    return menus.map(m => {
      let targetRoute = m.route;
      if (targetRoute && targetRoute.startsWith('/employee-portal/')) {
        targetRoute = '/' + targetRoute.replace('/employee-portal/', '');
      }

      let isLocalToCurrentApp = false;
      if (m.externalUrl && typeof window !== 'undefined' && window.location) {
        try {
          const parsed = new URL(m.externalUrl, window.location.origin);
          if (parsed.origin === window.location.origin) {
            targetRoute = parsed.pathname + (parsed.search || '');
            isLocalToCurrentApp = true;
          }
        } catch {
          // URL no parseable
        }
      }

      // 3. Revisar la opción de menú SDK_DEMO_LOGOUT: No debe comportarse como navegación normal
      const isLogoutOption = m.code === 'SDK_DEMO_LOGOUT' || 
                             targetRoute === '/logout' || 
                             (m.externalUrl != null && m.externalUrl.endsWith('/logout'));

      if (isLogoutOption) {
        return {
          label: m.label,
          icon: m.icon || 'pi pi-sign-out',
          command: () => this.onLogout(),
          targetType: 'INTERNO',
          routerLink: undefined,
          externalUrl: undefined,
          resolvedUrl: undefined,
          openInNewTab: false
        };
      }

      if (isLocalToCurrentApp) {
        return {
          label: m.label,
          icon: m.icon || 'pi pi-circle',
          routerLink: targetRoute,
          targetType: 'INTERNO',
          externalUrl: undefined,
          resolvedUrl: undefined,
          openInNewTab: false,
          items: m.children && m.children.length > 0 ? this.mapCorporateMenusToRassiniItems(m.children) : undefined
        };
      }

      return {
        label: m.label,
        icon: m.icon || 'pi pi-circle',
        routerLink: targetRoute,
        targetType: m.targetType,
        externalUrl: m.externalUrl || undefined,
        resolvedUrl: m.resolvedUrl || undefined,
        openInNewTab: m.openInNewTab,
        items: m.children && m.children.length > 0 ? this.mapCorporateMenusToRassiniItems(m.children) : undefined
      };
    });
  }
}

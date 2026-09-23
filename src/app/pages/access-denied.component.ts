import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, PageContentComponent } from '@rassini/rassini-ui';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, PageContentComponent],
  template: `
    <app-page-header 
      title="403 - Acceso Denegado" 
      subtitle="Restricción de seguridad evaluada por rassiniPermissionGuard / rassiniRoleGuard" 
      icon="pi pi-exclamation-triangle">
    </app-page-header>

    <app-page-content>
      <div style="padding: 24px; text-align: center; max-width: 600px; margin: 0 auto;">
        <i class="pi pi-lock" style="font-size: 3rem; color: #dc2626; margin-bottom: 1rem;"></i>
        <p style="font-size: 1.1rem; color: #4b5563;">
          El usuario autenticado no posee los roles, permisos o unidades de negocio requeridos en su Token OIDC para acceder a esta ruta.
        </p>
        <div style="margin-top: 1.5rem;">
          <a routerLink="/home" style="display: inline-block; padding: 10px 20px; background-color: #0284c7; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Volver a Inicio
          </a>
        </div>
      </div>
    </app-page-content>
  `
})
export class AccessDeniedComponent {}

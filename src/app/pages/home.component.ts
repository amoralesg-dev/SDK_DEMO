import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  AuthenticationService, 
  PageHeaderComponent, 
  PageContentComponent 
} from '@rassini/rassini-ui';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, PageContentComponent],
  template: `
    <app-page-header 
      title="SDK Demo - Panel de Control Principal" 
      subtitle="Demostración oficial de integración de una nueva aplicación con @rassini/rassini-ui" 
      icon="pi pi-home">
    </app-page-header>

    <app-page-content>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
        <!-- Card: Usuario & Tokens -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h2 style="font-size: 1.15rem; margin-top: 0; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
            👤 Contexto de Identidad (Token-First)
          </h2>
          <table style="width: 100%; font-size: 0.95rem; line-height: 1.8;">
            <tr><td><strong>Usuario:</strong></td><td>{{ authService.currentUser()?.username }}</td></tr>
            <tr><td><strong>ID Usuario:</strong></td><td>{{ authService.currentUser()?.userId }}</td></tr>
            <tr><td><strong>Email:</strong></td><td>{{ authService.currentUser()?.email }}</td></tr>
            <tr><td><strong>Autenticado:</strong></td><td><span style="color: #16a34a; font-weight: 600;">{{ authService.isAuthenticated() ? 'SÍ (Activo)' : 'NO' }}</span></td></tr>
            <tr><td><strong>hasAllBusinessUnits:</strong></td><td>{{ authService.hasAllBusinessUnits() ? 'true' : 'false' }}</td></tr>
          </table>
        </div>

        <!-- Card: Roles & Permisos -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h2 style="font-size: 1.15rem; margin-top: 0; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
            🛡️ Roles y Permisos en Token
          </h2>
          <div>
            <strong>Roles:</strong>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; margin-bottom: 12px;">
              <span *ngFor="let role of authService.roles()" style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 500;">
                {{ role }}
              </span>
            </div>
            <strong>Permisos:</strong>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              <span *ngFor="let perm of authService.permissions()" style="background: #f0fdf4; color: #15803d; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 500;">
                {{ perm }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </app-page-content>
  `
})
export class HomeComponent {
  readonly authService = inject(AuthenticationService);
}

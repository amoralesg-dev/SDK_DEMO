import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  AuthenticationService, 
  RassiniHasRoleDirective, 
  RassiniHasPermissionDirective, 
  RassiniHasBusinessUnitDirective,
  PageHeaderComponent,
  PageContentComponent
} from '@rassini/rassini-ui';

@Component({
  selector: 'app-directives-demo',
  standalone: true,
  imports: [
    CommonModule, 
    RassiniHasRoleDirective, 
    RassiniHasPermissionDirective, 
    RassiniHasBusinessUnitDirective,
    PageHeaderComponent,
    PageContentComponent
  ],
  template: `
    <app-page-header 
      title="Directivas Estructurales Corporativas" 
      subtitle="Demostración de renderizado condicional con Signals reactivos de @rassini/rassini-ui" 
      icon="pi pi-palette">
    </app-page-header>

    <app-page-content>
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 700px;">
        <!-- Directiva de Rol -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; color: #1e293b;">Prueba: *rassiniHasRole</h4>
          <div *rassiniHasRole="'ROLE_DEMO'" style="background: #f0fdf4; color: #15803d; padding: 10px; border-radius: 6px; font-weight: 500; margin-bottom: 8px;">
            ✅ Visible: El usuario tiene el rol ROLE_DEMO.
          </div>
          <div *rassiniHasRole="'ROLE_SUPER_ADMIN'" style="background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; font-weight: 500;">
            ❌ NO DEBE VERSE: Requiere ROLE_SUPER_ADMIN.
          </div>
        </div>

        <!-- Directiva de Permiso -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; color: #1e293b;">Prueba: *rassiniHasPermission</h4>
          <div *rassiniHasPermission="'SDK_DEMO_ACCESS'" style="background: #f0fdf4; color: #15803d; padding: 10px; border-radius: 6px; font-weight: 500; margin-bottom: 8px;">
            ✅ Visible: El usuario tiene el permiso SDK_DEMO_ACCESS.
          </div>
          <div *rassiniHasPermission="'SDK_DEMO_ADMIN'" style="background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; font-weight: 500;">
            ❌ NO DEBE VERSE: Requiere SDK_DEMO_ADMIN (no concedido a test_demo).
          </div>
        </div>

        <!-- Directiva de Business Unit -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; color: #1e293b;">Prueba: *rassiniHasBusinessUnit</h4>
          <div *rassiniHasBusinessUnit="'0111'" style="background: #f0fdf4; color: #15803d; padding: 10px; border-radius: 6px; font-weight: 500; margin-bottom: 8px;">
            ✅ Visible: El usuario tiene asignada la Unidad 0111 (Corporativo).
          </div>
          <div *rassiniHasBusinessUnit="'UNAUTHORIZED_BU'" style="background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 6px; font-weight: 500;">
            ❌ NO DEBE VERSE: Requiere UNAUTHORIZED_BU.
          </div>
        </div>
      </div>
    </app-page-content>
  `
})
export class DirectivesDemoComponent {
  readonly authService = inject(AuthenticationService);
}

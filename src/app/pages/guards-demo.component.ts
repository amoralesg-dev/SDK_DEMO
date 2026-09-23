import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, PageContentComponent } from '@rassini/rassini-ui';

@Component({
  selector: 'app-guards-demo',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, PageContentComponent],
  template: `
    <app-page-header 
      title="Guards de Ruta Corporativos" 
      subtitle="Demostración de evaluación de permisos y roles mediante CanActivateFn de @rassini/rassini-ui" 
      icon="pi pi-shield">
    </app-page-header>

    <app-page-content>
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 650px;">
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; color: #1e293b;">1. Prueba de Permiso Otorgado (SDK_DEMO_ACCESS)</h4>
          <p style="color: #64748b; font-size: 0.9rem;">El usuario <code>test_demo</code> posee este permiso en sus Claims. La navegación se concederá exitosamente.</p>
          <a routerLink="/guards/authorized" style="display: inline-block; padding: 8px 16px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Navegar a Ruta Permitida
          </a>
        </div>

        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h4 style="margin-top: 0; color: #1e293b;">2. Prueba de Permiso Restringido (SDK_DEMO_ADMIN)</h4>
          <p style="color: #64748b; font-size: 0.9rem;">El usuario no posee este permiso. <code>rassiniPermissionGuard</code> interceptará y redirigirá a <code>/access-denied</code>.</p>
          <a routerLink="/guards/restricted" style="display: inline-block; padding: 8px 16px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Intentar Ruta Restringida
          </a>
        </div>
      </div>
    </app-page-content>
  `
})
export class GuardsDemoComponent {}

@Component({
  selector: 'app-guards-authorized',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, PageContentComponent],
  template: `
    <app-page-header 
      title="Acceso Autorizado por Guard" 
      subtitle="Evaluación completada exitosamente con rassiniPermissionGuard" 
      icon="pi pi-check-circle">
    </app-page-header>

    <app-page-content>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; max-width: 600px;">
        <h3 style="color: #15803d; margin-top: 0;">✅ Permiso Verificado: SDK_DEMO_ACCESS</h3>
        <p style="color: #166534;">Has accedido porque tu token emitido por el Authorization Server contiene el claim necesario.</p>
        <a routerLink="/guards" style="color: #0284c7; font-weight: 600; text-decoration: none;">← Volver al menú de guards</a>
      </div>
    </app-page-content>
  `
})
export class GuardsAuthorizedComponent {}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  NavigationService, 
  PageHeaderComponent, 
  PageContentComponent 
} from '@rassini/rassini-ui';

@Component({
  selector: 'app-navigation-demo',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, PageContentComponent],
  template: `
    <app-page-header 
      title="NavigationService - Árbol de Menús Dinámico" 
      subtitle="Demostración del desacoplamiento de menús y aplicaciones desde el backend IAM" 
      icon="pi pi-compass">
    </app-page-header>

    <app-page-content>
      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <button (click)="load()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
          Recargar Menús
        </button>
        <span style="align-self: center; font-size: 0.9rem; color: #64748b;">
          Estado: <strong>{{ navService.loading() ? 'Cargando...' : navService.loaded() ? 'Cargado' : 'Pendiente' }}</strong>
        </span>
      </div>

      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h3 style="margin-top: 0; color: #1e293b; font-size: 1.1rem;">Nodos de Menú Recuperados por NavigationService:</h3>
        <pre style="background: #f8fafc; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; border: 1px solid #e2e8f0; color: #334155;">{{ navService.menus() | json }}</pre>
      </div>
    </app-page-content>
  `
})
export class NavigationDemoComponent implements OnInit {
  readonly navService = inject(NavigationService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.navService.loadNavigation('SDK_DEMO').subscribe();
  }
}

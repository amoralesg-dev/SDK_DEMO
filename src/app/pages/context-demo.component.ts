import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  AuthenticationService, 
  ContextService, 
  CorporateBusinessUnit,
  PageHeaderComponent,
  PageContentComponent
} from '@rassini/rassini-ui';

@Component({
  selector: 'app-context-demo',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, PageContentComponent],
  template: `
    <app-page-header 
      title="ContextService & Business Units" 
      subtitle="Demostración de ciclo de vida de activeBusinessUnit y resolución de placeholders corporativos" 
      icon="pi pi-cog">
    </app-page-header>

    <app-page-content>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
        <!-- Selector de BU -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 1.1rem;">Selector de Business Unit Activa:</h3>
          <p style="color: #64748b; font-size: 0.9rem;">Selecciona una BU autorizada para activar en el contexto corporativo:</p>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
            <button *ngFor="let bu of authService.businessUnits()"
                    (click)="selectBu(bu)"
                    [style.background]="authService.activeBusinessUnit()?.code === bu.code ? '#0284c7' : '#f8fafc'"
                    [style.color]="authService.activeBusinessUnit()?.code === bu.code ? 'white' : '#334155'"
                    style="padding: 10px 14px; text-align: left; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: 500;">
              {{ bu.name }} (Código: {{ bu.code }})
            </button>
          </div>

          <div style="margin-top: 16px;">
            <button (click)="tryUnauthorizedBu()" style="padding: 8px 12px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
              Probar BU no autorizada (9999)
            </button>
            <p *ngIf="unauthorizedError" style="color: #dc2626; font-size: 0.85rem; margin-top: 6px;">{{ unauthorizedError }}</p>
          </div>
        </div>

        <!-- Placeholders Resueltos -->
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 1.1rem;">Resolución de Placeholders (ContextService):</h3>
          <table style="width: 100%; font-size: 0.95rem; line-height: 2.2;">
            <tr><td><code>&#36;&#123;BUSINESS_UNIT&#125;</code></td><td><strong>{{ resolvedBu() }}</strong></td></tr>
            <tr><td><code>&#36;&#123;BUSINESS_UNITS&#125;</code></td><td><strong>{{ resolvedBus() }}</strong></td></tr>
            <tr><td><code>&#36;&#123;USERNAME&#125;</code></td><td><strong>{{ resolvedUsername() }}</strong></td></tr>
            <tr><td><code>&#36;&#123;APPLICATION_CODE&#125;</code></td><td><strong>{{ resolvedAppCode() }}</strong></td></tr>
          </table>
        </div>
      </div>
    </app-page-content>
  `
})
export class ContextDemoComponent {
  readonly authService = inject(AuthenticationService);
  readonly contextService = inject(ContextService);

  unauthorizedError: string | null = null;

  selectBu(bu: CorporateBusinessUnit): void {
    this.unauthorizedError = null;
    this.authService.setActiveBusinessUnit(bu);
  }

  tryUnauthorizedBu(): void {
    try {
      this.authService.setActiveBusinessUnit({ id: 9999, code: '9999', name: 'Fake BU' });
    } catch (err: any) {
      this.unauthorizedError = err.message;
    }
  }

  resolvedBu(): string {
    return this.contextService.resolvePlaceholders('/api/test?bu=${BUSINESS_UNIT}', { strict: false });
  }

  resolvedBus(): string {
    return this.contextService.resolvePlaceholders('/api/test?bus=${BUSINESS_UNITS}', { strict: false });
  }

  resolvedUsername(): string {
    return this.contextService.resolvePlaceholders('/api/test?user=${USERNAME}', { strict: false });
  }

  resolvedAppCode(): string {
    return this.contextService.resolvePlaceholders('/api/test?app=${APPLICATION_CODE}', { strict: false });
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService, NavigationService } from '@rassini/rassini-ui';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; background: #f8fafc; padding: 2rem;">
      <div style="background: white; padding: 3rem 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); max-width: 460px; width: 100%; border: 1px solid #e2e8f0;">
        <div style="width: 72px; height: 72px; background: #ecfdf5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto;">
          <i class="pi pi-check-circle" style="font-size: 38px; color: #10b981;"></i>
        </div>
        <h2 style="margin: 0 0 0.75rem 0; color: #1e293b; font-size: 1.5rem; font-weight: 700;">Sesión cerrada correctamente</h2>
        <p style="color: #64748b; font-size: 1rem; margin-bottom: 2rem; line-height: 1.5;">
          Gracias por utilizar la Plataforma Corporativa Rassini.
        </p>
        
        <a href="http://localhost:4200/employee-portal/auth/login" 
           id="btn-portal-login"
           style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 0.85rem 1.5rem; background: #ea580c; color: white; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25); transition: background 0.2s;">
          <i class="pi pi-sign-in"></i> Ir al Portal de Empleados
        </a>
      </div>
    </div>
  `
})
export class LogoutComponent implements OnInit {
  private readonly authService = inject(AuthenticationService);
  private readonly navService = inject(NavigationService);

  ngOnInit(): void {
    this.authService.logout(false);
    this.navService.clear();
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '@rassini/rassini-ui';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
      <h2>Procesando autenticación corporativa OAuth2 / PKCE...</h2>
      <p *ngIf="error" style="color: red; font-weight: bold;">Error: {{ error }}</p>
      <p *ngIf="!error">Validando Authorization Code y Nonce contra el Authorization Server...</p>
    </div>
  `
})
export class CallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthenticationService);

  error: string | null = null;

  ngOnInit(): void {
    if (this.authService.isAuthenticated() || this.authService.hasValidTokenInStorage()) {
      this.router.navigateByUrl('/home', { replaceUrl: true });
      return;
    }

    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];

      if (error) {
        this.error = params['error_description'] || error;
        return;
      }

      if (!code || !state) {
        this.router.navigateByUrl('/home', { replaceUrl: true });
        return;
      }

      this.authService.handleCallback(code, state).subscribe({
        next: () => {
          this.router.navigateByUrl('/home', { replaceUrl: true });
        },
        error: (err) => {
          this.error = err.message || 'Error al intercambiar el código por tokens.';
        }
      });
    });
  }
}

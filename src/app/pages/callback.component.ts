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
    const rawAccess = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rassini_SDK_DEMO_access_token') : null;
    const rawId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rassini_SDK_DEMO_id_token') : null;
    console.log(`[CALLBACK COMPONENT] ngOnInit() INICIADO. URL actual: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`);
    console.log(`[CALLBACK COMPONENT] Estado RAW de sessionStorage AL ENTRAR a ngOnInit(): access_token=${rawAccess ? 'EXISTS (length: ' + rawAccess.length + ')' : 'NULL'}, id_token=${rawId ? 'EXISTS' : 'NULL'}`);
    
    console.log('[CALLBACK COMPONENT] Evaluando authService.isAuthenticated()...');
    const isAuth = this.authService.isAuthenticated();
    console.log(`[CALLBACK COMPONENT] Resultado isAuthenticated() = ${isAuth}`);

    console.log('[CALLBACK COMPONENT] Evaluando authService.hasValidTokenInStorage()...');
    const hasValid = this.authService.hasValidTokenInStorage();
    console.log(`[CALLBACK COMPONENT] Resultado hasValidTokenInStorage() = ${hasValid}`);

    if (isAuth || hasValid) {
      console.log('[CALLBACK COMPONENT] Tokens válidos detectados. Redirigiendo a /home con replaceUrl: true');
      this.router.navigateByUrl('/home', { replaceUrl: true });
      return;
    }

    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];
      console.log(`[CALLBACK COMPONENT] QueryParams recibidos -> code: ${code ? code.substring(0, 10) + '...' : 'null'}, state: ${state}, error: ${error}`);

      if (error) {
        this.error = params['error_description'] || error;
        console.error(`[CALLBACK COMPONENT] Error en params: ${this.error}`);
        return;
      }

      if (!code || !state) {
        console.warn('[CALLBACK COMPONENT] Sin code o state, redirigiendo a /logout');
        this.router.navigateByUrl('/logout', { replaceUrl: true });
        return;
      }

      console.log('[CALLBACK COMPONENT] Ejecutando handleCallback(code, state)...');
      this.authService.handleCallback(code, state).subscribe({
        next: (tokens) => {
          console.log('[CALLBACK COMPONENT] handleCallback exitoso! Tokens obtenidos. Redirigiendo a /home');
          this.router.navigateByUrl('/home', { replaceUrl: true });
        },
        error: (err) => {
          this.error = err.message || 'Error al intercambiar el código por tokens.';
          console.error('[CALLBACK COMPONENT] handleCallback fallo:', this.error);
        }
      });
    });
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService, NavigationService, RassiniSessionClosedComponent } from '@rassini/rassini-ui';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule, RassiniSessionClosedComponent],
  template: `
    <rui-session-closed
      (returnClick)="goToEmployeePortal()">
    </rui-session-closed>
  `
})
export class LogoutComponent implements OnInit {
  private readonly authService = inject(AuthenticationService);
  private readonly navService = inject(NavigationService);

  ngOnInit(): void {
    this.authService.logout(false);
    this.navService.clear();
  }

  goToEmployeePortal(): void {
    window.location.href = 'http://localhost:4205/employee-portal/auth/login';
  }
}

import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AUTH_STATUS, AuthService } from './core/auth/auth-service';
import { ActivitiesSidebar } from './core/layout/activities-sidebar';
import { Footer } from './core/layout/footer';
import { Header } from './core/layout/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, ActivitiesSidebar, Footer],
  template: `
    <div class="layout-shell">
      @if (auth.isAuthenticated()) {
        <app-header [showSidebarToggle]="true" [sidebarCollapsed]="sidebarCollapsed()"
          [sidebarMobileOpen]="sidebar()?.mobileOpen() ?? false" (sidebarToggle)="toggleSidebar($event)" />
      }
      <div class="layout-body">
        @if (auth.isAuthenticated()) {
          <app-activities-sidebar [collapsed]="sidebarCollapsed()" />
        }
        <main class="layout-content" aria-label="Contenido de actividades">
          @if (auth.status() === status.UNAVAILABLE) {
            <p role="alert">{{ auth.error() }}</p>
          }
          <div class="layout-page-slot">
            <router-outlet />
          </div>
          <app-footer />
        </main>
      </div>
    </div>
  `,
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly status = AUTH_STATUS;
  protected readonly sidebarCollapsed = signal(false);
  protected readonly sidebar = viewChild(ActivitiesSidebar);

  protected toggleSidebar(mobile: boolean): void {
    if (mobile) this.sidebar()?.openMobile();
    else this.sidebarCollapsed.update(value => !value);
  }
}

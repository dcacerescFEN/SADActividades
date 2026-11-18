import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../auth/auth-service';

@Component({
  selector: 'app-header',
  template: `
    <nav class="navbar nav-header" aria-label="Encabezado de SADActividades">
      <div class="header-left">
        @if (showSidebarToggle()) {
          <button type="button" class="header-toggle-btn d-none d-lg-inline-flex" data-sidebar-mode="desktop"
            aria-label="Alternar menú de actividades" aria-controls="activities-sidebar"
            [attr.aria-expanded]="!sidebarCollapsed()" (click)="sidebarToggle.emit(false)">
            <i class="bi bi-list fs-4" aria-hidden="true"></i>
          </button>
          <button type="button" class="header-toggle-btn d-lg-none" data-sidebar-mode="mobile"
            aria-label="Abrir menú de actividades" aria-haspopup="dialog"
            [attr.aria-expanded]="sidebarMobileOpen()" (click)="sidebarToggle.emit(true)">
            <i class="bi bi-list fs-4" aria-hidden="true"></i>
          </button>
        }
        <span class="navbar-brand header-brand">
          <i class="bi bi-calendar3" aria-hidden="true"></i>
          <span class="header-brand-text">SAD Actividades</span>
        </span>
      </div>
      <div class="header-actions">
        <span class="header-user" [attr.title]="username()">
          <span class="header-avatar" aria-hidden="true">{{ initials() }}</span>
          <span class="header-user-name">{{ username() }}</span>
        </span>
        <button type="button" class="header-icon-btn" data-action="logout" aria-label="Cerrar sesión"
          title="Cerrar sesión" (click)="logout()">
          <i class="bi bi-box-arrow-right fs-5" aria-hidden="true"></i>
        </button>
      </div>
    </nav>
    @if (actionError()) {
      <p class="navigation-status" role="alert">{{ actionError() }}</p>
    }
  `,
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  readonly showSidebarToggle = input(false);
  readonly sidebarCollapsed = input(false);
  readonly sidebarMobileOpen = input(false);
  readonly sidebarToggle = output<boolean>();
  protected readonly auth = inject(AuthService);
  protected readonly actionError = signal('');
  protected readonly username = computed(() => this.auth.username().trim() || 'Usuario');
  protected readonly initials = computed(() => this.username().slice(0, 2).toUpperCase());

  protected async logout(): Promise<void> {
    this.actionError.set('');
    try {
      await this.auth.logout();
    } catch {
      this.actionError.set('No se pudo cerrar sesión. Intenta nuevamente.');
    }
  }
}

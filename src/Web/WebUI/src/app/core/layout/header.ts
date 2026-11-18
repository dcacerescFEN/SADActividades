import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  NgbCollapseModule, NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../auth/auth-service';
import { NavigationService } from '../navigation/navigation-service';
import { ThemePreference, ThemeStore } from './theme-store';

interface ThemeChoice {
  key: ThemePreference;
  label: string;
  icon: string;
}

interface ExternalLink {
  url: string;
  label: string;
}

// Accesos institucionales externos al módulo; se ajustan aquí y no en la plantilla.
const EXTERNAL_LINKS = {
  mail: { url: 'http://g.fen.uchile.cl', label: 'Correo FEN' },
  password: { url: 'https://cuenta.fen.uchile.cl', label: 'Cambiar Contraseña' },
} as const satisfies Record<string, ExternalLink>;

@Component({
  selector: 'app-header',
  imports: [RouterLink, NgbCollapseModule, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgbTooltip],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark shadow-sm nav-header" aria-label="Navegación principal">
      <div class="container-fluid">
        @if (showSidebarToggle()) {
          <button class="header-toggle-btn d-none d-lg-inline-flex me-2" type="button" data-sidebar-mode="desktop"
            aria-label="Alternar menú de actividades" aria-controls="activities-sidebar"
            [attr.aria-expanded]="!sidebarCollapsed()" (click)="sidebarToggle.emit(false)">
            <i class="bi bi-list fs-4" aria-hidden="true"></i>
          </button>
          <button class="header-toggle-btn d-lg-none" type="button" data-sidebar-mode="mobile"
            aria-label="Abrir menú de actividades" aria-haspopup="dialog"
            [attr.aria-expanded]="sidebarMobileOpen()" (click)="sidebarToggle.emit(true)">
            <i class="bi bi-list fs-4" aria-hidden="true"></i>
          </button>
        }
        <a class="navbar-brand" routerLink="/" aria-label="Inicio de SADActividades">
          <img src="/logo-fen-white-letters.svg" height="28" alt="FEN Universidad de Chile" class="mx-auto">
        </a>
        <button class="navbar-toggler" type="button" aria-label="Alternar navegación"
          aria-controls="main-navigation" [attr.aria-expanded]="!menuCollapsed()" (click)="toggleMenu()">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div id="main-navigation" class="collapse navbar-collapse" [ngbCollapse]="menuCollapsed()">
          <ul class="navbar-nav me-auto">
            @for (item of navigation.links(); track item.key) {
              <li class="nav-item">
                <a class="nav-link header-nav-link" [routerLink]="item.url" [attr.aria-label]="item.label"
                  [class.active]="item.active" [attr.aria-current]="item.active ? 'page' : null"
                  (click)="closeMenu()">
                  <i [class]="'bi ' + item.icon" aria-hidden="true"></i><span>{{ item.label }}</span>
                </a>
              </li>
            }
          </ul>
          <div class="header-actions d-flex align-items-center">
            <div ngbDropdown class="me-3">
              <button id="themeMenu" class="header-icon-btn dropdown-toggle" type="button" ngbDropdownToggle
                aria-label="Cambiar tema">
                <i [class]="'bi fs-5 ' + themeIcon()" aria-hidden="true"></i>
              </button>
              <div class="dropdown-menu dropdown-menu-end" ngbDropdownMenu aria-labelledby="themeMenu">
                @for (choice of themes; track choice.key) {
                  <button ngbDropdownItem type="button" [attr.data-theme-choice]="choice.key"
                    [attr.aria-pressed]="theme.preference() === choice.key" (click)="theme.setPreference(choice.key)">
                    <i [class]="'bi me-2 ' + choice.icon" aria-hidden="true"></i>{{ choice.label }}
                    @if (theme.preference() === choice.key) {
                      <i class="bi bi-check2 ms-auto" aria-hidden="true"></i>
                    }
                  </button>
                }
              </div>
            </div>
            <a class="text-white me-3" [href]="externalLinks.mail.url" target="_blank" rel="noopener noreferrer"
              [ngbTooltip]="externalLinks.mail.label" [attr.aria-label]="externalLinks.mail.label">
              <i class="bi bi-envelope fs-5" aria-hidden="true"></i>
            </a>
            <div ngbDropdown class="me-3">
              <button id="userMenu" class="header-icon-btn dropdown-toggle" type="button" ngbDropdownToggle
                aria-label="Menú de usuario">
                <i class="bi bi-person-circle fs-5" aria-hidden="true"></i>
              </button>
              <div class="dropdown-menu dropdown-menu-end" ngbDropdownMenu aria-labelledby="userMenu">
                <a ngbDropdownItem [href]="externalLinks.password.url" target="_blank" rel="noopener noreferrer">
                  <i class="bi bi-key-fill me-2" aria-hidden="true"></i>{{ externalLinks.password.label }}
                </a>
                <button ngbDropdownItem type="button" data-action="logout" (click)="logout()">
                  <i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
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
  protected readonly navigation = inject(NavigationService);
  protected readonly theme = inject(ThemeStore);
  protected readonly actionError = signal('');
  protected readonly menuCollapsed = signal(true);
  protected readonly externalLinks = EXTERNAL_LINKS;
  protected readonly themes: readonly ThemeChoice[] = [
    { key: 'light', label: 'Claro', icon: 'bi-sun-fill' },
    { key: 'dark', label: 'Oscuro', icon: 'bi-moon-stars-fill' },
    { key: 'auto', label: 'Auto', icon: 'bi-circle-half' },
  ];
  protected readonly themeIcon = computed(() => this.theme.preference() === 'auto'
    ? 'bi-circle-half'
    : this.theme.resolvedTheme() === 'dark' ? 'bi-moon-stars-fill' : 'bi-sun-fill');

  /** Alterna el menú de navegación colapsable de pantallas pequeñas. */
  protected toggleMenu(): void {
    this.menuCollapsed.update(collapsed => !collapsed);
  }

  /** Cierra el menú móvil al elegir un destino. */
  protected closeMenu(): void {
    this.menuCollapsed.set(true);
  }

  protected async logout(): Promise<void> {
    this.actionError.set('');
    try {
      await this.auth.logout();
    } catch {
      this.actionError.set('No se pudo cerrar sesión. Intenta nuevamente.');
    }
  }
}

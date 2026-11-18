import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-activities-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  host: {
    '[class.collapsed]': 'collapsed()',
    '(window:resize)': 'closeOnDesktop()',
    '(document:keydown)': 'handleKeydown($event)',
  },
  template: `
    <aside id="activities-sidebar" class="sidebar" [class.sidebar--collapsed]="collapsed()"
      aria-label="Actividades">
      <ng-container [ngTemplateOutlet]="navigation" />
    </aside>
    @if (mobileOpen()) {
      <div class="sidebar-backdrop" data-sidebar-backdrop aria-hidden="true" (click)="closeMobile()"></div>
      <div class="sidebar sidebar--drawer" role="dialog" aria-modal="true"
        aria-labelledby="activities-drawer-title">
        <div class="sidebar-drawer-header">
          <h2 id="activities-drawer-title" class="sidebar-drawer-title">Actividades</h2>
          <button type="button" class="btn-close" aria-label="Cerrar menú" (click)="closeMobile()"></button>
        </div>
        <ng-container [ngTemplateOutlet]="navigation" />
      </div>
    }
    <ng-template #navigation>
      <div class="sidebar-brand" title="SAD Actividades">
        <i class="bi bi-calendar-week" aria-hidden="true"></i>
        <span class="sidebar-label">SAD Actividades</span>
      </div>
      <nav class="sidebar-navigation" aria-label="Opciones de Actividades">
        <a class="sidebar-link" routerLink="/actividades" routerLinkActive="active"
          ariaCurrentWhenActive="page" title="Calendario" aria-label="Calendario" (click)="closeMobile()">
          <i class="bi bi-calendar3" aria-hidden="true"></i>
          <span class="sidebar-label">Calendario</span>
        </a>
      </nav>
    </ng-template>
  `,
  styleUrl: './activities-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivitiesSidebar {
  readonly collapsed = input(false);
  private readonly drawerOpen = signal(false);
  readonly mobileOpen = this.drawerOpen.asReadonly();

  /** Abre el panel de navegación en pantallas pequeñas. */
  openMobile(): void {
    this.drawerOpen.set(true);
  }

  /** Cierra el panel de navegación pequeño. */
  closeMobile(): void {
    this.drawerOpen.set(false);
  }

  protected closeOnDesktop(): void {
    if (window.innerWidth >= 992) this.closeMobile();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.mobileOpen()) this.closeMobile();
  }
}

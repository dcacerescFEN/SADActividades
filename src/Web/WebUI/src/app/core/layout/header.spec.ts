import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth-service';
import { NavigationLink, NavigationService } from '../navigation/navigation-service';
import { ThemePreference, ThemeStore } from './theme-store';
import { Header } from './header';

@Component({ template: '' })
class ActivitiesPage {}

@Component({
  imports: [Header],
  template: `
    <app-header [showSidebarToggle]="showSidebarToggle()" [sidebarCollapsed]="sidebarCollapsed()"
      [sidebarMobileOpen]="sidebarMobileOpen()" (sidebarToggle)="events.push($event)" />`,
})
class HeaderHost {
  readonly showSidebarToggle = signal(true);
  readonly sidebarCollapsed = signal(false);
  readonly sidebarMobileOpen = signal(false);
  readonly events: boolean[] = [];
}

describe('encabezado del shell', () => {
  const logout = vi.fn();
  const setPreference = vi.fn();
  const preference = signal<ThemePreference>('auto');
  const resolvedTheme = signal<'light' | 'dark'>('light');
  const links = signal<NavigationLink[]>([]);

  beforeEach(() => {
    logout.mockReset().mockResolvedValue(undefined);
    setPreference.mockReset().mockImplementation((value: ThemePreference) => {
      preference.set(value);
      if (value !== 'auto') resolvedTheme.set(value);
    });
    preference.set('auto');
    resolvedTheme.set('light');
    links.set([{
      key: 'calendar', label: 'Calendario de Actividades', icon: 'bi-calendar-event',
      url: '/actividades', active: true,
    }]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'actividades', component: ActivitiesPage }]),
        { provide: AuthService, useValue: { username: signal('usuario'), logout } },
        { provide: NavigationService, useValue: { links } },
        { provide: ThemeStore, useValue: { preference, resolvedTheme, setPreference } },
      ],
    });
  });

  /** Crea el encabezado dentro de un anfitrión que registra los eventos del menú. */
  function create() {
    const fixture = TestBed.createComponent(HeaderHost);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra la marca con el logo institucional y los destinos del módulo', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const nav = root.querySelector('nav');

    expect(nav?.getAttribute('aria-label')).toBe('Navegación principal');
    expect(nav?.classList.contains('navbar-expand-lg')).toBe(true);
    expect(root.querySelector('a.navbar-brand')?.getAttribute('href')).toBe('/');
    expect(root.querySelector('a.navbar-brand')?.getAttribute('aria-label')).toBe('Inicio de SADActividades');
    expect(root.querySelector('a.navbar-brand img')?.getAttribute('src')).toBe('/logo-fen-white-letters.svg');
    expect(root.querySelector('a.navbar-brand img')?.getAttribute('alt')).toContain('FEN');

    const anchors = [...root.querySelectorAll('a.header-nav-link')] as HTMLAnchorElement[];
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute('aria-label')).toBe('Calendario de Actividades');
    expect(anchors[0].textContent).toContain('Calendario de Actividades');
    expect(anchors[0].querySelector('i.bi-calendar-event')).not.toBeNull();
    expect(anchors[0].classList.contains('active')).toBe(true);
    expect(anchors[0].getAttribute('aria-current')).toBe('page');
    expect(root.textContent).not.toContain('Informes');
  });

  it('marca como actual únicamente el destino activo del servicio', () => {
    links.set([
      { key: 'calendar', label: 'Calendario de Actividades', icon: 'bi-calendar-event', url: '/actividades', active: true },
      { key: 'history', label: 'Historial', icon: 'bi-clock-history', url: '/actividades/historial', active: false },
    ]);
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const anchors = [...root.querySelectorAll<HTMLAnchorElement>('a.header-nav-link')];

    expect(anchors).toHaveLength(2);
    expect(anchors[0].classList.contains('active')).toBe(true);
    expect(anchors[0].getAttribute('aria-current')).toBe('page');
    expect(anchors[1].classList.contains('active')).toBe(false);
    expect(anchors[1].hasAttribute('aria-current')).toBe(false);
  });

  it('expone los controles de escritorio y móvil con su estado ARIA', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const desktop = root.querySelector('[data-sidebar-mode="desktop"]') as HTMLButtonElement;
    const mobile = root.querySelector('[data-sidebar-mode="mobile"]') as HTMLButtonElement;

    expect(desktop.getAttribute('aria-label')).toBe('Alternar menú de actividades');
    expect(desktop.getAttribute('aria-controls')).toBe('activities-sidebar');
    expect(desktop.getAttribute('aria-expanded')).toBe('true');
    expect(mobile.getAttribute('aria-label')).toBe('Abrir menú de actividades');
    expect(mobile.getAttribute('aria-haspopup')).toBe('dialog');
    expect(mobile.getAttribute('aria-expanded')).toBe('false');

    desktop.click();
    mobile.click();
    expect(fixture.componentInstance.events).toEqual([false, true]);

    fixture.componentInstance.sidebarCollapsed.set(true);
    fixture.componentInstance.sidebarMobileOpen.set(true);
    fixture.detectChanges();
    expect(desktop.getAttribute('aria-expanded')).toBe('false');
    expect(mobile.getAttribute('aria-expanded')).toBe('true');

    fixture.componentInstance.showSidebarToggle.set(false);
    fixture.detectChanges();
    expect(root.querySelector('[data-sidebar-mode]')).toBeNull();
  });

  it('alterna el menú colapsable y lo cierra al elegir un destino', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const toggle = root.querySelector<HTMLButtonElement>('.navbar-toggler')!;

    expect(toggle.getAttribute('aria-controls')).toBe('main-navigation');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    const link = root.querySelector<HTMLAnchorElement>('a.header-nav-link')!;
    link.addEventListener('click', event => event.preventDefault());
    link.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('permite cambiar el tema entre Claro, Oscuro y Auto desde el encabezado', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('#themeMenu')?.getAttribute('aria-label')).toBe('Cambiar tema');
    expect(root.querySelector('#themeMenu i')?.className).toContain('bi-circle-half');

    (root.querySelector('#themeMenu') as HTMLButtonElement).click();
    fixture.detectChanges();
    const choices = [...root.querySelectorAll('[data-theme-choice]')] as HTMLButtonElement[];
    expect(choices.map(choice => choice.getAttribute('data-theme-choice'))).toEqual(['light', 'dark', 'auto']);
    expect(choices.map(choice => choice.textContent?.trim())).toEqual([
      expect.stringContaining('Claro'), expect.stringContaining('Oscuro'), expect.stringContaining('Auto'),
    ]);
    expect(choices[0].querySelector('i.bi-sun-fill')).not.toBeNull();
    expect(choices[1].querySelector('i.bi-moon-stars-fill')).not.toBeNull();
    expect(choices[2].querySelector('i.bi-circle-half')).not.toBeNull();
    expect(choices[2].getAttribute('aria-pressed')).toBe('true');
    expect(choices[0].getAttribute('aria-pressed')).toBe('false');
    expect(choices[2].querySelector('i.bi-check2')).not.toBeNull();
    expect(choices[0].querySelector('i.bi-check2')).toBeNull();

    choices[1].click();
    expect(setPreference).toHaveBeenCalledWith('dark');
    fixture.detectChanges();
    expect(choices[1].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('#themeMenu i')?.className).toContain('bi-moon-stars-fill');

    preference.set('auto');
    resolvedTheme.set('dark');
    fixture.detectChanges();
    expect(root.querySelector('#themeMenu i')?.className).toContain('bi-circle-half');
  });

  it('ofrece los accesos externos configurados y cierra la sesión del usuario', async () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const mail = root.querySelector('a[aria-label="Correo FEN"]') as HTMLAnchorElement;

    expect(mail.getAttribute('href')).toBe('http://g.fen.uchile.cl');
    expect(mail.getAttribute('target')).toBe('_blank');
    expect(mail.getAttribute('rel')).toContain('noopener');
    expect(mail.getAttribute('rel')).toContain('noreferrer');

    (root.querySelector('#userMenu') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('#userMenu')?.getAttribute('aria-label')).toBe('Menú de usuario');
    const password = root.querySelector<HTMLAnchorElement>('a[href="https://cuenta.fen.uchile.cl"]')!;
    expect(password.getAttribute('target')).toBe('_blank');
    expect(password.getAttribute('rel')).toContain('noopener');
    expect(password.textContent).toContain('Cambiar Contraseña');

    (root.querySelector('[data-action="logout"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(logout).toHaveBeenCalledOnce();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('avisa en español cuando el cierre de sesión falla', async () => {
    logout.mockRejectedValueOnce(new Error('falló'));
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;

    (root.querySelector('[data-action="logout"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cerrar sesión. Intenta nuevamente.');
  });
});

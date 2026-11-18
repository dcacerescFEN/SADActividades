import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth-service';
import { Header } from './header';

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

  beforeEach(() => {
    logout.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthService,
        useValue: { username: signal('usuario'), logout },
      }],
    });
  });

  it('muestra la marca y el usuario sin enlaces de informes ni lanzar errores', () => {
    const fixture = TestBed.createComponent(HeaderHost);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('nav[aria-label="Encabezado de SADActividades"]')).not.toBeNull();
    expect(root.querySelector('.navbar-brand')?.textContent).toContain('SAD Actividades');
    expect(root.querySelector('.header-user-name')?.textContent?.trim()).toBe('usuario');
    expect(root.querySelector('.header-avatar')?.textContent?.trim()).toBe('US');
    expect(root.querySelector('a.header-nav-link')).toBeNull();
    expect(root.textContent).not.toContain('Informes');
  });

  it('expone los controles de escritorio y móvil con su estado ARIA', () => {
    const fixture = TestBed.createComponent(HeaderHost);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const desktop = root.querySelector('[data-sidebar-mode="desktop"]') as HTMLButtonElement;
    const mobile = root.querySelector('[data-sidebar-mode="mobile"]') as HTMLButtonElement;

    expect(desktop.getAttribute('aria-controls')).toBe('activities-sidebar');
    expect(desktop.getAttribute('aria-expanded')).toBe('true');
    expect(mobile.getAttribute('aria-haspopup')).toBe('dialog');

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

  it('cierra la sesión y avisa cuando el cierre falla', async () => {
    const fixture = TestBed.createComponent(HeaderHost);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    (root.querySelector('[data-action="logout"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(logout).toHaveBeenCalledOnce();

    logout.mockRejectedValueOnce(new Error('falló'));
    (root.querySelector('[data-action="logout"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cerrar sesión.');
  });
});

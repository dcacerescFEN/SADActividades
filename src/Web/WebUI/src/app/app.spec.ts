import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { AUTH_STATUS, type AuthStatus } from './core/auth/auth-service';
import { AuthService } from './core/auth/auth-service';

describe('shell de SADActividades', () => {
  let authenticated: WritableSignal<boolean>;
  let status: WritableSignal<AuthStatus>;
  let error: WritableSignal<string>;

  beforeEach(() => {
    authenticated = signal(false);
    status = signal<AuthStatus>(AUTH_STATUS.UNAVAILABLE);
    error = signal('La autenticación no está disponible.');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authenticated,
            status,
            error,
            username: signal('usuario'),
            logout: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });
  });

  it('renderiza el outlet y el aviso cuando la autenticación no está disponible', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('.layout-shell')).not.toBeNull();
    expect(root.querySelector('main.layout-content router-outlet')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('La autenticación no está disponible.');
    expect(root.querySelector('app-header')).toBeNull();
    expect(root.querySelector('app-activities-sidebar')).toBeNull();
  });

  it('muestra encabezado y menú solo con sesión y alterna su estado', () => {
    authenticated.set(true);
    status.set(AUTH_STATUS.READY);
    error.set('');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('app-header')).not.toBeNull();
    const sidebar = root.querySelector('app-activities-sidebar') as HTMLElement;
    expect(sidebar).not.toBeNull();
    expect(sidebar.classList.contains('collapsed')).toBe(false);
    expect(root.querySelector('[role="alert"]')).toBeNull();

    (root.querySelector('[data-sidebar-mode="desktop"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(sidebar.classList.contains('collapsed')).toBe(true);

    (root.querySelector('[data-sidebar-mode="mobile"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

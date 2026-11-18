import { Component, signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NgbConfig } from '@ng-bootstrap/ng-bootstrap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth-service';
import { ActivitiesSidebar } from './activities-sidebar';

@Component({ template: '' })
class TestPage {}

const FAVORITES_KEY = 'sadactividades.sidebar.favorite-routes';
const CALENDAR_PERMISSION = 'ACTIVITY_VIEW_CALENDAR';

describe('menú de Actividades', () => {
  let username: WritableSignal<string>;
  let name: WritableSignal<string>;
  let hasPermission: ReturnType<typeof vi.fn>;
  let originalWidth: PropertyDescriptor;
  let fixtures: ComponentFixture<ActivitiesSidebar>[];

  beforeEach(() => {
    originalWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')!;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 375 });
    username = signal('usuario');
    name = signal('Usuario Prueba');
    hasPermission = vi.fn(() => true);
    fixtures = [];
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'actividades', component: TestPage },
          { path: 'otra', component: TestPage },
        ]),
        { provide: AuthService, useValue: { username, name, hasPermission } },
      ],
    });
    TestBed.inject(NgbConfig).animation = false;
  });

  afterEach(async () => {
    for (const fixture of fixtures) fixture.destroy();
    fixtures = [];
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    Object.defineProperty(window, 'innerWidth', originalWidth);
  });

  /** Crea el menú con el estado colapsado indicado. */
  function create(collapsed = false): ComponentFixture<ActivitiesSidebar> {
    const fixture = TestBed.createComponent(ActivitiesSidebar);
    fixture.componentRef.setInput('collapsed', collapsed);
    fixture.detectChanges();
    fixtures.push(fixture);
    return fixture;
  }

  /** Aplica cambios y espera las transiciones pendientes del panel. */
  async function settle(fixture: ComponentFixture<ActivitiesSidebar>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  /** Devuelve el elemento raíz renderizado del menú. */
  function root(fixture: ComponentFixture<ActivitiesSidebar>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra la sección del módulo con su icono, ruta y estado activo', async () => {
    const fixture = create();
    await settle(fixture);
    const element = root(fixture);

    expect(element.querySelector('#activities-sidebar')?.getAttribute('aria-label')).toBe('Actividades');
    expect(element.querySelectorAll('a').length).toBe(0);
    expect(element.textContent).not.toContain('Informes');

    const toggle = element.querySelector<HTMLButtonElement>('[data-section="calendar"]')!;
    expect(toggle.getAttribute('aria-label')).toBe('Calendario de Actividades');
    expect(toggle.getAttribute('title')).toBe('Calendario de Actividades');
    expect(toggle.querySelector('i')?.className).toContain('bi-calendar-event');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await settle(fixture);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const link = element.querySelector<HTMLAnchorElement>('[data-section-content="calendar"] a')!;
    expect(link.textContent?.trim()).toBe('Calendario');
    expect(link.getAttribute('href')).toBe('/actividades');
    expect(link.getAttribute('aria-label')).toBe('Calendario');

    await TestBed.inject(Router).navigateByUrl('/actividades');
    await settle(fixture);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/actividades');
  });

  it('refleja el estado colapsado recibido del shell', () => {
    const fixture = create();
    const element = root(fixture);

    expect(element.querySelector('aside')?.classList.contains('sidebar--collapsed')).toBe(false);
    expect(element.querySelector('.sidebar-search')).not.toBeNull();

    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    expect(element.classList.contains('collapsed')).toBe(true);
    expect(element.querySelector('aside')?.classList.contains('sidebar--collapsed')).toBe(true);
    expect(element.querySelector('.sidebar-search')).toBeNull();
  });

  it('muestra el bloque de usuario con iniciales, usuario y nombre', () => {
    const fixture = create();
    const profile = root(fixture).querySelector<HTMLElement>('.sidebar-profile')!;

    expect(profile.title).toBe('usuario');
    expect(profile.querySelector('.sidebar-avatar')?.textContent?.trim()).toBe('US');
    expect(profile.querySelector('.sidebar-username')?.textContent?.trim()).toBe('usuario');
    expect(profile.querySelector('.sidebar-name')?.textContent?.trim()).toBe('Usuario Prueba');
    expect(profile.querySelector('[data-action="logout"]')).toBeNull();
    expect(profile.textContent).not.toContain('ROLE_ACTIVITY');
  });

  it('usa Usuario como respaldo cuando la identidad está vacía', () => {
    username.set('');
    name.set('');
    const fixture = create();
    const profile = root(fixture).querySelector<HTMLElement>('.sidebar-profile')!;

    expect(profile.querySelector('.sidebar-avatar')?.textContent?.trim()).toBe('US');
    expect(profile.querySelector('.sidebar-username')?.textContent?.trim()).toBe('Usuario');
    expect(profile.querySelector('.sidebar-name')?.textContent?.trim()).toBe('Usuario');
  });

  it('oculta la sección cuando falta el permiso declarado', async () => {
    hasPermission.mockReturnValue(false);
    const fixture = create();
    await settle(fixture);
    const element = root(fixture);

    expect(hasPermission).toHaveBeenCalledWith(CALENDAR_PERMISSION);
    expect(element.querySelector('[data-section="calendar"]')).toBeNull();
    expect(element.textContent).toContain('No se encontraron opciones');
  });

  it('filtra secciones y opciones con el buscador y avisa cuando no hay coincidencias', async () => {
    const fixture = create();
    await settle(fixture);
    const element = root(fixture);
    const search = element.querySelector<HTMLInputElement>('.sidebar-search input')!;
    expect(search.getAttribute('aria-label')).toBe('Buscar opción o grupo');

    search.value = 'calendario';
    search.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect([...element.querySelectorAll('[data-section]')]
      .map(button => button.getAttribute('aria-label'))).toEqual(['Calendario de Actividades']);

    search.value = 'zzzz';
    search.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(element.querySelector('[data-section]')).toBeNull();
    expect(element.querySelector('.sidebar-no-results')?.textContent).toContain('No se encontraron opciones');
  });

  it('marca favoritos, los muestra arriba y los persiste con clave propia', async () => {
    const fixture = create();
    await settle(fixture);
    const element = root(fixture);
    element.querySelector<HTMLButtonElement>('[data-section="calendar"]')!.click();
    await settle(fixture);

    const star = element.querySelector<HTMLButtonElement>(
      '[data-section-content="calendar"] .sidebar-favorite-toggle')!;
    expect(star.getAttribute('aria-label')).toBe('Agregar a favoritos');
    star.click();
    await settle(fixture);
    expect(star.getAttribute('aria-label')).toBe('Quitar de favoritos');

    const favorites = element.querySelector<HTMLElement>('[data-favorites]')!;
    expect(favorites.textContent).toContain('Favoritos');
    expect(favorites.textContent).toContain('Calendario');
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual(['/actividades']);
    expect(localStorage.getItem('sadinformes.sidebar.favorite-routes')).toBeNull();

    favorites.querySelector<HTMLButtonElement>('.sidebar-favorite-toggle')!.click();
    await settle(fixture);
    expect(element.querySelector('[data-favorites]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual([]);
  });

  it('recupera los favoritos guardados y descarta rutas desconocidas', async () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(['/actividades', '/informes', '/actividades']));
    const fixture = create();
    await settle(fixture);

    const favorites = root(fixture).querySelector<HTMLElement>('[data-favorites]');
    expect(favorites?.textContent).toContain('Calendario');
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual(['/actividades']);
  });

  it('abre un flyout navegable al pasar el mouse en modo colapsado', async () => {
    const fixture = create(true);
    await settle(fixture);
    const element = root(fixture);
    const group = element.querySelector<HTMLElement>('[data-collapsed-section="calendar"]')!;

    group.dispatchEvent(new MouseEvent('mouseenter'));
    await settle(fixture);
    const button = group.querySelector<HTMLButtonElement>('[data-section="calendar"]')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');

    const menu = group.querySelector<HTMLElement>('.activities-flyout')!;
    expect(menu.querySelector('.activities-flyout__header')?.textContent?.trim())
      .toBe('Calendario de Actividades');
    const item = menu.querySelector<HTMLAnchorElement>('.activities-flyout__item')!;
    expect(item.textContent?.trim()).toBe('Calendario');
    expect(item.getAttribute('aria-label')).toBe('Calendario');

    item.click();
    await settle(fixture);
    expect(TestBed.inject(Router).url).toBe('/actividades');
    expect(group.querySelector('.activities-flyout')).toBeNull();
  });

  it('abre el flyout con el foco y lo cierra tras la espera de salida', async () => {
    const fixture = create(true);
    await settle(fixture);
    const group = root(fixture).querySelector<HTMLElement>('[data-collapsed-section="calendar"]')!;

    group.dispatchEvent(new FocusEvent('focusin'));
    await settle(fixture);
    expect(group.querySelector('.activities-flyout')).not.toBeNull();

    group.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(group.querySelector('.activities-flyout')).not.toBeNull();

    await new Promise<void>(resolve => setTimeout(resolve, 150));
    fixture.detectChanges();
    expect(group.querySelector('.activities-flyout')).toBeNull();
  });

  it('abre un solo panel, enfoca el cierre y lo cierra con Escape', async () => {
    const fixture = create();
    await settle(fixture);
    const trigger = document.createElement('button');
    document.body.append(trigger);
    try {
      trigger.focus();
      fixture.componentInstance.openMobile();
      fixture.componentInstance.openMobile();
      await settle(fixture);
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(document.querySelectorAll('[role="dialog"]').length).toBe(1);
      expect(dialog?.getAttribute('aria-labelledby')).toBe('activities-drawer-title');
      expect(dialog?.textContent).toContain('Actividades');
      expect(fixture.componentInstance.mobileOpen()).toBe(true);
      expect(document.activeElement).toBe(dialog?.querySelector('[aria-label="Cerrar menú"]'));

      dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await settle(fixture);
      expect(fixture.componentInstance.mobileOpen()).toBe(false);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    } finally {
      trigger.remove();
    }
  });

  it('cierra el panel mediante el enlace, botón, fondo y navegación', async () => {
    const fixture = create();
    await settle(fixture);
    const open = async () => {
      fixture.componentInstance.openMobile();
      await settle(fixture);
      expect(fixture.componentInstance.mobileOpen()).toBe(true);
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    };

    await open();
    document.querySelector<HTMLButtonElement>('[role="dialog"] [data-section="calendar"]')!.click();
    await settle(fixture);
    document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/actividades"]')!.click();
    await settle(fixture);
    expect(fixture.componentInstance.mobileOpen()).toBe(false);

    await open();
    document.querySelector<HTMLButtonElement>('[aria-label="Cerrar menú"]')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.mobileOpen()).toBe(false);

    await open();
    document.querySelector<HTMLElement>('ngb-offcanvas-backdrop')?.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.mobileOpen()).toBe(false);

    await open();
    await TestBed.inject(Router).navigateByUrl('/otra');
    await settle(fixture);
    expect(fixture.componentInstance.mobileOpen()).toBe(false);
  });

  it('retira el panel al cambiar a escritorio y al destruir la vista', async () => {
    const fixture = create();
    await settle(fixture);

    fixture.componentInstance.openMobile();
    await settle(fixture);
    expect(fixture.componentInstance.mobileOpen()).toBe(true);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 992 });
    window.dispatchEvent(new Event('resize'));
    await settle(fixture);
    expect(fixture.componentInstance.mobileOpen()).toBe(false);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    fixture.componentInstance.openMobile();
    await settle(fixture);
    expect(fixture.componentInstance.mobileOpen()).toBe(true);

    fixture.destroy();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('ngb-offcanvas-backdrop')).toBeNull();
  });
});

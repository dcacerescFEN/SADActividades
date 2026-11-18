import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { ActivitiesSidebar } from './activities-sidebar';

@Component({ template: '' })
class EmptyPage {}

@Component({
  imports: [ActivitiesSidebar],
  template: `<app-activities-sidebar [collapsed]="collapsed()" />`,
})
class SidebarHost {
  readonly collapsed = signal(false);
}

describe('menú de Actividades', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'actividades', component: EmptyPage }])],
    });
  });

  /** Crea el menú y devuelve su fixture junto al componente del menú. */
  function create() {
    const fixture = TestBed.createComponent(SidebarHost);
    fixture.detectChanges();
    const sidebar = fixture.debugElement.query(By.directive(ActivitiesSidebar)).componentInstance as ActivitiesSidebar;
    return { fixture, sidebar };
  }

  it('lista solo la entrada disponible del módulo sin secciones de informes', () => {
    const { fixture } = create();
    const root: HTMLElement = fixture.nativeElement;
    const links = [...root.querySelectorAll('aside a.sidebar-link')] as HTMLAnchorElement[];

    expect(root.querySelector('#activities-sidebar')?.getAttribute('aria-label')).toBe('Actividades');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Calendario');
    expect(links[0].getAttribute('href')).toBe('/actividades');
    expect(links[0].getAttribute('title')).toBe('Calendario');
    expect(root.querySelector('.sidebar-section-toggle')).toBeNull();
  });

  it('refleja el estado colapsado recibido del shell', () => {
    const { fixture } = create();
    const aside = fixture.debugElement.query(By.css('aside')).nativeElement as HTMLElement;

    expect(aside.classList.contains('sidebar--collapsed')).toBe(false);
    fixture.componentInstance.collapsed.set(true);
    fixture.detectChanges();
    expect(aside.classList.contains('sidebar--collapsed')).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-activities-sidebar')?.classList
      .contains('collapsed')).toBe(true);
  });

  it('abre el panel móvil y lo cierra con Escape, botón o navegación', async () => {
    const { fixture, sidebar } = create();
    const root: HTMLElement = fixture.nativeElement;

    sidebar.openMobile();
    fixture.detectChanges();
    let dialog = root.querySelector('[role="dialog"]') as HTMLElement;
    expect(sidebar.mobileOpen()).toBe(true);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Actividades');
    expect(dialog.querySelector('a[href="/actividades"]')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(sidebar.mobileOpen()).toBe(false);
    expect(root.querySelector('[role="dialog"]')).toBeNull();

    sidebar.openMobile();
    fixture.detectChanges();
    (root.querySelector('[aria-label="Cerrar menú"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(sidebar.mobileOpen()).toBe(false);

    sidebar.openMobile();
    fixture.detectChanges();
    (root.querySelector('[data-sidebar-backdrop]') as HTMLElement).click();
    fixture.detectChanges();
    expect(sidebar.mobileOpen()).toBe(false);

    sidebar.openMobile();
    fixture.detectChanges();
    dialog = root.querySelector('[role="dialog"]') as HTMLElement;
    (dialog.querySelector('a[href="/actividades"]') as HTMLAnchorElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(sidebar.mobileOpen()).toBe(false);
  });
});

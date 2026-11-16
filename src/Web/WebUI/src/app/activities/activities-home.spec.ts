import { TestBed } from '@angular/core/testing';
import { ActivitiesHome } from './activities-home';
import { describe, expect, it } from 'vitest';

describe('ActivitiesHome', () => {
  it('clearly identifies the incomplete migration without offering write actions', () => {
    const fixture = TestBed.createComponent(ActivitiesHome);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent).toBe('Actividades');
    expect(element.querySelector('[role="status"]')?.textContent)
      .toBe('Migración en curso. La consulta y gestión de actividades todavía no están disponibles.');
    expect(element.querySelectorAll('button, input, form').length).toBe(0);
  });
});

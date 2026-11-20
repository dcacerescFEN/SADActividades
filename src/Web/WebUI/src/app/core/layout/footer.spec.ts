import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Footer } from './footer';

describe('Footer', () => {
  it('muestra la identidad institucional y la versión', () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('footer.layout-footer')?.textContent)
      .toContain('Facultad de Economía y Negocios - Universidad de Chile');
    expect(element.querySelector('footer.layout-footer')?.textContent).toContain('Version 1.0.0');
    expect(element.querySelectorAll('footer.layout-footer span').length).toBe(2);
  });
});

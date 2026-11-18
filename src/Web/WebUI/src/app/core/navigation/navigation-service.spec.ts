import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { NavigationService } from './navigation-service';

describe('Navegación de Actividades', () => {
  it('expone solo el calendario como destino activo del módulo', () => {
    const navigation = TestBed.inject(NavigationService);

    expect(navigation.links()).toEqual([{
      key: 'calendar',
      label: 'Calendario de Actividades',
      icon: 'bi-calendar-event',
      url: '/actividades',
      active: true,
    }]);
  });

  it('conserva la forma de los destinos para futuras entradas y permisos', () => {
    const navigation = TestBed.inject(NavigationService);
    const [link] = navigation.links();

    expect(Object.keys(link).sort()).toEqual(['active', 'icon', 'key', 'label', 'url']);
    expect(typeof link.active).toBe('boolean');
    expect(link.url.startsWith('/')).toBe(true);
    expect(navigation.links().some(item => item.label === 'Informes')).toBe(false);
  });
});

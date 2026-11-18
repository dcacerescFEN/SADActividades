import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeStore } from './theme-store';

const STORAGE_KEY = 'sadactividades-theme-preference';

describe('Tema de SADActividades', () => {
  let notifyChange: () => void;
  let media: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    notifyChange = () => undefined;
    media = {
      matches: true,
      addEventListener: vi.fn((_event: string, listener: () => void) => { notifyChange = listener; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(media as unknown as MediaQueryList));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-bs-theme');
    document.documentElement.style.colorScheme = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sigue el tema del sistema en auto y reacciona a sus cambios', () => {
    const theme = TestBed.inject(ThemeStore);

    expect(theme.preference()).toBe('auto');
    expect(theme.resolvedTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');

    media.matches = false;
    notifyChange();

    expect(theme.resolvedTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('persiste la preferencia propia y la aplica al documento', () => {
    const theme = TestBed.inject(ThemeStore);

    theme.setPreference('light');

    expect(theme.preference()).toBe('light');
    expect(theme.resolvedTheme()).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    theme.setPreference('dark');

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('recupera la preferencia guardada entre instancias', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const first = TestBed.inject(ThemeStore);

    expect(first.preference()).toBe('dark');
    expect(first.resolvedTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it.each(['solarized', '', 'AUTO', 'true'])('rechaza el valor guardado %j y usa auto', (stored) => {
    localStorage.setItem(STORAGE_KEY, stored);
    const theme = TestBed.inject(ThemeStore);

    expect(theme.preference()).toBe('auto');
    expect(theme.resolvedTheme()).toBe('dark');
  });

  it('tolera almacenamiento no disponible sin romper el tema', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const theme = TestBed.inject(ThemeStore);

    expect(() => theme.setPreference('light')).not.toThrow();
    expect(theme.preference()).toBe('light');
    expect(theme.resolvedTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('retira el escucha del sistema cuando se destruye el servicio', () => {
    TestBed.inject(ThemeStore);

    TestBed.resetTestingModule();

    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/** Preferencias de tema disponibles en el menú del encabezado. */
export const THEME_PREFERENCES = { LIGHT: 'light', DARK: 'dark', AUTO: 'auto' } as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[keyof typeof THEME_PREFERENCES];

const RESOLVED_THEMES = { LIGHT: 'light', DARK: 'dark' } as const;

export type ResolvedTheme = (typeof RESOLVED_THEMES)[keyof typeof RESOLVED_THEMES];

const STORAGE_KEY = 'sadactividades-theme-preference';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/**
 * Estado del modo oscuro del shell. Resuelve la preferencia elegida contra el
 * tema del sistema y la aplica al documento, de modo que los tokens de
 * `styles.scss` respondan al atributo `data-theme`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  // El entorno de pruebas no siempre implementa matchMedia; sin él se usa el tema claro.
  private readonly media: MediaQueryList | null = typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_SCHEME_QUERY)
    : null;
  private readonly systemDark = signal(this.media?.matches ?? false);
  readonly preference = signal<ThemePreference>(this.storedPreference());
  readonly resolvedTheme = computed<ResolvedTheme>(() => this.preference() === THEME_PREFERENCES.AUTO
    ? (this.systemDark() ? RESOLVED_THEMES.DARK : RESOLVED_THEMES.LIGHT)
    : this.preference() as ResolvedTheme);

  constructor() {
    const media = this.media;
    if (media) {
      const handleSystemChange = () => {
        this.systemDark.set(media.matches);
        this.applyTheme();
      };
      media.addEventListener('change', handleSystemChange);
      inject(DestroyRef).onDestroy(() => media.removeEventListener('change', handleSystemChange));
    }
    this.applyTheme();
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // El almacenamiento es opcional; la preferencia sigue vigente en memoria.
    }
    this.applyTheme();
  }

  /** Recupera la preferencia guardada y descarta cualquier valor desconocido. */
  private storedPreference(): ThemePreference {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === THEME_PREFERENCES.LIGHT || value === THEME_PREFERENCES.DARK
        ? value as ThemePreference
        : THEME_PREFERENCES.AUTO;
    } catch {
      return THEME_PREFERENCES.AUTO;
    }
  }

  private applyTheme(): void {
    const root = document.documentElement;
    const theme = this.resolvedTheme();
    root.setAttribute('data-bs-theme', theme);
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }
}

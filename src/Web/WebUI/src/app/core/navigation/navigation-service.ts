import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth-service';

/** Enlace de la barra: la URL es nula cuando la configuración publicada no es segura. */
export interface NavigationLink {
  key: string;
  label: string;
  icon: string;
  url: string | null;
}

/**
 * Destinos de la barra en el orden institucional: clave, etiqueta en español, icono y
 * las claves del menú publicado que aportan la URL y el cliente de Keycloak de cada sitio.
 */
const DESTINATIONS = [
  ['student', 'Alumnos', 'bi-person-badge', 'studentsMenuUrl', 'studentsMenuClientId'],
  ['teacher', 'Profesores', 'bi-person-lines-fill', 'teachersMenuUrl', 'teachersMenuClientId'],
  ['courses', 'Cursos', 'bi-book', 'coursesMenuUrl', 'coursesMenuClientId'],
  ['exams', 'Exámenes', 'bi-clipboard-check', 'examsMenuUrl', 'examsMenuClientId'],
  ['activities', 'Actividades', 'bi-calendar-event', 'activitiesMenuUrl', 'activitiesMenuClientId'],
  ['assistants', 'Ayudantes', 'bi-people', 'assistantsMenuUrl', 'assistantsMenuClientId'],
  ['processes', 'Procesos', 'bi-gear', 'processesMenuUrl', 'processesMenuClientId'],
  ['reports', 'Informes', 'bi-file-earmark-bar-graph', 'reportsMenuUrl', 'reportsMenuClientId'],
  ['administration', 'Administración', 'bi-shield-lock', 'administrationMenuUrl', 'administrationMenuClientId'],
] as const;

/** Aviso único de la barra cuando el menú publicado no está disponible. */
const MENU_UNAVAILABLE = 'No se pudo cargar la navegación.';

/**
 * Acepta solo URLs absolutas http(s) sin credenciales, espacios ni caracteres de control.
 * Una URL inválida deja el enlace deshabilitado: nunca se propaga al documento.
 */
function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !/^https?:\/\/[^/?#]/i.test(value)
    || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname
      && !url.username && !url.password ? value : null;
  } catch {
    return null;
  }
}

/**
 * Menú central del sitio: lee la configuración publicada por la API y compone los
 * enlaces de la barra solo para los clientes que el token autoriza.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly menu = signal<Record<string, unknown>>({});
  /** Mensaje en español que explica por qué la navegación no está disponible. */
  readonly error = signal('');

  readonly links = computed<NavigationLink[]>(() => {
    if (!this.auth.isAuthenticated()) return [];
    return DESTINATIONS.flatMap(([key, label, icon, urlKey, clientKey]) => {
      const value = this.menu()[clientKey];
      const clientId = typeof value === 'string' ? value.trim() : '';
      return this.auth.hasSiteAccess(clientId)
        ? [{ key, label, icon, url: safeUrl(this.menu()[urlKey]) }]
        : [];
    });
  });

  /** Carga el menú publicado; ante cualquier fallo retira los enlaces y avisa en español. */
  async load(): Promise<void> {
    this.menu.set({});
    this.error.set('');
    try {
      const config = await firstValueFrom(
        this.http.get<{ success: boolean; message: string; data?: unknown }>('/api/config/site'),
      );
      const menu = config?.data;
      if (config.success !== true || typeof config.message !== 'string'
        || typeof menu !== 'object' || menu === null || Array.isArray(menu))
        throw new Error(MENU_UNAVAILABLE);
      this.menu.set(menu as Record<string, unknown>);
    } catch {
      this.menu.set({});
      this.error.set(MENU_UNAVAILABLE);
    }
  }
}

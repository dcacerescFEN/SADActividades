import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

export const AUTH_STATUS = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  UNAVAILABLE: 'unavailable',
} as const;

export type AuthStatus = (typeof AUTH_STATUS)[keyof typeof AUTH_STATUS];

export interface PublicKeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export const KEYCLOAK_FACTORY = new InjectionToken<(config: PublicKeycloakConfig) => Keycloak>(
  'KEYCLOAK_FACTORY', { providedIn: 'root', factory: () => (config) => new Keycloak(config) },
);

/** Formato exacto de un permiso estándar del módulo; los nombres legados no encajan. */
const ACTIVITY_PERMISSION_PATTERN = /^PERMISSION_ACTIVITY_[A-Z0-9_]+$/;

/** Roles administrativos que satisfacen cualquier permiso del módulo, igual que la API. */
const ACTIVITY_ADMIN_ROLES: readonly string[] = ['ROLE_ACTIVITY_ADMIN', 'ROLE_ACTIVITY_SUPERADMIN'];

function isConfiguration(value: unknown): value is PublicKeycloakConfig {
  if (typeof value !== 'object' || value === null) return false;
  const url = Reflect.get(value, 'url');
  const realm = Reflect.get(value, 'realm');
  const clientId = Reflect.get(value, 'clientId');
  if (typeof url !== 'string' || typeof realm !== 'string' || typeof clientId !== 'string'
    || !realm.trim() || !clientId.trim()) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

async function within<T>(
  promise: Promise<T>, milliseconds: number, cancel?: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      cancel?.();
      reject(new Error('timeout'));
    }, milliseconds);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function loadPublicConfiguration(): Promise<{ response: Response; configuration: unknown }> {
  const controller = new AbortController();
  const operation = (async () => {
    const response = await fetch('/api/config/keycloak', { signal: controller.signal });
    const configuration: unknown = await response.json();
    return { response, configuration };
  })();
  return within(operation, 10_000, () => controller.abort());
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly createKeycloak = inject(KEYCLOAK_FACTORY);
  private keycloak?: Keycloak;
  private readonly authStatus = signal<AuthStatus>(AUTH_STATUS.INITIALIZING);
  private readonly authError = signal('');
  private readonly authenticated = signal(false);
  private readonly user = signal('');
  private readonly displayName = signal('');
  private readonly clientRoles = signal<readonly string[]>([]);
  private clientId = '';

  readonly status = this.authStatus.asReadonly();
  readonly error = this.authError.asReadonly();
  readonly isAuthenticated = this.authenticated.asReadonly();
  readonly username = this.user.asReadonly();
  readonly name = this.displayName.asReadonly();

  async initialize(): Promise<void> {
    this.authStatus.set(AUTH_STATUS.INITIALIZING);
    this.authError.set('');
    try {
      const { response, configuration } = await loadPublicConfiguration();
      if (!response.ok || !isConfiguration(configuration)) {
        this.setUnavailable('La autenticación no está disponible.');
        return;
      }

      const keycloak = this.createKeycloak(configuration);
      this.clientId = configuration.clientId;
      this.keycloak = keycloak;
      keycloak.onAuthLogout = () => this.syncSession();
      keycloak.onTokenExpired = () => { void this.getValidToken().catch(() => undefined); };
      await within(keycloak.init({
        onLoad: 'check-sso', pkceMethod: 'S256', responseMode: 'query', checkLoginIframe: false,
      }), 10_000);
      this.syncSession();
      this.authStatus.set(AUTH_STATUS.READY);
    } catch {
      this.setUnavailable('No fue posible iniciar la autenticación.');
    }
  }

  async login(returnUrl = '/'): Promise<void> {
    if (this.status() !== AUTH_STATUS.READY) return;
    const redirect = new URL(returnUrl, window.location.origin);
    if (redirect.origin !== window.location.origin)
      throw new Error('El destino de acceso debe pertenecer a esta aplicación.');
    await this.requireKeycloak().login({ redirectUri: redirect.href });
  }

  async logout(): Promise<void> {
    await this.requireKeycloak().logout({ redirectUri: window.location.origin + '/' });
    this.clearSession();
  }

  async getValidToken(): Promise<string | undefined> {
    if (this.status() !== AUTH_STATUS.READY) return undefined;
    const keycloak = this.requireKeycloak();
    if (!keycloak.authenticated) {
      this.syncSession();
      return undefined;
    }
    try {
      await keycloak.updateToken(30);
      this.syncSession();
      return keycloak.token;
    } catch {
      keycloak.clearToken();
      this.clearSession();
      throw new Error('La sesión ha expirado. Inicia sesión nuevamente.');
    }
  }

  /**
   * Verifica un permiso estándar del módulo contra los roles del cliente
   * configurado. Replica la regla de la API: los roles administrativos del
   * módulo satisfacen cualquier permiso, los nombres legados y los roles de
   * otros clientes o de realm nunca se aceptan.
   */
  hasPermission(permission: string): boolean {
    if (!this.authenticated()) return false;
    if (!ACTIVITY_PERMISSION_PATTERN.test(permission)) return false;
    const roles = this.clientRoles();
    return roles.includes(permission)
      || ACTIVITY_ADMIN_ROLES.some(role => roles.includes(role));
  }

  private requireKeycloak(): Keycloak {
    if (!this.keycloak) throw new Error('Keycloak no está inicializado.');
    return this.keycloak;
  }

  private syncSession(): void {
    const authenticated = this.keycloak?.authenticated === true;
    this.authenticated.set(authenticated);
    const username: unknown = this.keycloak?.tokenParsed?.['preferred_username'];
    this.user.set(authenticated && typeof username === 'string' ? username : '');
    const name: unknown = this.keycloak?.tokenParsed?.['name'];
    this.displayName.set(authenticated && typeof name === 'string' ? name.trim() : '');
    this.clientRoles.set(authenticated ? this.tokenClientRoles() : []);
  }

  /** Lee los roles del cliente configurado desde `resource_access`; ignora `realm_access`. */
  private tokenClientRoles(): string[] {
    if (!this.clientId) return [];
    const access: unknown = this.keycloak?.tokenParsed?.['resource_access'];
    if (typeof access !== 'object' || access === null || Array.isArray(access)) return [];
    if (!Object.prototype.hasOwnProperty.call(access, this.clientId)) return [];
    const entry: unknown = (access as Record<string, unknown>)[this.clientId];
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return [];
    const roles: unknown = (entry as { roles?: unknown }).roles;
    if (!Array.isArray(roles)) return [];
    return roles.filter((role): role is string => typeof role === 'string');
  }

  private clearSession(): void {
    this.authenticated.set(false);
    this.user.set('');
    this.displayName.set('');
    this.clientRoles.set([]);
  }

  private setUnavailable(message: string): void {
    this.clearSession();
    this.authStatus.set(AUTH_STATUS.UNAVAILABLE);
    this.authError.set(message);
  }
}

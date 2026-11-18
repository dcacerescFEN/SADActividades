import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import Keycloak from 'keycloak-js';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AUTH_STATUS, AuthService, KEYCLOAK_FACTORY } from './auth-service';
import { authGuard } from './auth-guard';
import { authInterceptor } from './auth-interceptor';

const config = { url: 'https://identity.example.test', realm: 'activities', clientId: 'SADActividades' };

describe('Keycloak authentication', () => {
  let auth: AuthService;
  let adapter: {
    authenticated: boolean;
    token?: string;
    tokenParsed?: Record<string, unknown>;
    init: ReturnType<typeof vi.fn>;
    updateToken: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    clearToken: ReturnType<typeof vi.fn>;
    onTokenExpired?: () => void;
    onAuthLogout?: () => void;
  };
  let factory: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = {
      authenticated: false,
      token: undefined,
      tokenParsed: undefined,
      init: vi.fn().mockResolvedValue(false),
      updateToken: vi.fn().mockResolvedValue(false),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      clearToken: vi.fn(),
    };
    factory = vi.fn(() => adapter as unknown as Keycloak);
    TestBed.configureTestingModule({ providers: [{ provide: KEYCLOAK_FACTORY, useValue: factory }] });
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports unavailable authentication when public configuration is absent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ title: 'La autenticación no está disponible.' }), { status: 503 },
    ));

    await expect(auth.initialize()).resolves.toBeUndefined();

    expect(auth.status()).toBe(AUTH_STATUS.UNAVAILABLE);
    expect(auth.error()).toBe('La autenticación no está disponible.');
    expect(factory).not.toHaveBeenCalled();
  });

  it('finaliza como no disponible si la lectura del cuerpo de configuración no responde', async () => {
    vi.useFakeTimers();
    const json = vi.fn(() => new Promise<never>(() => undefined));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json } as unknown as Response);

    const initialization = auth.initialize();
    let settled = false;
    void initialization.finally(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(10_001);

    expect(settled).toBe(true);
    await initialization;
    expect(auth.status()).toBe(AUTH_STATUS.UNAVAILABLE);
    expect(auth.error()).toBe('No fue posible iniciar la autenticación.');
    expect(factory).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('initializes a public client with PKCE and exposes an authenticated identity', async () => {
    adapter.authenticated = true;
    adapter.token = 'signed-token';
    adapter.tokenParsed = { preferred_username: 'usuario-prueba' };
    adapter.init.mockResolvedValue(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(config)));

    await auth.initialize();

    expect(factory).toHaveBeenCalledWith(config);
    expect(adapter.init).toHaveBeenCalledWith({
      onLoad: 'check-sso', pkceMethod: 'S256', responseMode: 'query', checkLoginIframe: false,
    });
    expect(auth.status()).toBe(AUTH_STATUS.READY);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.username()).toBe('usuario-prueba');
  });

  it('leaves a clear unavailable state when the identity provider cannot initialize', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(config)));
    adapter.init.mockRejectedValue(new Error('network detail'));

    await auth.initialize();

    expect(auth.status()).toBe(AUTH_STATUS.UNAVAILABLE);
    expect(auth.error()).toBe('No fue posible iniciar la autenticación.');
    expect(auth.isAuthenticated()).toBe(false);
  });

  /** Abre una sesión de prueba con los datos del token indicados. */
  async function authenticateWith(tokenParsed: Record<string, unknown>): Promise<void> {
    adapter.authenticated = true;
    adapter.token = 'signed-token';
    adapter.tokenParsed = tokenParsed;
    adapter.init.mockResolvedValue(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(config)));
    await auth.initialize();
  }

  /** Roles que el cliente configurado recibe en el token de prueba. */
  function clientRoles(roles: string[], client = 'SADActividades'): Record<string, unknown> {
    return { resource_access: { [client]: { roles } } };
  }

  it('expone el nombre visible del token sin espacios externos', async () => {
    await authenticateWith({ preferred_username: 'usuario-prueba', name: '  Usuario Prueba  ' });

    expect(auth.name()).toBe('Usuario Prueba');
  });

  it('deja el nombre vacío cuando el token no lo incluye', async () => {
    await authenticateWith({ preferred_username: 'usuario-prueba' });

    expect(auth.name()).toBe('');
  });

  it('niega cualquier permiso cuando no hay sesión iniciada', async () => {
    adapter.tokenParsed = clientRoles(['PERMISSION_ACTIVITY_VIEW_CALENDAR', 'ROLE_ACTIVITY_ADMIN']);
    adapter.init.mockResolvedValue(false);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(config)));

    await auth.initialize();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.hasPermission('PERMISSION_ACTIVITY_VIEW_CALENDAR')).toBe(false);
  });

  it('concede el permiso exacto otorgado al cliente configurado', async () => {
    await authenticateWith(clientRoles(['PERMISSION_ACTIVITY_VIEW_CALENDAR']));

    expect(auth.hasPermission('PERMISSION_ACTIVITY_VIEW_CALENDAR')).toBe(true);
    expect(auth.hasPermission('PERMISSION_ACTIVITY_CREATE_TEACHING_ACTIVITY')).toBe(false);
  });

  it('concede los permisos del módulo a los roles administrativos', async () => {
    await authenticateWith(clientRoles(['ROLE_ACTIVITY_ADMIN']));

    expect(auth.hasPermission('PERMISSION_ACTIVITY_VIEW_CALENDAR')).toBe(true);
    expect(auth.hasPermission('PERMISSION_ACTIVITY_DELETE_NON_TEACHING_ACTIVITY')).toBe(true);
  });

  it('reconoce también al superadministrador del módulo', async () => {
    await authenticateWith(clientRoles(['ROLE_ACTIVITY_SUPERADMIN']));

    expect(auth.hasPermission('PERMISSION_ACTIVITY_EDIT_ROOM_ASSIGNMENT')).toBe(true);
  });

  it('rechaza los roles de otros clientes y los roles de realm', async () => {
    await authenticateWith({
      resource_access: {
        SADInformes: { roles: ['PERMISSION_ACTIVITY_VIEW_CALENDAR', 'ROLE_ACTIVITY_ADMIN'] },
      },
      realm_access: { roles: ['PERMISSION_ACTIVITY_VIEW_CALENDAR', 'ROLE_ACTIVITY_ADMIN'] },
    });

    expect(auth.hasPermission('PERMISSION_ACTIVITY_VIEW_CALENDAR')).toBe(false);
  });

  it('rechaza los nombres legados y los permisos de otros módulos', async () => {
    await authenticateWith(clientRoles(['Viñeta Actividades', 'PERMISSION_REPORT_ACCESS_MODULE']));

    expect(auth.hasPermission('Viñeta Actividades')).toBe(false);
    expect(auth.hasPermission('PERMISSION_REPORT_ACCESS_MODULE')).toBe(false);
    expect(auth.hasPermission('PERMISSION_ACTIVITY_VIEW_CALENDAR')).toBe(false);
  });
});

describe('Authentication guard and token scope', () => {
  let auth: {
    status: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    getValidToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = {
      status: vi.fn(() => AUTH_STATUS.READY),
      isAuthenticated: vi.fn(() => false),
      login: vi.fn().mockResolvedValue(undefined),
      getValidToken: vi.fn().mockResolvedValue('signed-token'),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: auth },
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ] });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('does not start login when authentication is unavailable', async () => {
    auth.status.mockReturnValue(AUTH_STATUS.UNAVAILABLE);
    const result = await TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot, { url: '/actividades' } as RouterStateSnapshot,
    ));
    expect(result).toBe(false);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('sends bearer tokens only to same-origin /api/ requests', async () => {
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    http.get('/api/auth/me').subscribe();
    await Promise.resolve();
    const api = controller.expectOne('/api/auth/me');
    expect(api.request.headers.get('Authorization')).toBe('Bearer signed-token');
    api.flush({ username: 'usuario-prueba' });

    for (const url of ['https://external.example/api/me', '//external.example/api/me', '/assets/app.svg']) {
      http.get(url).subscribe();
      const external = controller.expectOne(url);
      expect(external.request.headers.has('Authorization')).toBe(false);
      external.flush({});
    }
    expect(auth.getValidToken).toHaveBeenCalledTimes(1);
  });
});

import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth-service';
import { NavigationService } from './navigation-service';

/** Mensaje único que la barra muestra cuando el menú publicado no está disponible. */
const MENU_ERROR = 'No se pudo cargar la navegación.';

describe('Barra de navegación del sitio', () => {
  const authenticated = signal(true);
  const hasSiteAccess = vi.fn<(clientId: string) => boolean>();
  let navigation: NavigationService;
  let http: HttpTestingController;

  /** Todos los clientes institucionales publicados en el menú, en el orden de la barra. */
  const ALL_ACCESS = [
    'SADAlumnos', 'SADProfesores', 'SADCursos', 'SADExamenes', 'SADActividades',
    'SADAyudantes', 'SADProcesos', 'SADInformes-iis', 'SADAdministracion',
  ];

  /** Menú completo con las nueve URLs y los nueve clientes del contrato. */
  const FULL_MENU: Record<string, string> = {
    studentsMenuUrl: 'https://alumnos.example.test', studentsMenuClientId: 'SADAlumnos',
    teachersMenuUrl: 'https://profesores.example.test', teachersMenuClientId: 'SADProfesores',
    coursesMenuUrl: 'https://cursos.example.test', coursesMenuClientId: 'SADCursos',
    examsMenuUrl: 'https://examenes.example.test', examsMenuClientId: 'SADExamenes',
    activitiesMenuUrl: 'https://actividades.example.test', activitiesMenuClientId: 'SADActividades',
    assistantsMenuUrl: 'https://ayudantes.example.test', assistantsMenuClientId: 'SADAyudantes',
    processesMenuUrl: 'https://procesos.example.test', processesMenuClientId: 'SADProcesos',
    reportsMenuUrl: 'https://informes.example.test', reportsMenuClientId: 'SADInformes-iis',
    administrationMenuUrl: 'https://administracion.example.test', administrationMenuClientId: 'SADAdministracion',
  };

  beforeEach(() => {
    authenticated.set(true);
    hasSiteAccess.mockReset();
    hasSiteAccess.mockImplementation((clientId: string) => ALL_ACCESS.includes(clientId));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: authenticated, hasSiteAccess } },
      ],
    });
    navigation = TestBed.inject(NavigationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Ejecuta `load()` contra una respuesta concreta del endpoint de configuración. */
  async function load(body: unknown, status = 200): Promise<void> {
    const pending = navigation.load();
    const request = http.expectOne('/api/config/site');
    expect(request.request.method).toBe('GET');
    if (status === 200) request.flush(body as object);
    else request.flush(body as object, { status, statusText: 'Service Unavailable' });
    await pending;
  }

  /** Envoltorio correcto del contrato compartido de la API. */
  function envelope(data: unknown): Record<string, unknown> {
    return { success: true, message: 'Operación exitosa.', data };
  }

  it('publica los nueve sitios en el orden de la barra', async () => {
    await load(envelope(FULL_MENU));

    expect(navigation.error()).toBe('');
    expect(navigation.links().map(link => link.key)).toEqual([
      'student', 'teacher', 'courses', 'exams', 'activities',
      'assistants', 'processes', 'reports', 'administration',
    ]);
    expect(navigation.links().map(link => link.label)).toEqual([
      'Alumnos', 'Profesores', 'Cursos', 'Exámenes', 'Actividades',
      'Ayudantes', 'Procesos', 'Informes', 'Administración',
    ]);
    expect(navigation.links().map(link => link.icon)).toEqual([
      'bi-person-badge', 'bi-person-lines-fill', 'bi-book', 'bi-clipboard-check', 'bi-calendar-event',
      'bi-people', 'bi-gear', 'bi-file-earmark-bar-graph', 'bi-shield-lock',
    ]);
    expect(navigation.links()[4].url).toBe('https://actividades.example.test');
    expect(hasSiteAccess).toHaveBeenCalledWith('SADInformes-iis');
  });

  it('oculta el sitio cuyo cliente no tiene acceso y conserva el resto', async () => {
    hasSiteAccess.mockImplementation((clientId: string) => clientId === 'SADActividades');
    await load(envelope(FULL_MENU));

    expect(navigation.links().map(link => link.key)).toEqual(['activities']);
  });

  it('oculta el sitio cuando el menú no publica su cliente', async () => {
    await load(envelope({ activitiesMenuUrl: 'https://actividades.example.test' }));

    expect(navigation.links()).toEqual([]);
    expect(hasSiteAccess).toHaveBeenCalledWith('');
  });

  it('no publica enlaces sin sesión iniciada', async () => {
    await load(envelope(FULL_MENU));
    authenticated.set(false);

    expect(navigation.links()).toEqual([]);
  });

  it('deshabilita un sitio autorizado cuya URL no es absoluta http(s) segura', async () => {
    const invalid = [
      null, '', '/actividades', 'actividades.example.test', 'javascript:alert(1)', 'data:text/html,x',
      'ftp://example.test', 'https://usuario:clave@example.test', 'https://example .test',
      'https:///example.test', ' https://example.test', 'https://example.test/\u0000',
      'https://example.test/a\u0001b', 'https://example.test\n', 'https:\\\\example.test',
    ];
    for (const url of invalid) {
      await load(envelope({ ...FULL_MENU, activitiesMenuUrl: url }));
      expect(navigation.links()).toHaveLength(9);
      expect(navigation.links()[4]).toMatchObject({ key: 'activities', url: null });
    }
  });

  it('acepta URLs absolutas http y https sin credenciales', async () => {
    await load(envelope({ ...FULL_MENU, activitiesMenuUrl: 'http://actividades.example.test/agenda?dia=1' }));

    expect(navigation.links()[4].url).toBe('http://actividades.example.test/agenda?dia=1');
  });

  it('normaliza los espacios externos del cliente publicado', async () => {
    await load(envelope({ ...FULL_MENU, activitiesMenuClientId: '  SADActividades  ' }));

    expect(navigation.links().map(link => link.key)).toContain('activities');
    expect(hasSiteAccess).toHaveBeenCalledWith('SADActividades');
  });

  it('rechaza un envelope fallido aunque contenga el menú', async () => {
    await load({ success: false, message: 'Error.', data: FULL_MENU });

    expect(navigation.links()).toEqual([]);
    expect(navigation.error()).toBe(MENU_ERROR);
  });

  it('rechaza un contrato con datos que no son un objeto de menú', async () => {
    for (const data of [null, [], 'texto', 7]) {
      await load(envelope(data));
      expect(navigation.links()).toEqual([]);
      expect(navigation.error()).toBe(MENU_ERROR);
    }
  });

  it('rechaza un envelope sin mensaje de texto', async () => {
    await load({ success: true, data: FULL_MENU });

    expect(navigation.links()).toEqual([]);
    expect(navigation.error()).toBe(MENU_ERROR);
  });

  it('retira los enlaces anteriores y avisa cuando el endpoint responde 503', async () => {
    await load(envelope(FULL_MENU));
    expect(navigation.links()).toHaveLength(9);

    await load({ title: 'La navegación no está disponible.' }, 503);

    expect(navigation.links()).toEqual([]);
    expect(navigation.error()).toBe(MENU_ERROR);
  });
});

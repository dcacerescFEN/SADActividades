import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ActivitiesHome } from './activities-home';

const catalogs = { success: true, message: '', data: {
  categories: [{ value: '-100', text: 'Todas' }], types: [{ value: 'SEMINARIO', text: 'SEMINARIO' }],
  sectors: [{ value: 'TODOS', text: 'Todos' }], locations: [{ value: 'TODAS', text: 'Todas' }],
} };
const row = { id: 7, title: 'Seminario', course: null, professor: 'Ana', category: 'DOCENCIA', type: 'SEMINARIO',
  date: '01/05/2024', start: '09:00', end: '10:00', studentType: null, modality: null, promotion: null,
  rooms: 'Sala 1', published: true, suspended: false };
const emptyPage = { success: true, message: '', data: [] };

describe('ActivitiesHome', () => {
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  /** Crea la pantalla y resuelve la carga inicial de catálogos. */
  function create(): ComponentFixture<ActivitiesHome> {
    const fixture = TestBed.createComponent(ActivitiesHome);
    fixture.detectChanges();
    controller.expectOne(request => request.url === '/api/activities/catalogs').flush(catalogs);
    fixture.detectChanges();
    return fixture;
  }

  /** Envía el formulario por su evento público de Angular. */
  function submit(fixture: ComponentFixture<ActivitiesHome>): void {
    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit');
    fixture.detectChanges();
  }

  /** Responde la consulta del calendario con el cuerpo indicado. */
  function answer(fixture: ComponentFixture<ActivitiesHome>, body: object, status = 200) {
    controller.expectOne(request => request.url === '/api/activities')
      .flush(body, { status, statusText: status === 200 ? 'OK' : 'Error' });
    fixture.detectChanges();
  }

  it('muestra la carga, las filas y el detalle de una actividad', async () => {
    const fixture = create();
    submit(fixture);
    expect(fixture.nativeElement.querySelector('p[role="status"]')?.textContent).toContain('Cargando actividades');

    answer(fixture, { success: true, message: '', data: [row] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-table')?.textContent).toContain('Seminario');
    expect(fixture.nativeElement.querySelector('app-table')?.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).toContain('Total: 1');

    (fixture.debugElement.query(By.css('[aria-label="Ver detalle de Seminario"]')).nativeElement as HTMLButtonElement).click();
    controller.expectOne('/api/activities/7').flush({ success: true, message: '', data: {
      id: 7, title: 'Seminario', description: 'Descripción del detalle', courseCode: '', section: '',
      module: '', period: '', type: 'SEMINARIO', date: '01/05/2024', start: '09:00', end: '10:00',
      rooms: 'Sala 1', published: true,
    } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Detalle de actividad"]')?.textContent)
      .toContain('Descripción del detalle');
  });

  it('informa cuando el día no tiene actividades', async () => {
    const fixture = create();
    submit(fixture);
    answer(fixture, emptyPage);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay actividades para este día.');
  });

  it('muestra un error sanitizado sin exponer detalles internos', async () => {
    const fixture = create();
    submit(fixture);
    answer(fixture, { detail: 'sql secreto' }, 503);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('No fue posible cargar las actividades.');
    expect(fixture.nativeElement.textContent).not.toContain('sql secreto');
  });

  it('distingue la falta de permiso de consulta', async () => {
    const fixture = create();
    submit(fixture);
    answer(fixture, {}, 403);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('No tienes permiso para consultar actividades.');
  });

  it('descarta una respuesta anterior cuando cambian los filtros', async () => {
    const fixture = create();
    submit(fixture);
    const previous = controller.expectOne(request => request.url === '/api/activities');
    const date = fixture.nativeElement.querySelector('#activity-date') as HTMLInputElement;
    date.value = '2024-05-02';
    date.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p[role="status"]')?.textContent).not.toContain('Seminario');
    previous.flush({ success: true, message: '', data: [row] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-table')).toBeNull();
  });
});

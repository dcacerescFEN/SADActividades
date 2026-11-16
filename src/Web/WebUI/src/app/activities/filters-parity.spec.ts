import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ActivitiesHome } from './activities-home';

const catalogs = { success: true, message: '', data: {
  categories: [{ value: '-100', text: 'Todas' }], types: [{ value: 'CLASE', text: 'CLASE' }],
  sectors: [{ value: 'TODOS', text: 'Todos' }, { value: 'Torre', text: 'TORRE' }],
  locations: [{ value: 'TODAS', text: 'Todas' }, { value: 'A1', text: 'A1' }],
} };
const row = { id: 7, title: 'Seminario', course: null, professor: 'Ana', category: 'DOCENCIA',
  type: 'CLASE', date: '01/05/2024', start: '09:00', end: '10:00', studentType: null,
  modality: null, promotion: null, rooms: 'Sala 1', published: true, suspended: false };

describe('paridad de filtros del calendario', () => {
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  /** Crea la pantalla y resuelve los catálogos iniciales. */
  function create(): ComponentFixture<ActivitiesHome> {
    const fixture = TestBed.createComponent(ActivitiesHome);
    fixture.detectChanges();
    controller.expectOne(request => request.url === '/api/activities/catalogs').flush(catalogs);
    fixture.detectChanges();
    return fixture;
  }

  it('recarga las ubicaciones cuando cambia el sector', () => {
    const fixture = create();
    fixture.componentInstance.form.controls.sector.setValue('Torre');
    fixture.detectChanges();
    const request = controller.expectOne(item => item.url === '/api/activities/catalogs');
    expect(request.request.params.get('sector')).toBe('Torre');
    request.flush(catalogs);
  });

  it('descarta un detalle que llega después de cambiar los filtros', async () => {
    const fixture = create();
    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit');
    fixture.detectChanges();
    controller.expectOne(request => request.url === '/api/activities')
      .flush({ success: true, message: '', data: [row] });
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.debugElement.query(By.css('[aria-label="Ver detalle de Seminario"]')).nativeElement as HTMLButtonElement).click();
    const pendingDetail = controller.expectOne('/api/activities/7');
    const date = fixture.nativeElement.querySelector('#activity-date') as HTMLInputElement;
    date.value = '2024-05-02';
    date.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    pendingDetail.flush({ success: true, message: '', data: {
      id: 7, title: 'Seminario', description: 'Detalle obsoleto', courseCode: 'ICI', section: '1',
      module: 'M1', period: '2024', type: 'CLASE', date: '01/05/2024', start: '09:00', end: '10:00',
      rooms: 'Sala 1', published: true,
    } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Detalle de actividad"]')).toBeNull();
  });
});

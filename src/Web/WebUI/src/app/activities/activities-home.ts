import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { firstValueFrom } from 'rxjs';

interface ApiResponse<T> { success: boolean; message: string; data: T; }
interface Option { value: string; text: string; }
interface Catalogs { categories: Option[]; types: Option[]; sectors: Option[]; locations: Option[]; }
interface ActivityRow {
  id: number; title: string; course: string | null; professor: string | null; category: string; type: string;
  date: string | null; start: string | null; end: string | null; studentType: string | null;
  modality: string | null; promotion: string | null; rooms: string | null; published: boolean; suspended: boolean;
}
interface ActivityDetail {
  id: number; title: string; description: string; courseCode: string; section: string; module: string;
  period: string; type: string; date: string | null; start: string | null; end: string | null;
  rooms: string | null; published: boolean;
}

@Component({
  selector: 'app-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-responsive">
      <table class="app-table">
        <thead><tr><th>Actividad</th><th>Curso</th><th>Profesor</th><th>Categoría</th><th>Tipo</th><th>Fecha</th><th>Horario</th><th>Ubicación</th><th>Publicar</th><th>Suspendida</th><th>Detalle</th></tr></thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr><td>{{ row.title }}</td><td>{{ row.course || '—' }}</td><td>{{ row.professor || '—' }}</td><td>{{ row.category }}</td><td>{{ row.type }}</td><td>{{ row.date || '—' }}</td><td>{{ row.start || '—' }}–{{ row.end || '—' }}</td><td>{{ row.rooms || '—' }}</td><td>{{ row.published ? 'Sí' : 'No' }}</td><td>{{ row.suspended ? 'Sí' : 'No' }}</td><td><button type="button" class="icon-action" title="Ver detalle" [attr.aria-label]="'Ver detalle de ' + row.title" (click)="select(row.id)">ⓘ</button></td></tr>
          }
        </tbody>
      </table>
    </div>`,
})
export class ActivityTable {
  readonly rows = input<readonly ActivityRow[]>([]);
  readonly selected = output<number>();
  protected select(id: number): void { this.selected.emit(id); }
}

@Component({
  selector: 'app-activities-home',
  imports: [ReactiveFormsModule, NgSelectModule, ActivityTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header"><h1 class="page-title">Calendario de Actividades</h1><p class="page-subtitle">Consulta diaria de actividades docentes y no docentes.</p></div>
    <section class="form-section" aria-labelledby="filters-title"><h2 id="filters-title" class="section-title">Filtros</h2>
      <form [formGroup]="form" (ngSubmit)="loadActivities()" class="filters-grid">
        <div class="form-floating"><input id="activity-date" class="form-control" type="date" placeholder="Fecha" formControlName="date"><label for="activity-date">Fecha</label></div>
        <div class="ng-select-container-custom"><label class="floating-label" for="activity-category">Categoría</label><ng-select id="activity-category" class="ng-select-custom" formControlName="category" [items]="catalogs().categories" bindLabel="text" bindValue="value" [searchable]="true" [clearable]="false" appendTo="body" /></div>
        <div class="ng-select-container-custom"><label class="floating-label" for="activity-sector">Sector</label><ng-select id="activity-sector" class="ng-select-custom" formControlName="sector" [items]="catalogs().sectors" bindLabel="text" bindValue="value" [searchable]="true" [clearable]="false" appendTo="body" /></div>
        <div class="ng-select-container-custom"><label class="floating-label" for="activity-location">Ubicación</label><ng-select id="activity-location" class="ng-select-custom" formControlName="location" [items]="catalogs().locations" bindLabel="text" bindValue="value" [searchable]="true" [clearable]="false" appendTo="body" /></div>
        <button type="submit" class="btn-search" [disabled]="loading()">{{ loading() ? 'Cargando…' : 'Consultar' }}</button>
      </form>
    </section>
    @if (loading()) { <p role="status">Cargando actividades…</p> }
    @if (error()) { <div role="alert" class="alert">{{ error() }}</div> }
    @if (loaded() && !loading() && !error() && rows().length === 0) { <p role="status">No hay actividades para este día.</p> }
    @if (rows().length > 0) { <section class="form-section"><h2 class="section-title">Actividades del día</h2><app-table [rows]="rows()" (selected)="loadDetail($event)" /><p>Total: {{ rows().length }}</p></section> }
    @if (detail(); as item) { <aside class="detail-panel" aria-label="Detalle de actividad"><h2>{{ item.title }}</h2><p>{{ item.description || 'Sin descripción.' }}</p><dl><dt>Tipo</dt><dd>{{ item.type }}</dd><dt>Curso</dt><dd>{{ item.courseCode || '—' }} {{ item.section }}</dd><dt>Fecha y hora</dt><dd>{{ item.date || '—' }} {{ item.start || '' }}–{{ item.end || '' }}</dd><dt>Ubicación</dt><dd>{{ item.rooms || '—' }}</dd><dt>Publicada</dt><dd>{{ item.published ? 'Sí' : 'No' }}</dd></dl><button type="button" class="btn btn-clear" (click)="detail.set(null)">Cerrar</button></aside> }
  `,
  styles: `.filters-grid{display:grid;grid-template-columns:repeat(4,minmax(10rem,1fr)) auto;gap:1rem;align-items:end}.detail-panel{margin-top:1rem;padding:1rem;background:#fff;border:1px solid #ccd7e5}@media(max-width:900px){.filters-grid{grid-template-columns:1fr}}`,
})
export class ActivitiesHome {
  private readonly http = inject(HttpClient);
  readonly form = inject(FormBuilder).nonNullable.group({
    date: new Date().toISOString().slice(0, 10), category: '-100', sector: 'TODOS', location: 'TODAS',
  });
  protected readonly catalogs = signal<Catalogs>({ categories: [{ value: '-100', text: 'Todas' }, { value: '1', text: 'Docentes' }, { value: '0', text: 'No docentes' }], types: [], sectors: [{ value: 'TODOS', text: 'Todos' }], locations: [{ value: 'TODAS', text: 'Todas' }] });
  protected readonly rows = signal<ActivityRow[]>([]);
  protected readonly detail = signal<ActivityDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly loaded = signal(false);
  protected readonly error = signal('');
  private requestVersion = 0;

  constructor() {
    this.form.valueChanges.subscribe(() => { this.requestVersion++; this.rows.set([]); this.detail.set(null); this.loaded.set(false); this.error.set(''); });
    void this.loadCatalogs();
  }

  protected async loadCatalogs(): Promise<void> {
    try {
      const result = await firstValueFrom(this.http.get<ApiResponse<Catalogs>>('/api/activities/catalogs', { params: { category: 'TODAS', sector: this.form.controls.sector.value } }));
      this.catalogs.set(result.data);
    } catch { this.error.set('No se pudieron cargar los filtros de actividades.'); }
  }

  protected async loadActivities(): Promise<void> {
    const version = ++this.requestVersion;
    this.loading.set(true); this.loaded.set(false); this.error.set(''); this.detail.set(null);
    const value = this.form.getRawValue();
    try {
      const result = await firstValueFrom(this.http.get<ApiResponse<ActivityRow[]>>('/api/activities', { params: { date: value.date, category: value.category, sector: value.sector, location: value.location } }));
      if (version !== this.requestVersion) return;
      this.rows.set(result.data); this.loaded.set(true);
    } catch (error: unknown) {
      if (version !== this.requestVersion) return;
      this.rows.set([]); this.loaded.set(true); this.error.set(error instanceof HttpErrorResponse && error.status === 403 ? 'No tienes permiso para consultar actividades.' : 'No fue posible cargar las actividades.');
    } finally { if (version === this.requestVersion) this.loading.set(false); }
  }

  protected async loadDetail(id: number): Promise<void> {
    try { this.detail.set((await firstValueFrom(this.http.get<ApiResponse<ActivityDetail>>(`/api/activities/${id}`))).data); }
    catch { this.error.set('No fue posible cargar el detalle de la actividad.'); }
  }
}

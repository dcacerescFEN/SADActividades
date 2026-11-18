import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Table, type TableColumn } from './table';

interface Row { id: number; title: string; published: boolean; course?: string | null; }

const columns: TableColumn[] = [
  { key: 'title', name: 'Actividad' },
  {
    key: 'published',
    name: 'Publicar',
    format: row => ((row as unknown as Row).published ? 'Sí' : 'No'),
  },
  {
    key: 'detail',
    name: 'Detalle',
    action: {
      icon: 'bi-info-circle',
      label: 'Ver detalle',
      actionKey: 'detail',
      iconOnly: true,
      ariaLabel: row => `Ver detalle de ${(row as unknown as Row).title}`,
    },
  },
];

const initialRows: readonly Row[] = [
  { id: 7, title: 'Seminario', published: true },
  { id: 8, title: 'Taller', published: false },
];

@Component({
  imports: [Table],
  template: `
    <app-table [rows]="rows()" [columns]="columns()" [enableRowClick]="true"
      (selected)="selectedIds.push($event)" (actionEvent)="events.push($event)" />`,
})
class TableHost {
  readonly rows = signal<readonly object[]>(initialRows);
  readonly columns = signal<TableColumn[]>(columns);
  readonly selectedIds: (string | number)[] = [];
  readonly events: { id: string | number | null; actionKey: string }[] = [];
}

describe('tabla compartida', () => {
  /** Crea la tabla con las filas del escenario y devuelve su fixture. */
  function create() {
    const fixture = TestBed.createComponent(TableHost);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra filas, formato de columna y acciones de solo icono con tooltip', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;

    expect([...root.querySelectorAll('thead th')].map(cell => cell.textContent?.trim()))
      .toEqual(['Actividad', 'Publicar', 'Detalle']);
    const bodyRows = [...root.querySelectorAll('tbody tr')];
    expect(bodyRows).toHaveLength(2);
    expect(bodyRows[0].textContent).toContain('Seminario');
    expect(bodyRows[0].textContent).toContain('Sí');
    expect(bodyRows[1].textContent).toContain('No');

    const action = bodyRows[0].querySelector('button') as HTMLButtonElement;
    expect(action.textContent?.trim()).toBe('');
    expect(action.getAttribute('title')).toBe('Ver detalle de Seminario');
    expect(action.getAttribute('aria-label')).toBe('Ver detalle de Seminario');
    expect(action.querySelector('i')?.className).toContain('bi-info-circle');

    action.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.events).toEqual([{ id: 7, actionKey: 'detail' }]);
    expect(fixture.componentInstance.selectedIds).toEqual([]);
  });

  it('muestra el estado vacío cuando no hay filas', () => {
    const fixture = create();
    fixture.componentInstance.rows.set([]);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const empty = root.querySelector('tbody .empty-state') as HTMLTableCellElement;
    expect(empty.textContent).toContain('No se encontraron registros');
    expect(empty.getAttribute('colspan')).toBe('3');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('emite el identificador de la fila elegida al hacer clic o activar con Enter', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const firstRow = root.querySelector('tbody tr') as HTMLTableRowElement;

    expect(firstRow.getAttribute('tabindex')).toBe('0');
    firstRow.click();
    fixture.detectChanges();
    firstRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedIds).toEqual([7, 7]);

    const lastRow = root.querySelectorAll('tbody tr')[1] as HTMLTableRowElement;
    lastRow.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedIds).toEqual([7, 7, 8]);
  });

  it('conserva celdas vacías con guion sin emitir selección al pulsar una acción', () => {
    const fixture = create();
    fixture.componentInstance.rows.set([{ id: 9, title: 'Charla', published: true, course: null }]);
    fixture.componentInstance.columns.set([...columns, { key: 'course', name: 'Curso' }]);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelectorAll('tbody td')[3].textContent?.trim()).toBe('—');
    (root.querySelector('tbody tr td:nth-child(3) button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedIds).toEqual([]);
    expect(fixture.componentInstance.events).toEqual([{ id: 9, actionKey: 'detail' }]);
  });
});

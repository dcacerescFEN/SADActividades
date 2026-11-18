import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Acción de fila: siempre declarada con etiqueta y tooltip, igual que la tabla de referencia. */
export interface TableAction {
  icon?: string;
  label: string | ((row: object) => string);
  actionKey: string;
  cssClass?: string;
  ariaLabel?: (row: object) => string;
  iconOnly?: boolean;
}

/** Columna de la tabla. Una columna puede mostrar un valor o una acción. */
export interface TableColumn {
  key: string;
  name: string;
  format?: (row: object) => string;
  action?: TableAction;
  actionVisible?: (row: object) => boolean;
  actionDisabled?: (row: object) => boolean;
  additionalActions?: readonly TableAction[];
  cellClass?: string;
  multiline?: boolean;
  emphasized?: boolean;
}

@Component({
  selector: 'app-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-container">
      <div class="table-responsive">
        <table class="table table-hover align-middle app-table">
          <thead class="table-light">
            <tr>
              @for (column of columns(); track column.key) {
                <th [class.fw-bold]="column.emphasized">{{ column.name }}</th>
              }
              @if (actions().length > 0) {
                <th>Acciones</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track rowId(row)) {
              <tr [class.row-clickable]="enableRowClick()" [attr.tabindex]="enableRowClick() ? 0 : null"
                (click)="activateRow(row)" (keydown)="handleRowKeydown(row, $event)">
                @for (column of columns(); track column.key) {
                  @if (column.action && isActionVisible(column, row)) {
                    <td class="table-action-cell">
                      <button type="button" [class]="buttonClass(column.action)"
                        [disabled]="isActionDisabled(column, row)"
                        [attr.title]="actionText(column.action, row)"
                        [attr.aria-label]="actionText(column.action, row)"
                        (click)="runAction(row, column.action, $event)">
                        @if (column.action.icon) {
                          <i class="bi" [class]="'bi ' + column.action.icon" aria-hidden="true"></i>
                        }
                        @if (!column.action.iconOnly) {
                          {{ actionText(column.action, row) }}
                        }
                      </button>
                      @for (action of column.additionalActions ?? []; track action.actionKey) {
                        <button type="button" [class]="buttonClass(action)"
                          [disabled]="isActionDisabled(column, row)"
                          [attr.title]="actionText(action, row)"
                          [attr.aria-label]="actionText(action, row)"
                          (click)="runAction(row, action, $event)">
                          @if (action.icon) {
                            <i class="bi" [class]="'bi ' + action.icon" aria-hidden="true"></i>
                          }
                          @if (!action.iconOnly) {
                            {{ actionText(action, row) }}
                          }
                        </button>
                      }
                    </td>
                  } @else {
                    <td [class.table-cell-multiline]="column.multiline" [class]="column.cellClass ?? ''">
                      {{ cellText(row, column) }}
                    </td>
                  }
                }
                @if (actions().length > 0) {
                  <td class="table-action-cell">
                    @for (action of actions(); track action.actionKey) {
                      <button type="button" [class]="buttonClass(action)"
                        [attr.title]="actionText(action, row)"
                        [attr.aria-label]="actionText(action, row)"
                        (click)="runAction(row, action, $event)">
                        @if (action.icon) {
                          <i class="bi" [class]="'bi ' + action.icon" aria-hidden="true"></i>
                        }
                        @if (!action.iconOnly) {
                          {{ actionText(action, row) }}
                        }
                      </button>
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columns().length + (actions().length > 0 ? 1 : 0)"
                  class="text-center empty-state py-4">
                  <i class="bi bi-inbox me-2" aria-hidden="true"></i>{{ emptyMessage() }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .table-action-cell { min-width: 6rem; text-align: center; }
    .table-cell-multiline { white-space: pre-line; }
    .row-clickable { cursor: pointer; }
    .table-action-cell .btn i { font-size: 1rem; }
    .table-action-cell .btn + .btn { margin-left: 0.25rem; }
  `,
})
export class Table {
  readonly rows = input<readonly object[]>([]);
  readonly columns = input<readonly TableColumn[]>([]);
  readonly actions = input<readonly TableAction[]>([]);
  readonly emptyMessage = input('No se encontraron registros');
  readonly rowIdKey = input('id');
  readonly enableRowClick = input(false);
  readonly selected = output<string | number>();
  readonly actionEvent = output<{ id: string | number | null; actionKey: string }>();

  /** Texto de una celda: usa el formateador de la columna y marca los vacíos con un guion. */
  protected cellText(row: object, column: TableColumn): string {
    if (column.format) return column.format(row);
    const value = this.getValue(row, column.key);
    return value === null || value === undefined || value === '' ? '—' : String(value);
  }

  /** Identificador público de la fila, tomado de la clave configurada. */
  protected rowId(row: object): string | number | null {
    const value = this.getValue(row, this.rowIdKey());
    return typeof value === 'string' || typeof value === 'number' ? value : null;
  }

  protected actionText(action: TableAction, row: object): string {
    if (action.ariaLabel) return action.ariaLabel(row);
    return typeof action.label === 'function' ? action.label(row) : action.label;
  }

  protected buttonClass(action: TableAction): string {
    return [ 'btn', action.cssClass ?? '' ].filter(Boolean).join(' ');
  }

  protected isActionVisible(column: TableColumn, row: object): boolean {
    return column.actionVisible?.(row) ?? true;
  }

  protected isActionDisabled(column: TableColumn, row: object): boolean {
    return column.actionDisabled?.(row) ?? false;
  }

  protected runAction(row: object, action: TableAction, event: Event): void {
    event.stopPropagation();
    this.actionEvent.emit({ id: this.rowId(row), actionKey: action.actionKey });
  }

  protected activateRow(row: object): void {
    if (!this.enableRowClick()) return;
    const id = this.rowId(row);
    if (id !== null) this.selected.emit(id);
  }

  protected handleRowKeydown(row: object, event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.activateRow(row);
  }

  private getValue(row: object, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }
}

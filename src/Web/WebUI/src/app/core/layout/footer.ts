import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Pie institucional compartido, alineado con el de SADAlumnos. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="layout-footer">
      <span>Facultad de Economía y Negocios - Universidad de Chile</span>
      <span>Version 1.0.0</span>
    </footer>
  `,
  styles: `
    .layout-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.15rem;
      border: 1px solid var(--layout-border-color);
      background: var(--layout-surface);
      color: var(--layout-muted-text);
      font-size: 0.84rem;
      font-weight: 600;
    }

    @media (max-width: 575.98px) {
      .layout-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.35rem;
      }
    }
  `,
})
export class Footer {}

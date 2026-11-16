import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-activities-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Actividades</h2>
    <p role="status">Migración en curso. La consulta y gestión de actividades todavía no están disponibles.</p>
  `,
})
export class ActivitiesHome {}

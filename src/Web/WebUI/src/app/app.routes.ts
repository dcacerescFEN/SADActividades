import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'actividades' },
  {
    path: 'actividades',
    loadComponent: () => import('./activities/activities-home').then(module => module.ActivitiesHome),
  },
  { path: '**', redirectTo: 'actividades' },
];

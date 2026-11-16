import type { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'actividades' },
  {
    path: 'actividades',
    canActivate: [authGuard],
    loadComponent: () => import('./activities/activities-home').then(module => module.ActivitiesHome),
  },
  { path: '**', redirectTo: 'actividades' },
];

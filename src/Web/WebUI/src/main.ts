import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  console.error('No se pudo iniciar SADActividades.', error);
  const root = document.querySelector('app-root');
  if (root) root.textContent = 'No se pudo iniciar la aplicación. Recarga la página para reintentar.';
});

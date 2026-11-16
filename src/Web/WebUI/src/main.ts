import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from './app/app';
import { routes } from './app/app.routes';
import { AuthService } from './app/core/auth/auth-service';
import { authInterceptor } from './app/core/auth/auth-interceptor';

bootstrapApplication(App, { providers: [
  provideZonelessChangeDetection(),
  provideRouter(routes),
  provideHttpClient(withInterceptors([authInterceptor])),
  provideAppInitializer(() => inject(AuthService).initialize()),
] }).catch(error => console.error('SADActividades bootstrap failed', error));

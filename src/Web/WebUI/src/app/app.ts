import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AUTH_STATUS, AuthService } from './core/auth/auth-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header><h1>SADActividades</h1></header>
    <main>
      @if (auth.status() === status.UNAVAILABLE) {
        <p role="alert">{{ auth.error() }}</p>
      }
      <router-outlet />
    </main>
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly status = AUTH_STATUS;
}

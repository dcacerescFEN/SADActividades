import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { AUTH_STATUS, AuthService } from './auth-service';

export const authGuard: CanActivateFn = async (_, state) => {
  const auth = inject(AuthService);
  if (auth.status() !== AUTH_STATUS.READY) return false;
  if (auth.isAuthenticated()) return true;
  await auth.login(state.url);
  return false;
};

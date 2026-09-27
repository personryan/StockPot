import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export function isGoApiRequest(requestUrl: string): boolean {
  try {
    const base = new URL(environment.apiUrl, window.location.origin);
    const target = new URL(requestUrl, window.location.origin);
    const prefix = base.pathname.replace(/\/$/, '');
    return target.origin === base.origin && !target.username && !target.password &&
      (target.pathname === prefix || target.pathname.startsWith(`${prefix}/`));
  } catch { return false; }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isGoApiRequest(request.url)) return next(request);
  const auth = inject(AuthService);
  return from(auth.accessToken()).pipe(switchMap(token => {
    // The session is the sole token source for Go API requests.
    const headers = request.headers.delete('Authorization');
    return next(request.clone({ headers: token ? headers.set('Authorization', `Bearer ${token}`) : headers }));
  }));
};

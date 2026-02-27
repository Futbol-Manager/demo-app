import { Injectable, Injector } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

/** Rutas que no necesitan token y no deben redirigir en caso de error */
const AUTH_PASSTHROUGH_URLS = [
  '/auth/login',
  '/auth/resendMailWelcome',
  '/auth/login-gloouds',
  '/auth/logout',
];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isAuthEndpoint = AUTH_PASSTHROUGH_URLS.some(path => req.url.includes(path));

    if (isAuthEndpoint) {
      return next.handle(req);
    }

    const token = localStorage.getItem('token');

    let request = req;
    if (token) {
      request = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          // Limpiar sesión local de forma defensiva antes de redirigir
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');

          const router = this.injector.get(Router);
          const currentUrl = router.url;

          // No redirigir si ya estamos en la página de login/home
          if (!currentUrl.startsWith('/login') && !currentUrl.startsWith('/home')) {
            router.navigate(['/login'], {
              queryParams: { reason: 'session_expired', returnUrl: currentUrl }
            });
          }
        }
        return throwError(() => error);
      })
    );
  }
}

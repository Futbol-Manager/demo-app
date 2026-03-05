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
import { LoginService } from '../services/login/login.service';
import { DemoService } from '../services/demo/demo.service';

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

    // En modo demo el token es ficticio; no enviamos cabecera Authorization
    // para evitar que el backend rechace la petición con 401/403.
    const demoService = this.injector.get(DemoService);
    const isDemo = demoService.isDemoMode();

    let request = req;
    if (token && !isDemo) {
      request = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // En modo demo nunca cerramos sesión por errores HTTP del backend.
        if (!isDemo && (error.status === 401 || error.status === 403)) {
          const loginService = this.injector.get(LoginService);
          loginService.cerrarSesion(true);
        }
        return throwError(() => error);
      })
    );
  }
}

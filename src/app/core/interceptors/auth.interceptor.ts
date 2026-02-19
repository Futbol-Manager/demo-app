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

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isAuthEndpoint =
      req.url.includes('/auth/login') ||
      req.url.includes('/auth/resendMailWelcome') ||
      req.url.includes('/auth/login-gloouds');

    if (isAuthEndpoint) {
      return next.handle(req);
    }

    const token = localStorage.getItem('token');

    let request = req;
    if (token) {
      request = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem('token');
          const router = this.injector.get(Router);
          router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}

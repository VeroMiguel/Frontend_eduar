import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpHeaders } from '@angular/common/http';
import { catchError, timeout } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MonitorService } from '../services/monitor.service';
import Swal from 'sweetalert2';

const excludedUrls = ['/auth/login', '/auth/verificar', '/health', '/ping'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const monitor = inject(MonitorService);
  
  const isExcludedUrl = excludedUrls.some(url => req.url.includes(url));
  
  // For excluded URLs, pass through without modification
  if (isExcludedUrl) {
    return next(req);
  }
  
  // Get token
  const token = authService?.getToken ? authService.getToken() : null;
  const tokenPresent = !!token;
  
  console.log('🔑 Auth Interceptor - URL:', req.url);
  console.log('🔑 Auth Interceptor - Method:', req.method);
  console.log('🔑 Token present:', tokenPresent);
  
  if (monitor) {
    monitor.logRequest(req, tokenPresent);
  }
  
  // Clone the request with auth header if token exists
  if (tokenPresent && token) {
    console.log('🔑 Adding Authorization header');
    
    // Build headers object
    const headers: { [key: string]: string } = {
      'Authorization': `Bearer ${token}`
    };
    
    // Only add Content-Type for non-FormData requests
    if (!(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const authReq = req.clone({
      setHeaders: headers
    });
    
    console.log('🔑 Headers set:', authReq.headers.keys());
    
    return next(authReq).pipe(
      timeout(30000),
      catchError((error: any) => {
        if (monitor) {
          monitor.logError(req, error.error, error.status);
        }
        
        console.error('❌ Error en petición:', {
          url: error.url,
          status: error.status,
          message: error.message
        });

        if (error.status === 0) {
          console.warn('⚠️ Error de red o CORS');
          return throwError(() => error);
        }
        
        if (error.status === 401 && !req.url.includes('/auth/verificar')) {
          console.warn('⚠️ Token inválido o expirado');
          Swal.fire({
            icon: 'error',
            title: 'Sesión expirada',
            text: 'Por favor, inicie sesión nuevamente',
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            authService.logout();
          });
        } else if (error.status === 403) {
          Swal.fire({
            icon: 'error',
            title: 'Acceso denegado',
            text: 'No tiene permisos para realizar esta acción',
            timer: 3000
          });
        }
        
        return throwError(() => error);
      })
    );
  } else {
    console.warn('⚠️ No token found for request:', req.url);
  }

  return next(req).pipe(
    timeout(30000),
    catchError((error: any) => {
      if (monitor) {
        monitor.logError(req, error.error, error.status);
      }
      
      console.error('❌ Error en petición:', {
        url: error.url,
        status: error.status,
        message: error.message
      });

      return throwError(() => error);
    })
  );
};
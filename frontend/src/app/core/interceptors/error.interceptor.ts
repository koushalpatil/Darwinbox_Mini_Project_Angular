import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';

/**
 * Global HTTP error interceptor.
 * Catches all HTTP errors, logs them, and shows user-friendly toasts.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let userMessage = 'An unexpected error occurred';

      if (error.status === 0) {
        userMessage = 'Unable to connect to the server. Please check your connection.';
      } else if (error.status === 400) {
        userMessage = error.error?.error || 'Invalid request. Please check your input.';
      } else if (error.status === 404) {
        userMessage = 'The requested resource was not found.';
      } else if (error.status === 413) {
        userMessage = 'File is too large. Please upload a smaller file.';
      } else if (error.status >= 500) {
        userMessage = 'Server error. Please try again later.';
      }

      console.error(`HTTP ${error.status} on ${req.method} ${req.url}`, error);

      // Only show toast for non-suppressed errors
      if (!req.headers.has('X-Suppress-Toast')) {
        toast.error(userMessage);
      }

      return throwError(() => error);
    }),
  );
};

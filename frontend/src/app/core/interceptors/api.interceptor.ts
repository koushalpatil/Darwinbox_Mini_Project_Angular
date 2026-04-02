import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Functional HTTP interceptor that adds standard headers
 * to all outgoing API requests.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // Only modify requests to our API (relative URLs or matching apiBase)
  if (req.url.startsWith('/api') || req.url.startsWith('http')) {
    // Don't override Content-Type for FormData (file uploads)
    const isFormData = req.body instanceof FormData;
    const isOctetStream = req.headers.has('Content-Type') &&
      req.headers.get('Content-Type') === 'application/octet-stream';

    if (!isFormData && !isOctetStream) {
      const cloned = req.clone({
        setHeaders: {
          Accept: 'application/json',
        },
      });
      return next(cloned);
    }
  }

  return next(req);
};

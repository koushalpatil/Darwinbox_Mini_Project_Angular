import { HttpInterceptorFn } from '@angular/common/http';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('http')) {
    const isFormData = req.body instanceof FormData;
    const isOctetStream =
      req.headers.has('Content-Type') &&
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

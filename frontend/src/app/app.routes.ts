import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/pdf-viewer/pages/pdf-viewer-page/pdf-viewer-page.component').then(
        (m) => m.PdfViewerPageComponent,
      ),
    title: 'PDF Form Studio — Upload & Fill PDF Forms',
  },
  {
    path: '**',
    redirectTo: '',
  },
];

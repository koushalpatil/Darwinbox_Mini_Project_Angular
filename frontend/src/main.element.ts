import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideHttpClient } from '@angular/common/http';

import { FilePreviewComponent } from './app/features/pdf-viewer/components/file-preview/file-preview.component';

(async () => {
  const app = await createApplication({
    providers: [provideHttpClient()],
  });

  const FilePreviewElement = createCustomElement(FilePreviewComponent, {
    injector: app.injector,
  });

  customElements.define('pdf-file-preview', FilePreviewElement);

  console.log('[pdf-file-preview] Custom element registered.');
})();

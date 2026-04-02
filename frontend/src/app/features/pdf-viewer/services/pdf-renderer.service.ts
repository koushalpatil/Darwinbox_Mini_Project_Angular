import { Injectable, inject } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfPageData, PdfField } from '../../../core/models/pdf.models';
import { LoggerService } from '../../../core/services/logger.service';

/**
 * Renders a PDF using pdf.js and maps extracted fields
 * to viewport coordinates for overlay.
 */
@Injectable({ providedIn: 'root' })
export class PdfRendererService {
  private logger = inject(LoggerService);

  constructor() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }

  /** Render all pages of a PDF and map field coordinates. */
  async renderPdf(cleanedPdfBuffer: ArrayBuffer, fields: PdfField[]): Promise<PdfPageData[]> {
    const bufferToRender = cleanedPdfBuffer.slice(0);

    const loadingTask = pdfjsLib.getDocument({ data: bufferToRender });
    const pdf = await loadingTask.promise;
    const pages: PdfPageData[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const baseScale = 1.5;
      const viewport = page.getViewport({ scale: baseScale });

      const pageFields: PdfField[] = fields
        .filter((field) => field.page === pageNum - 1)
        .map((field) => {
          const rect = [field.x, field.y, field.x + field.width, field.y + field.height];
          const viewportRect = viewport.convertToViewportRectangle(rect);

          const x = Math.min(viewportRect[0], viewportRect[2]);
          const y = Math.min(viewportRect[1], viewportRect[3]);
          const width = Math.abs(viewportRect[2] - viewportRect[0]);
          const height = Math.abs(viewportRect[3] - viewportRect[1]);

          return { ...field, x, y, width, height };
        });

      pages.push({
        pageNum,
        pdfPage: page,
        viewport,
        width: viewport.width,
        height: viewport.height,
        fields: pageFields,
      });
    }

    this.logger.info(`Rendered ${pages.length} PDF pages`);
    return pages;
  }
}

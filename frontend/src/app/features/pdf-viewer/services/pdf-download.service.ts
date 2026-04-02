import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PdfFileData } from '../../../core/models/pdf.models';
import { LoggerService } from '../../../core/services/logger.service';
import { ToastService } from '../../../shared/services/toast.service';

/**
 * Handles PDF download with filled form values and printing.
 * Extracted from FilePreviewComponent for separation of concerns.
 */
@Injectable({ providedIn: 'root' })
export class PdfDownloadService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private toast = inject(ToastService);

  /** Download a PDF with filled form values from the backend. */
  async downloadFilled(pdfFile: PdfFileData, formData: Record<string, any>): Promise<void> {
    if (!pdfFile?.arrayBuffer) return;

    try {
      const uint8 = new Uint8Array(pdfFile.arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const pdfBase64 = btoa(binary);

      // Filter out widget-specific keys, send only bare field names
      const cleanFormData: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (!key.includes('-page-')) {
          cleanFormData[key] = value;
        }
      }

      const response = await firstValueFrom(
        this.http.post('/api/pdf/fill', {
          pdfBase64,
          formData: cleanFormData,
          fileName: pdfFile.name || 'document.pdf',
        }, { responseType: 'blob' }),
      );

      const url = URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFile.name || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.toast.success('PDF downloaded successfully');
    } catch (err) {
      this.logger.error('Download with filled values failed', err);
      this.toast.error('Failed to download filled PDF');
    }
  }

  /** Open the PDF in a new window for printing. */
  printPdf(pdfFile: PdfFileData): void {
    if (!pdfFile?.arrayBuffer) return;

    const blob = new Blob([pdfFile.arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

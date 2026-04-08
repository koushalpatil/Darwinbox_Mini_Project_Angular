import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PdfFileData, PdfField } from '../../../core/models/pdf.models';
import { ToastService } from '../../../shared/services/toast.service';

@Injectable({ providedIn: 'root' })
export class PdfDownloadService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  async downloadFilled(
    arrayBuffer: ArrayBuffer,
    formData: Record<string, any>,
    fields: PdfField[],
    fileName: string,
  ): Promise<void> {
    try {
      this.toast.success('Preparing PDF…');

      const fieldValues = this.buildFieldValues(formData, fields);
      const signatureFields = this.buildSignatureFields(formData, fields);

      if (Object.keys(fieldValues).length === 0 && signatureFields.length === 0) {
        this.toast.error('No field values to fill');
        return;
      }

      const pdfBuffer = this.arrayBufferToBase64(arrayBuffer);

      const filledPdf = await firstValueFrom(
        this.http.post(
          `${environment.apiBase}/fill-pdf`,
          { pdfBuffer, fieldValues, signatureFields },
          {
            responseType: 'arraybuffer',
          },
        ),
      );

      this.triggerDownload(filledPdf, fileName);
      this.toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('Backend PDF fill failed', err);
      this.toast.error('Failed to download filled PDF');
    }
  }

  private buildFieldValues(formData: Record<string, any>, fields: PdfField[]): Record<string, any> {
    const fieldValues: Record<string, any> = {};

    for (const field of fields) {
      const bareName = field.name;

      if (bareName in fieldValues) continue;

      if (bareName in formData && formData[bareName] !== undefined && formData[bareName] !== '') {
        fieldValues[bareName] = formData[bareName];
        continue;
      }

      const compositeKey =
        field.type === 'PDFRadioGroup'
          ? `${bareName}-page-${field.page}`
          : `${bareName}-page-${field.page}-w${field.widgetIndex ?? 0}`;

      if (
        compositeKey in formData &&
        formData[compositeKey] !== undefined &&
        formData[compositeKey] !== ''
      ) {
        fieldValues[bareName] = formData[compositeKey];
      }
    }

    return fieldValues;
  }

  private buildSignatureFields(
    formData: Record<string, any>,
    fields: PdfField[],
  ): {
    name: string;
    value: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }[] {
    const result: {
      name: string;
      value: string;
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    const processed = new Set<string>();

    for (const field of fields) {
      if (field.type !== 'PDFSignature') continue;

      const bareName = field.name;
      const compositeKey = `${bareName}-page-${field.page}-w${field.widgetIndex ?? 0}`;

      const sigValue = formData[bareName] ?? formData[compositeKey];
      if (!sigValue || typeof sigValue !== 'string') continue;

      const fieldId = `${bareName}-${field.page}-${field.widgetIndex ?? 0}`;
      if (processed.has(fieldId)) continue;
      processed.add(fieldId);

      result.push({
        name: bareName,
        value: sigValue,
        page: field.page,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      });
    }

    return result;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private triggerDownload(data: ArrayBuffer, fileName: string): void {
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

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

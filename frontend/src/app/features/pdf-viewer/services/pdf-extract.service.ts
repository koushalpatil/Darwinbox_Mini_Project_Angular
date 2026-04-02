import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PdfField } from '../../../core/models/pdf.models';
import { LoggerService } from '../../../core/services/logger.service';

interface ExtractResponse {
  fields: PdfField[];
  documentJS: any;
  cleanedPdfBase64?: string;
}

/**
 * Extracts fillable fields from a PDF via the backend.
 * State is exposed via Angular signals.
 */
@Injectable({ providedIn: 'root' })
export class PdfExtractService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  private readonly _isExtracting = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _fields = signal<PdfField[]>([]);
  private readonly _cleanedPdfBuffer = signal<ArrayBuffer | null>(null);
  private readonly _documentJS = signal<any>(null);

  readonly isExtracting = this._isExtracting.asReadonly();
  readonly error = this._error.asReadonly();
  readonly fields = this._fields.asReadonly();
  readonly cleanedPdfBuffer = this._cleanedPdfBuffer.asReadonly();
  readonly documentJS = this._documentJS.asReadonly();

  /** Extract fillable fields from the PDF. Returns the fields array. */
  async extractFields(file: { arrayBuffer: ArrayBuffer }): Promise<PdfField[]> {
    try {
      this._isExtracting.set(true);
      this._error.set(null);

      const headers = new HttpHeaders({ 'Content-Type': 'application/octet-stream' });

      const data = await firstValueFrom(
        this.http.post<ExtractResponse>(`${environment.apiBase}/extract`, file.arrayBuffer, {
          headers,
        }),
      );

      this._fields.set(data.fields);
      this._documentJS.set(data.documentJS);
      this.logger.info(`Extracted ${data.fields.length} fields from PDF`);
      this.logger.debug('Document JS:', data.documentJS);

      if (data.cleanedPdfBase64) {
        const binaryStr = atob(data.cleanedPdfBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        this._cleanedPdfBuffer.set(bytes.buffer);
        this.logger.debug('Received cleaned PDF from backend');
      }

      return data.fields;
    } catch (err: any) {
      this.logger.error('Field extraction failed', err);
      this._error.set('Failed to extract fillable fields from PDF');
      return [];
    } finally {
      this._isExtracting.set(false);
    }
  }
}

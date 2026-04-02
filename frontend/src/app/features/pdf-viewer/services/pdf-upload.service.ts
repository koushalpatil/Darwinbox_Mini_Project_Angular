import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PdfFileData, UploadStage } from '../../../core/models/pdf.models';
import { LoggerService } from '../../../core/services/logger.service';

/**
 * Handles PDF file upload to S3 and retrieval.
 * State is exposed via Angular signals for automatic change detection.
 */
@Injectable({ providedIn: 'root' })
export class PdfUploadService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);

  // ── Writable signals (private) ──
  private readonly _pdfFile = signal<PdfFileData | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _isProcessing = signal(false);
  private readonly _uploadProgress = signal(0);
  private readonly _uploadStage = signal<UploadStage>(null);
  private readonly _s3Key = signal<string | null>(null);

  // ── Public readonly signals ──
  readonly pdfFile = this._pdfFile.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly uploadProgress = this._uploadProgress.asReadonly();
  readonly uploadStage = this._uploadStage.asReadonly();
  readonly s3Key = this._s3Key.asReadonly();

  /** True when the upload pipeline has completed successfully. */
  readonly isComplete = computed(() => this._uploadStage() === 'done' && this._pdfFile() !== null);

  /** Update the upload progress (0–100). */
  setUploadProgress(value: number): void {
    this._uploadProgress.set(value);
  }

  /** Update the current upload stage. */
  setUploadStage(stage: UploadStage): void {
    this._uploadStage.set(stage);
  }

  /** Clear any existing error. */
  clearError(): void {
    this._error.set(null);
  }

  /** Validate a file before upload. Returns an array of error messages, empty if valid. */
  validateFile(file: File, maxSizeMB: number): string[] {
    if (!file) return ['No file selected'];
    if (file.type !== 'application/pdf') return ['Only PDF files are allowed'];
    if (!file.name.toLowerCase().endsWith('.pdf')) return ['File must have .pdf extension'];
    if (file.size > maxSizeMB * 1024 * 1024) return [`Maximum file size is ${maxSizeMB}MB`];
    return [];
  }

  /** Upload a file to S3 and retrieve it for rendering. */
  async processFile(file: File): Promise<void> {
    this._isProcessing.set(true);
    this._error.set(null);
    this._uploadProgress.set(0);
    this._uploadStage.set('uploading_to_s3');

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      this._uploadProgress.set(10);

      const uploadData = await firstValueFrom(
        this.http.post<{ file: any }>(`${environment.apiBase}/upload`, formData),
      );

      this._uploadProgress.set(40);
      this.logger.info('PDF uploaded to S3', uploadData.file);

      const { key, name, size, type, uploadedAt, presignedUrl } = uploadData.file;
      this._s3Key.set(key);

      this._uploadStage.set('retrieving_from_s3');
      this._uploadProgress.set(50);

      const pdfRes = await fetch(presignedUrl);
      if (!pdfRes.ok) {
        throw new Error('Failed to download PDF from S3 for rendering');
      }

      this._uploadProgress.set(65);
      const arrayBuffer = await pdfRes.arrayBuffer();
      this._uploadProgress.set(75);

      const fileData: PdfFileData = {
        name,
        size,
        type,
        arrayBuffer,
        uploadedAt,
        s3Key: key,
      };

      this.logger.debug('PDF loaded into memory for rendering', { name, size });
      this._isProcessing.set(false);
      this._pdfFile.set(fileData);
    } catch (err: any) {
      this.logger.error('Upload/fetch error', err);
      const message =
        err?.error?.error || err?.message || 'An unexpected error occurred during upload';
      this._error.set(message);
      this._uploadStage.set(null);
      this._isProcessing.set(false);
      this._uploadProgress.set(0);
    }
  }

  /** Validate and process a file. */
  handleFile(file: File, maxSizeMB: number): void {
    const errors = this.validateFile(file, maxSizeMB);
    if (errors.length) {
      this._error.set(errors.join('. '));
      return;
    }
    this.processFile(file);
  }
}

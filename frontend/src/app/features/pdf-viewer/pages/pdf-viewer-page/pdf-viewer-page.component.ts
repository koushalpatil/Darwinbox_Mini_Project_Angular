import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  effect,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { PdfUploadService } from '../../services/pdf-upload.service';
import { PdfExtractService } from '../../services/pdf-extract.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { UploadZoneComponent } from '../../components/upload-zone/upload-zone.component';
import { FilePreviewComponent } from '../../components/file-preview/file-preview.component';

/**
 * Smart / container component that orchestrates the PDF upload → extract → preview pipeline.
 * All child components are presentational.
 */
@Component({
  selector: 'app-pdf-viewer-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UploadZoneComponent, FilePreviewComponent],
  templateUrl: './pdf-viewer-page.component.html',
  styleUrl: './pdf-viewer-page.component.css',
})
export class PdfViewerPageComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private uploadService = inject(PdfUploadService);
  private extractService = inject(PdfExtractService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  private extractionStarted = false;

  readonly maxSizeMB = environment.maxUploadSizeMB;

  // Expose service signals to the template
  readonly pdfFile = this.uploadService.pdfFile;
  readonly uploadProgress = this.uploadService.uploadProgress;
  readonly currentStage = this.uploadService.uploadStage;
  readonly error = this.uploadService.error;
  readonly fields = this.extractService.fields;
  readonly cleanedPdfBuffer = this.extractService.cleanedPdfBuffer;

  /** The buffer to use for rendering — prefer cleaned, fall back to original. */
  readonly renderBuffer = computed(
    () => this.cleanedPdfBuffer() ?? this.pdfFile()?.arrayBuffer ?? null,
  );

  /** True when upload + extraction is fully complete and preview can render. */
  readonly pipelineComplete = computed(() => {
    return !!(this.pdfFile() && this.renderBuffer() && this.currentStage() === 'done');
  });

  constructor() {
    // React to errors
    effect(() => {
      const err = this.error();
      if (err) {
        this.toastService.error(err);
      }
    });

    // React to successful upload — start extraction
    effect(() => {
      const file = this.pdfFile();
      if (file && !this.extractionStarted) {
        this.startExtraction(file);
      }
    });

    // Hide app header when PDF preview is active so the PDF toolbar is fully visible
    effect(() => {
      if (this.pipelineComplete()) {
        document.body.classList.add('pdf-viewer-active');
      } else {
        document.body.classList.remove('pdf-viewer-active');
      }
    });

    // Clean up the body class when component is destroyed
    this.destroyRef.onDestroy(() => {
      document.body.classList.remove('pdf-viewer-active');
    });
  }

  private async startExtraction(file: { arrayBuffer: ArrayBuffer }): Promise<void> {
    this.extractionStarted = true;
    this.uploadService.setUploadStage('extracting_fields');
    this.uploadService.setUploadProgress(90);

    try {
      const minDisplayTime = new Promise((r) => setTimeout(r, 600));
      await Promise.all([this.extractService.extractFields(file), minDisplayTime]);
    } catch (error) {
      console.error('Error extracting fields', error);
    }

    this.uploadService.setUploadProgress(100);
    this.uploadService.setUploadStage('completed');

    await new Promise((r) => setTimeout(r, 500));
    this.uploadService.setUploadStage('done');
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadService.handleFile(file, this.maxSizeMB);
    }
  }

  onFileDrop(file: File): void {
    this.uploadService.handleFile(file, this.maxSizeMB);
  }

  openFilePicker(): void {
    this.fileInputRef?.nativeElement?.click();
  }
}

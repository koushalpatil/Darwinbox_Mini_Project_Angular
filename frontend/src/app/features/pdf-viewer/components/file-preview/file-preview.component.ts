import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  HostListener,
  inject,
} from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { PdfRendererService } from '../../services/pdf-renderer.service';
import { PdfDownloadService } from '../../services/pdf-download.service';

import { PdfPageComponent } from '../pdf-page/pdf-page.component';
import { PdfToolbarComponent, TOOLBAR_HEIGHT } from '../pdf-toolbar/pdf-toolbar.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import {
  PdfFileData,
  PdfField,
  PdfPageData,
  FieldOverrides,
} from '../../../../core/models/pdf.models';

const ZOOM_STEP = 10;
const ZOOM_MIN = 25;
const ZOOM_MAX = 300;
const ZOOM_DEFAULT = 100;

@Component({
  selector: 'app-file-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PdfPageComponent, PdfToolbarComponent, LoadingSpinnerComponent],
  templateUrl: './file-preview.component.html',
  styleUrl: './file-preview.component.css',
})
export class FilePreviewComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() pdfFile: PdfFileData | null = null;
  @Input() fields: PdfField[] = [];
  @Input() cleanedPdfBuffer: ArrayBuffer | null = null;

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  pdfPages: PdfPageData[] = [];
  loading = true;
  error: any = null;
  pdfForm = new FormGroup<Record<string, FormControl>>({});
  zoom = ZOOM_DEFAULT;
  fieldOverrides: FieldOverrides = {};
  containerWidth = 0;
  toolbarHeight = TOOLBAR_HEIGHT;

  private resizeObserver: ResizeObserver | null = null;

  private pdfRendererService = inject(PdfRendererService);
  private pdfDownloadService = inject(PdfDownloadService);

  private cdr = inject(ChangeDetectorRef);

  get zoomScale(): number {
    return this.zoom / 100;
  }

  get formData(): Record<string, any> {
    return this.pdfForm.getRawValue();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      this.handleZoomIn();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      this.handleZoomOut();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      this.handleResetZoom();
    }
  }

  ngOnInit(): void {
    this.initFormGroup();
    this.setupFieldOverrides();
    this.loadPdf();
  }

  ngAfterViewInit(): void {
    if (this.containerRef?.nativeElement) {
      this.containerWidth = this.containerRef.nativeElement.clientWidth;
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    delete (window as any).pdfForm;
  }

  private initFormGroup(): void {
    if (!this.fields?.length) return;

    const controls: Record<string, FormControl> = {};

    this.fields.forEach((field) => {
      const initialValue = field.value !== undefined && field.value !== null ? field.value : '';

      if (field.type === 'PDFRadioGroup') {
        const specificKey = `${field.name}-page-${field.page}`;
        if (!controls[specificKey]) {
          controls[specificKey] = new FormControl(initialValue);
        }
      } else {
        const widgetIdx = field.widgetIndex !== undefined ? field.widgetIndex : 0;
        const specificKey = `${field.name}-page-${field.page}-w${widgetIdx}`;
        if (!controls[specificKey]) {
          controls[specificKey] = new FormControl(initialValue);
        }
      }

      if (!controls[field.name]) {
        controls[field.name] = new FormControl(initialValue);
      }
    });

    this.pdfForm = new FormGroup(controls);

    this.pdfForm.valueChanges.subscribe((values) => {
      for (const key of Object.keys(values)) {
        const bareMatch = key.match(/^(.+?)-page-/);
        if (bareMatch) {
          const bareName = bareMatch[1];
          const bareControl = this.pdfForm.get(bareName);
          if (bareControl && bareControl.value !== values[key]) {
            bareControl.setValue(values[key], { emitEvent: false });
          }
        }
      }
    });
  }

  private setupFieldOverrides(): void {
    const setFieldReadOnly = (fieldName: string, value: boolean) => {
      this.fieldOverrides = {
        ...this.fieldOverrides,
        [fieldName]: { ...this.fieldOverrides[fieldName], readOnly: !!value },
      };
    };

    const setFieldRequired = (fieldName: string, value: boolean) => {
      this.fieldOverrides = {
        ...this.fieldOverrides,
        [fieldName]: { ...this.fieldOverrides[fieldName], required: !!value },
      };
    };

    (window as any).pdfForm = {
      setFieldReadOnly,
      setFieldRequired,
      getFieldOverrides: () => this.fieldOverrides,
    };
  }

  private setupResizeObserver(): void {
    if (!this.containerRef?.nativeElement) return;
    this.containerWidth = this.containerRef.nativeElement.clientWidth;
    this.cdr.markForCheck();
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.containerWidth = entry.contentRect.width;
        this.cdr.markForCheck();
      }
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  async loadPdf(): Promise<void> {
    if (!this.pdfFile?.arrayBuffer || !this.cleanedPdfBuffer) return;

    try {
      this.loading = true;
      this.error = null;
      this.cdr.markForCheck();

      this.pdfPages = await this.pdfRendererService.renderPdf(this.cleanedPdfBuffer, this.fields);
      this.loading = false;
      this.cdr.detectChanges();
      setTimeout(() => this.setupResizeObserver());
    } catch (err) {
      console.error('PDF Render Error', err);
      this.error = err;
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  handleSubmit(): void {
    console.log('Form submitted', this.pdfForm.value);
  }

  handleZoomIn(): void {
    this.zoom = Math.min(this.zoom + ZOOM_STEP, ZOOM_MAX);
  }

  handleZoomOut(): void {
    this.zoom = Math.max(this.zoom - ZOOM_STEP, ZOOM_MIN);
  }

  handleResetZoom(): void {
    this.zoom = ZOOM_DEFAULT;
  }

  async handleDownload(): Promise<void> {
    if (this.pdfFile?.arrayBuffer) {
      await this.pdfDownloadService.downloadFilled(
        this.pdfFile.arrayBuffer,
        this.pdfForm.getRawValue(),
        this.fields,
        this.pdfFile.name || 'document.pdf',
      );
    }
  }

  handlePrint(): void {
    if (this.pdfFile) {
      this.pdfDownloadService.printPdf(this.pdfFile);
    }
  }
}

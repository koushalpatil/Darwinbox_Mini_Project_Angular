import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { TextLayer } from 'pdfjs-dist';
import { FormFieldComponent } from '../form-field/form-field.component';
import { PdfPageData, PdfField, FieldOverrides } from '../../../../core/models/pdf.models';

@Component({
  selector: 'app-pdf-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent],
  templateUrl: './pdf-page.component.html',
  styleUrl: './pdf-page.component.css',
})
export class PdfPageComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() page!: PdfPageData;
  @Input() containerWidth = 0;
  @Input() pdfForm!: FormGroup;
  @Input() allDocFields: PdfField[] = [];
  @Input() fieldOverrides: FieldOverrides = {};
  @Output() submitEvent = new EventEmitter<void>();

  @ViewChild('pdfCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('textLayer') textLayerRef!: ElementRef<HTMLDivElement>;

  private renderTask: any = null;

  get scaleFactor(): number {
    return this.containerWidth > 0 ? this.containerWidth / this.page.width : 1;
  }

  ngAfterViewInit(): void {
    this.renderPage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['page'] && !changes['page'].firstChange) ||
      (changes['containerWidth'] && !changes['containerWidth'].firstChange)
    ) {
      setTimeout(() => this.renderPage());
    }
  }

  ngOnDestroy(): void {
    if (this.renderTask) {
      this.renderTask.cancel();
    }
  }

  private async renderPage(): Promise<void> {
    if (!this.page?.pdfPage || !this.canvasRef?.nativeElement || !this.textLayerRef?.nativeElement)
      return;

    const pdfPage = this.page.pdfPage;
    const viewport = this.page.viewport;

    if (this.renderTask) {
      this.renderTask.cancel();
    }

    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d')!;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    this.textLayerRef.nativeElement.innerHTML = '';

    try {
      this.renderTask = pdfPage.render({
        canvasContext: context,
        viewport: viewport,
      });
      await this.renderTask.promise;
      this.renderTask = null;

      const textContent = await pdfPage.getTextContent();

      if (this.textLayerRef.nativeElement) {
        const textLayer = new TextLayer({
          textContentSource: textContent,
          container: this.textLayerRef.nativeElement,
          viewport: viewport,
        });
        await textLayer.render();
      }
    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering PDF page', error);
      }
    }
  }

  getFieldControl(field: PdfField, idx: number): FormControl {
    const wIdx = field.widgetIndex !== undefined ? field.widgetIndex : idx;
    const specificKey =
      field.type === 'PDFRadioGroup'
        ? `${field.name}-page-${field.page}`
        : `${field.name}-page-${field.page}-w${wIdx}`;
    return (this.pdfForm.get(specificKey) as FormControl) || new FormControl('');
  }
}

import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { PdfFileData } from '../../../core/models/pdf.models';
import { ToastService } from '../../../shared/services/toast.service';

@Injectable({ providedIn: 'root' })
export class PdfDownloadService {
  private toast = inject(ToastService);

  async downloadFilled(fileName: string): Promise<void> {
    const pageElements = document.querySelectorAll('app-pdf-page');
    if (!pageElements.length) {
      this.toast.error('No PDF pages found to download');
      return;
    }

    try {
      this.toast.success('Preparing PDF…');

      const compositeCanvases: HTMLCanvasElement[] = [];

      for (const pageEl of Array.from(pageElements)) {
        const sourceCanvas = pageEl.querySelector('.pdf-canvas') as HTMLCanvasElement;
        if (!sourceCanvas) continue;

        const composite = document.createElement('canvas');
        composite.width = sourceCanvas.width;
        composite.height = sourceCanvas.height;
        const ctx = composite.getContext('2d')!;

        ctx.drawImage(sourceCanvas, 0, 0);

        this.drawFieldValuesFromDOM(ctx, pageEl as HTMLElement);

        compositeCanvases.push(composite);
      }

      if (compositeCanvases.length === 0) {
        this.toast.error('Could not capture PDF pages');
        return;
      }

      this.buildAndDownloadPdf(compositeCanvases, fileName);
      this.toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('Canvas-based PDF download failed', err);
      this.toast.error('Failed to download filled PDF');
    }
  }

  private drawFieldValuesFromDOM(ctx: CanvasRenderingContext2D, pageEl: HTMLElement): void {
    const fieldWrappers = pageEl.querySelectorAll('.form-field');

    for (const wrapper of Array.from(fieldWrappers)) {
      const el = wrapper as HTMLElement;

      const x = parseFloat(el.style.left) || 0;
      const y = parseFloat(el.style.top) || 0;
      const w = parseFloat(el.style.width) || 0;
      const h = parseFloat(el.style.height) || 0;

      const textInput = el.querySelector(
        'input[type="text"], input[type="date"]',
      ) as HTMLInputElement;
      if (textInput && textInput.value) {
        this.drawTextValue(ctx, textInput, x, y, w, h);
        continue;
      }

      const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkbox && checkbox.checked) {
        this.drawCheckmark(ctx, x, y, w, h);
        continue;
      }

      const radio = el.querySelector('input[type="radio"]') as HTMLInputElement;
      if (radio && radio.checked) {
        this.drawRadioFill(ctx, x, y, w, h);
        continue;
      }

      const select = el.querySelector('select') as HTMLSelectElement;
      if (select && select.value) {
        this.drawSelectValue(ctx, select, x, y, w, h);
        continue;
      }

      const sigCanvas = el.querySelector('canvas') as HTMLCanvasElement;
      if (sigCanvas) {
        this.drawSignature(ctx, sigCanvas, x, y, w, h);
        continue;
      }
    }
  }

  private drawTextValue(
    ctx: CanvasRenderingContext2D,
    input: HTMLInputElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const computed = window.getComputedStyle(input);
    const fontSize = parseFloat(computed.fontSize) || 14;
    const fontFamily = computed.fontFamily || 'sans-serif';
    const fontWeight = computed.fontWeight || 'normal';
    const color = computed.color || '#000000';

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const paddingLeft = parseFloat(computed.paddingLeft) || 3;
    ctx.fillText(input.value, x + paddingLeft, y + h / 2);

    ctx.restore();
  }

  private drawCheckmark(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.5);
    ctx.lineTo(x + w * 0.4, y + h * 0.75);
    ctx.lineTo(x + w * 0.8, y + h * 0.25);
    ctx.stroke();

    ctx.restore();
  }

  private drawRadioFill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    ctx.save();
    ctx.fillStyle = '#000000';
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const radius = Math.min(w, h) * 0.3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSelectValue(
    ctx: CanvasRenderingContext2D,
    select: HTMLSelectElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const displayText = select.options[select.selectedIndex]?.text || select.value;
    if (!displayText || displayText === 'Select...') return;

    const computed = window.getComputedStyle(select);
    const fontSize = parseFloat(computed.fontSize) || 12;
    const fontFamily = computed.fontFamily || 'sans-serif';
    const color = computed.color || '#000000';

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const paddingLeft = parseFloat(computed.paddingLeft) || 4;
    ctx.fillText(displayText, x + paddingLeft, y + h / 2);
    ctx.restore();
  }

  private drawSignature(
    ctx: CanvasRenderingContext2D,
    sigCanvas: HTMLCanvasElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    try {
      ctx.drawImage(sigCanvas, x, y, w, h);
    } catch {}
  }

  private buildAndDownloadPdf(canvases: HTMLCanvasElement[], fileName: string): void {
    if (canvases.length === 0) return;

    const firstCanvas = canvases[0];
    const pxToMm = (px: number) => (px * 25.4) / 72 / 1.5;

    const pageWidthMm = pxToMm(firstCanvas.width);
    const pageHeightMm = pxToMm(firstCanvas.height);

    const pdf = new jsPDF({
      orientation: pageWidthMm > pageHeightMm ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pageWidthMm, pageHeightMm],
    });

    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const wMm = pxToMm(canvas.width);
      const hMm = pxToMm(canvas.height);

      if (i > 0) {
        pdf.addPage([wMm, hMm], wMm > hMm ? 'landscape' : 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, wMm, hMm);
    }

    pdf.save(fileName || 'document.pdf');
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

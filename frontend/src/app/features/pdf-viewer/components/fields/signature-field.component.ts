import {
  Component,
  Input,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  forwardRef,
  inject,
  Renderer2,
  OnDestroy,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
@Component({
  selector: 'app-signature-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SignatureFieldComponent),
      multi: true,
    },
  ],
  template: `
    @if (readOnly && value) {
      @if (isImageSrc) {
        <img [src]="value" alt="Signature" class="signature-img" />
      } @else {
        <div class="signature-signed">✓ Signed</div>
      }
    }

    @if (readOnly && !value) {
      <div class="signature-readonly" title="This field is read-only">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    }

    @if (!readOnly) {
      <div class="signature-wrapper">
        <div class="signature-trigger" (click)="openModal()" title="Click to sign">
          @if (value) {
            @if (isImageSrc) {
              <img [src]="value" alt="Signature" class="signature-preview" />
            } @else {
              <div class="signature-signed-inline">✓ Signed</div>
            }
          } @else {
            <div class="signature-placeholder">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              <span>Click to sign</span>
            </div>
          }
        </div>
        @if (value) {
          <button
            class="signature-clear-btn"
            (click)="clearSignature($event)"
            title="Remove signature"
          >
            &#x2715;
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .signature-trigger {
        width: 100%;
        height: 100%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px dashed rgba(100, 120, 255, 0.5);
        border-radius: 4px;
        background: rgba(100, 120, 255, 0.04);
        transition:
          border-color 0.2s,
          background 0.2s;
        box-sizing: border-box;
      }

      .signature-trigger:hover {
        border-color: rgba(100, 120, 255, 0.8);
        background: rgba(100, 120, 255, 0.1);
      }

      .signature-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: #6478ff;
        font-size: 11px;
        font-weight: 500;
        opacity: 0.8;
      }

      .signature-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .signature-preview {
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 2px;
      }

      .signature-signed {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #22c55e;
        font-size: 13px;
        font-weight: 600;
      }

      .signature-signed-inline {
        color: #22c55e;
        font-size: 12px;
        font-weight: 600;
      }

      .signature-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
      }

      .signature-readonly {
        position: absolute;
        inset: 0;
        background: rgba(240, 240, 240, 0.4);
        cursor: not-allowed;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
      }

      .signature-clear-btn {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: none;
        background: rgba(220, 38, 38, 0.85);
        color: #fff;
        font-size: 10px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        z-index: 10;
        transition: background 0.15s;
      }

      .signature-clear-btn:hover {
        background: rgba(220, 38, 38, 1);
      }
    `,
  ],
})
export class SignatureFieldComponent implements ControlValueAccessor, OnDestroy {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() readOnly = false;
  @Input() required = false;

  value: any;
  showModal = false;

  private http = inject(HttpClient);

  get isImageSrc(): boolean {
    if (!this.value || typeof this.value !== 'string') return false;
    return (
      this.value.startsWith('data:image') ||
      this.value.startsWith('blob:') ||
      this.value.startsWith('http://') ||
      this.value.startsWith('https://')
    );
  }

  private cdr = inject(ChangeDetectorRef);
  private renderer = inject(Renderer2);
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};
  private modalOverlay: HTMLElement | null = null;
  private boundBackdropClick = this.handleBackdropClick.bind(this);

  writeValue(val: any): void {
    this.value = val;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (val: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  ngOnDestroy(): void {
    this.removeModalFromBody();
  }

  openModal(): void {
    this.showModal = true;
    this.cdr.markForCheck();
    this.createModalInBody();
  }

  closeModal(): void {
    this.showModal = false;
    this.removeModalFromBody();
    this.cdr.markForCheck();
  }

  clearSignature(event: Event): void {
    event.stopPropagation();
    this.value = null;
    this.onChange(null);
    this.onTouched();
    this.cdr.markForCheck();
  }

  async onSignatureChange(event: any): Promise<void> {
    const raw = event?.detail ?? event;

    console.log('signature raw event:', raw);

    if (Array.isArray(raw) && raw.length > 0 && raw[0]?.file instanceof File) {
      const file: File = raw[0].file;
      console.log('Signature file upload detected:', file.name, file.type, file.size);

      try {
        const dataUrl = await this.readFileAsDataUrl(file);
        console.log('File read as data URL, length:', dataUrl.length);

        this.value = dataUrl;
        this.onChange(this.value);
        this.onTouched();
        this.closeModal();
        this.cdr.markForCheck();
      } catch (err) {
        console.error('Failed to read signature file:', err);
      }
      return;
    }

    const s3Key = raw?.key ?? null;

    let signatureValue: any = raw;
    if (raw && typeof raw === 'object') {
      signatureValue = raw.value ?? raw.data ?? raw.base64 ?? raw.image ?? raw;
    }

    if (
      typeof signatureValue === 'string' &&
      signatureValue.length > 20 &&
      !signatureValue.startsWith('data:') &&
      !signatureValue.startsWith('http') &&
      !signatureValue.startsWith('blob:')
    ) {
      signatureValue = `data:image/png;base64,${signatureValue}`;
    }

    console.log('signature value: ', signatureValue);
    console.log('s3Key:', s3Key);

    let preSignedUrl: string | null = null;

    if (s3Key) {
      try {
        const csrfResponse: any = await lastValueFrom(this.http.get('/Commondata/getCSRF'));
        const csrfToken = csrfResponse?.data ?? '';

        const response: any = await lastValueFrom(
          this.http.post('/Commondata/getSignedUrlWithExpiry', {
            key: s3Key,
            is_download: true,
            pbqBeYWPUn: csrfToken,
          }),
        );

        console.log('API response:', response);

        preSignedUrl =
          response?.url ??
          response?.presignedUrl ??
          response?.signedUrl ??
          response?.signed_url ??
          null;

        console.log('PreSigned URL:', preSignedUrl);
      } catch (err) {
        console.error('Error fetching preSignedUrl:', err);
      }
    }

    this.value = preSignedUrl ?? signatureValue;
    this.onChange(this.value);
    this.onTouched();
    this.closeModal();
    this.cdr.markForCheck();
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private createModalInBody(): void {
    this.removeModalFromBody();

    const backdrop = this.renderer.createElement('div');
    this.renderer.setStyle(backdrop, 'position', 'fixed');
    this.renderer.setStyle(backdrop, 'inset', '0');
    this.renderer.setStyle(backdrop, 'z-index', '10000');
    this.renderer.setStyle(backdrop, 'background', 'rgba(0,0,0,0.55)');
    this.renderer.setStyle(backdrop, 'display', 'flex');
    this.renderer.setStyle(backdrop, 'align-items', 'center');
    this.renderer.setStyle(backdrop, 'justify-content', 'center');
    this.renderer.setStyle(backdrop, 'animation', 'sig-fadeIn 0.15s ease-out');

    const modal = this.renderer.createElement('div');
    modal.innerHTML = `
      <style>
        @keyframes sig-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sig-scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      </style>
    `;
    this.renderer.setStyle(modal, 'background', '#fff');
    this.renderer.setStyle(modal, 'border-radius', '12px');
    this.renderer.setStyle(modal, 'box-shadow', '0 20px 60px rgba(0,0,0,0.3)');
    this.renderer.setStyle(modal, 'width', '90%');
    this.renderer.setStyle(modal, 'max-width', '560px');
    this.renderer.setStyle(modal, 'overflow', 'hidden');
    this.renderer.setStyle(modal, 'animation', 'sig-scaleIn 0.2s ease-out');

    const header = this.renderer.createElement('div');
    this.renderer.setStyle(header, 'display', 'flex');
    this.renderer.setStyle(header, 'align-items', 'center');
    this.renderer.setStyle(header, 'justify-content', 'space-between');
    this.renderer.setStyle(header, 'padding', '16px 20px');
    this.renderer.setStyle(header, 'border-bottom', '1px solid #eee');

    const title = this.renderer.createElement('span');
    this.renderer.setStyle(title, 'font-size', '16px');
    this.renderer.setStyle(title, 'font-weight', '600');
    this.renderer.setStyle(title, 'color', '#222');
    title.textContent = 'Add Signature';

    const closeBtn = this.renderer.createElement('button');
    this.renderer.setStyle(closeBtn, 'background', 'none');
    this.renderer.setStyle(closeBtn, 'border', 'none');
    this.renderer.setStyle(closeBtn, 'font-size', '22px');
    this.renderer.setStyle(closeBtn, 'cursor', 'pointer');
    this.renderer.setStyle(closeBtn, 'color', '#888');
    this.renderer.setStyle(closeBtn, 'padding', '4px 8px');
    this.renderer.setStyle(closeBtn, 'border-radius', '6px');
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.closeModal());

    this.renderer.appendChild(header, title);
    this.renderer.appendChild(header, closeBtn);

    const body = this.renderer.createElement('div');
    this.renderer.setStyle(body, 'padding', '20px');

    const signatureEl = document.createElement('dbx-ds-signature') as any;
    signatureEl.setAttribute('isS3Upload', 'true');
    signatureEl.setAttribute('drawModePlaceholder', 'Sign here by drawing');
    signatureEl.setAttribute('typeModePlaceholder', 'Type your signature');
    signatureEl.setAttribute('canShowErrors', 'true');
    signatureEl.setAttribute('canShowErrorLog', 'false');
    if (this.value) {
      signatureEl.setAttribute('value', this.value);
    }
    signatureEl.addEventListener('commonValueChange', (e: any) => {
      this.onSignatureChange(e);
    });

    this.renderer.appendChild(body, signatureEl);
    this.renderer.appendChild(modal, header);
    this.renderer.appendChild(modal, body);
    this.renderer.appendChild(backdrop, modal);

    modal.addEventListener('click', (e: Event) => e.stopPropagation());
    backdrop.addEventListener('click', this.boundBackdropClick);

    this.renderer.appendChild(document.body, backdrop);
    this.modalOverlay = backdrop;
  }

  private handleBackdropClick(): void {
    this.closeModal();
  }

  private removeModalFromBody(): void {
    if (this.modalOverlay && this.modalOverlay.parentNode) {
      this.modalOverlay.parentNode.removeChild(this.modalOverlay);
    }
    this.modalOverlay = null;
  }
}

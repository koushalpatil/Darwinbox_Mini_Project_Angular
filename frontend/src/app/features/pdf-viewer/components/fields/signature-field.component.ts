import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-signature-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SignatureFieldComponent),
      multi: true,
    },
  ],
  template: `
    @if (value) {
      <img [src]="value" alt="Signature" class="signature-img" />
    }

    @if (readOnly) {
      <div class="signature-readonly" title="This field is read-only">
        @if (!value) {
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
        }
      </div>
    } @else {
      <input
        [id]="'signature-' + elementId"
        type="file"
        accept="image/*"
        [required]="required && !value"
        (change)="onFileChange($event)"
        [title]="required ? 'This field is required' : ''"
        class="signature-input"
      />
    }
  `,
  styles: [
    `
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

      .signature-input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
    `,
  ],
})
export class SignatureFieldComponent implements ControlValueAccessor {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() readOnly = false;
  @Input() required = false;

  value: any;

  private cdr = inject(ChangeDetectorRef);
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

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

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.value = reader.result as string;
      this.onChange(this.value);
      this.onTouched();
    };
    reader.readAsDataURL(file);
  }
}

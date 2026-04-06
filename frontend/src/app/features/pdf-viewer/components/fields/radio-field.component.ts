import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PdfField } from '../../../../core/models/pdf.models';

@Component({
  selector: 'app-radio-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioFieldComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="radio-wrap"
      [title]="readOnly ? 'This field is read-only' : required ? 'This field is required' : ''"
    >
      <input
        [id]="'radio-' + elementId + '-' + (field?.buttonValue || 'default')"
        type="radio"
        [name]="field?.name"
        [value]="radioValue"
        [checked]="value === radioValue"
        (change)="onSelect()"
        [disabled]="readOnly"
        [required]="required"
        class="radio-input"
        [class.radio-input--disabled]="readOnly"
        [class.radio-input--required]="required"
      />
    </div>
  `,
  styles: [
    `
      .radio-wrap {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .radio-input {
        width: 16px;
        height: 16px;
        cursor: pointer;
        margin: 0;
        accent-color: var(--color-primary);
      }

      .radio-input--disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .radio-input--required {
        accent-color: var(--color-error);
      }
    `,
  ],
})
export class RadioFieldComponent implements ControlValueAccessor {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() field: PdfField | null = null;
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

  get radioValue(): string {
    return this.field?.buttonValue || this.fieldKey;
  }

  onSelect(): void {
    if (!this.readOnly) {
      this.value = this.radioValue;
      this.onChange(this.value);
      this.onTouched();
    }
  }
}

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
  selector: 'app-dropdown-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownFieldComponent),
      multi: true,
    },
  ],
  template: `
    <select
      [id]="'select-' + elementId"
      [value]="value || ''"
      (change)="onSelect($event)"
      [disabled]="readOnly"
      [required]="required"
      [title]="readOnly ? 'This field is read-only' : required ? 'This field is required' : ''"
      class="dropdown-select"
      [class.dropdown-select--readonly]="readOnly"
    >
      <option value="">Select...</option>
      @for (opt of field?.options || []; track $index) {
        <option [value]="opt.exportValue || opt.displayValue">
          {{ opt.displayValue }}
        </option>
      }
    </select>
  `,
  styles: [
    `
      .dropdown-select {
        width: 100%;
        height: 100%;
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: white;
        outline: none;
        padding: 2px 4px;
        margin: 0;
        cursor: pointer;
        font-size: 12px;
        box-sizing: border-box;
        border-radius: 3px;
        color: #000;
        transition:
          border var(--transition-fast),
          box-shadow var(--transition-fast);
      }

      .dropdown-select--readonly {
        background: rgba(240, 240, 240, 0.6);
        cursor: not-allowed;
        color: #666;
        opacity: 0.8;
      }

      .dropdown-select:focus:not(.dropdown-select--readonly) {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
      }

      .dropdown-select:focus:not(.dropdown-select--readonly)[required] {
        border-color: var(--color-error);
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
      }
    `,
  ],
})
export class DropdownFieldComponent implements ControlValueAccessor {
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

  onSelect(e: Event): void {
    if (!this.readOnly) {
      this.value = (e.target as HTMLSelectElement).value;
      this.onChange(this.value);
      this.onTouched();
    }
  }
}

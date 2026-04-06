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
  selector: 'app-checkbox-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxFieldComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="checkbox-wrap"
      [title]="readOnly ? 'This field is read-only' : required ? 'This field is required' : ''"
    >
      <input
        [id]="'checkbox-' + elementId"
        type="checkbox"
        [checked]="value === 'Yes' || value === true"
        (change)="onToggle($event)"
        [disabled]="readOnly"
        [required]="required"
        class="checkbox-input"
        [class.checkbox-input--disabled]="readOnly"
        [class.checkbox-input--required]="required"
      />
    </div>
  `,
  styles: [
    `
      .checkbox-wrap {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .checkbox-input {
        width: 16px;
        height: 16px;
        cursor: pointer;
        margin: 0;
        accent-color: var(--color-primary);
      }

      .checkbox-input--disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .checkbox-input--required {
        accent-color: var(--color-error);
      }
    `,
  ],
})
export class CheckboxFieldComponent implements ControlValueAccessor {
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

  onToggle(e: Event): void {
    if (!this.readOnly) {
      const checked = (e.target as HTMLInputElement).checked;
      this.value = checked ? 'Yes' : 'Off';
      this.onChange(this.value);
      this.onTouched();
    }
  }
}

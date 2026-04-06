import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const ALLOWED_NUMBER_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

@Component({
  selector: 'app-text-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextFieldComponent),
      multi: true,
    },
  ],
  template: `
    <input
      [id]="'input-' + subType + '-' + elementId"
      type="text"
      [attr.inputmode]="subType === 'number' ? 'decimal' : 'text'"
      [value]="value || ''"
      (input)="onInputChange($event)"
      (keydown)="onKeyDown($event)"
      [readOnly]="isFieldReadOnly"
      [required]="required"
      [attr.maxlength]="maxLength || null"
      [attr.step]="subType === 'number' ? 'any' : null"
      [title]="
        isFieldReadOnly ? 'This field is read-only' : required ? 'This field is required' : ''
      "
      class="text-input"
      [class.text-input--readonly]="isFieldReadOnly"
      (focus)="onFocus($event)"
      (blur)="onBlur($event)"
    />
  `,
  styles: [
    `
      .text-input {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        outline: none;
        padding: 0 3px;
        margin: 0;
        font-size: 14px;
        font-family: inherit;
        color: #000;
        cursor: text;
        box-sizing: border-box;
        transition:
          background var(--transition-fast),
          box-shadow var(--transition-fast);
        border-radius: 2px;
      }

      .text-input--readonly {
        background: rgba(240, 240, 240, 0.6);
        color: #666;
        cursor: not-allowed;
      }

      .text-input:focus:not(.text-input--readonly) {
        background: rgba(99, 102, 241, 0.06);
        box-shadow: inset 0 0 0 1.5px rgba(99, 102, 241, 0.5);
      }

      .text-input:focus:not(.text-input--readonly)[required] {
        box-shadow: inset 0 0 0 1.5px rgba(239, 68, 68, 0.5);
      }
    `,
  ],
})
export class TextFieldComponent implements ControlValueAccessor {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() subType = 'text';
  @Input() isCalculated = false;
  @Input() readOnly = false;
  @Input() required = false;
  @Input() maxLength?: number;
  @Output() blurEvent = new EventEmitter<Event>();

  value: any = '';

  private cdr = inject(ChangeDetectorRef);
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: any): void {
    this.value = val ?? '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (val: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  get isFieldReadOnly(): boolean {
    return this.readOnly || this.isCalculated;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.subType !== 'number') return;

    if (ALLOWED_NUMBER_KEYS.has(event.key)) return;

    if (event.ctrlKey || event.metaKey) return;

    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const selectionStart = input.selectionStart ?? currentValue.length;

    if (event.key === '-') {
      if (selectionStart === 0 && !currentValue.includes('-')) return;
      event.preventDefault();
      return;
    }

    if (event.key === '.' || event.key === ',') {
      if (!currentValue.includes('.') && !currentValue.includes(',')) return;
      event.preventDefault();
      return;
    }

    if (/^[0-9]$/.test(event.key)) return;

    event.preventDefault();
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.subType === 'number') {
      const sanitized = input.value
        .replace(/[^0-9.\-]/g, '')
        .replace(/(?!^)-/g, '')
        .replace(/(\..*)\./g, '$1');
      if (sanitized !== input.value) {
        input.value = sanitized;
      }
    }
    this.value = input.value;
    this.onChange(this.value);
  }

  onFocus(e: FocusEvent): void {}

  onBlur(e: FocusEvent): void {
    this.onTouched();
    this.blurEvent.emit(e);
  }
}

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/** Characters allowed in a numeric field: digits, one decimal point, leading minus. */
const ALLOWED_NUMBER_KEYS = new Set([
  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End',
]);

@Component({
  selector: 'app-text-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      [title]="isFieldReadOnly ? 'This field is read-only' : required ? 'This field is required' : ''"
      class="text-input"
      [class.text-input--readonly]="isFieldReadOnly"
      (focus)="onFocus($event)"
      (blur)="blurEvent.emit($event)"
    />
  `,
  styles: [`
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
      transition: background var(--transition-fast), box-shadow var(--transition-fast);
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
  `],
})
export class TextFieldComponent {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() subType = 'text';
  @Input() value: any = '';
  @Input() isCalculated = false;
  @Input() readOnly = false;
  @Input() required = false;
  @Input() maxLength?: number;
  @Output() changed = new EventEmitter<Event>();
  @Output() blurEvent = new EventEmitter<Event>();

  get isFieldReadOnly(): boolean {
    return this.readOnly || this.isCalculated;
  }

  /**
   * Block non-numeric keys at keydown for number-subtype fields.
   * Allows: digits, one decimal point, minus at start, navigation & control keys, clipboard shortcuts.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (this.subType !== 'number') return;

    // Always allow navigation / control keys
    if (ALLOWED_NUMBER_KEYS.has(event.key)) return;

    // Allow Ctrl/Cmd shortcuts (copy, paste, cut, select-all)
    if (event.ctrlKey || event.metaKey) return;

    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const selectionStart = input.selectionStart ?? currentValue.length;

    // Allow minus sign only at the beginning
    if (event.key === '-') {
      if (selectionStart === 0 && !currentValue.includes('-')) return;
      event.preventDefault();
      return;
    }

    // Allow decimal point only if one doesn't already exist
    if (event.key === '.' || event.key === ',') {
      if (!currentValue.includes('.') && !currentValue.includes(',')) return;
      event.preventDefault();
      return;
    }

    // Allow digits 0-9
    if (/^[0-9]$/.test(event.key)) return;

    // Block everything else
    event.preventDefault();
  }

  /**
   * On input, sanitize the value for number fields as a safety net
   * (handles paste with non-numeric content, IME input, etc.)
   */
  onInputChange(event: Event): void {
    if (this.subType === 'number') {
      const input = event.target as HTMLInputElement;
      // Strip all characters that aren't digits, decimal point, or leading minus
      const sanitized = input.value
        .replace(/[^0-9.\-]/g, '')           // keep only valid chars
        .replace(/(?!^)-/g, '')              // minus only at start
        .replace(/(\..*)\./g, '$1');          // only one decimal point
      if (sanitized !== input.value) {
        input.value = sanitized;
      }
    }
    this.changed.emit(event);
  }

  onFocus(e: FocusEvent): void {}
}

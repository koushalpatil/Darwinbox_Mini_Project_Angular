import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

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

  onInputChange(event: Event): void {
    this.changed.emit(event);
  }

  onFocus(e: FocusEvent): void {}
}

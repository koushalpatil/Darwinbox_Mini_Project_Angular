import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-date-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="date-wrap" [title]="readOnly ? 'This field is read-only' : required ? 'This field is required' : ''">
      <input
        [id]="'input-date-' + elementId"
        type="text"
        [value]="value || ''"
        [placeholder]="dateFormat"
        (input)="handleDateInput($event)"
        [readOnly]="readOnly"
        [required]="required"
        maxlength="10"
        class="date-input"
        [class.date-input--readonly]="readOnly"
        (focus)="onFocus($event)"
        (blur)="blurEvent.emit($event)"
      />
      @if (!readOnly) {
        <input type="date" (change)="onPickerChange($event)" class="date-picker" />
      }
    </div>
  `,
  styles: [`
    .date-wrap {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .date-input {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      outline: none;
      padding: 0 20px 0 3px;
      margin: 0;
      font-size: 14px;
      font-family: inherit;
      color: #000;
      cursor: text;
      box-sizing: border-box;
      border-radius: 2px;
      transition: background var(--transition-fast), box-shadow var(--transition-fast);
    }

    .date-input--readonly {
      background: rgba(240, 240, 240, 0.6);
      color: #666;
      cursor: not-allowed;
    }

    .date-input:focus:not(.date-input--readonly) {
      background: rgba(99, 102, 241, 0.06);
      box-shadow: inset 0 0 0 1.5px rgba(99, 102, 241, 0.5);
    }

    .date-input:focus:not(.date-input--readonly)[required] {
      box-shadow: inset 0 0 0 1.5px rgba(239, 68, 68, 0.5);
    }

    .date-picker {
      position: absolute;
      right: 0;
      top: 0;
      width: 24px;
      height: 100%;
      border: none;
      background: transparent;
      cursor: pointer;
      z-index: 2;
      color: transparent;
    }
  `],
})
export class DateFieldComponent {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() value: any;
  @Input() dateFormat = 'DD/MM/YYYY';
  @Input() readOnly = false;
  @Input() required = false;
  @Output() changed = new EventEmitter<{ key: string; value: string }>();
  @Output() blurEvent = new EventEmitter<Event>();

  get sep(): string {
    const match = this.dateFormat.match(/[/\-.]/);
    return match ? match[0] : '/';
  }

  get fmt(): string {
    return this.dateFormat.toUpperCase();
  }

  handleDateInput(e: Event): void {
    if (this.readOnly) return;
    let raw = (e.target as HTMLInputElement).value.replace(/[^\d]/g, '');
    let formatted = '';
    if (raw.length > 0) formatted = raw.substring(0, 2);
    if (raw.length > 2) formatted += this.sep + raw.substring(2, 4);
    if (raw.length > 4) formatted += this.sep + raw.substring(4, 8);
    this.changed.emit({ key: this.fieldKey, value: formatted });
  }

  onPickerChange(e: Event): void {
    const htmlValue = (e.target as HTMLInputElement).value;
    this.changed.emit({ key: this.fieldKey, value: this.fromPickerValue(htmlValue) });
  }

  private fromPickerValue(htmlValue: string): string {
    if (!htmlValue) return '';
    const [year, month, day] = htmlValue.split('-');
    if (this.fmt.startsWith('DD')) return `${day}${this.sep}${month}${this.sep}${year}`;
    if (this.fmt.startsWith('MM')) return `${month}${this.sep}${day}${this.sep}${year}`;
    if (this.fmt.startsWith('YYYY')) return `${year}${this.sep}${month}${this.sep}${day}`;
    return `${day}${this.sep}${month}${this.sep}${year}`;
  }

  onFocus(e: FocusEvent): void {}
}

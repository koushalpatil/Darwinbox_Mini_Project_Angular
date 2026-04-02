import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-date-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="date-wrap"
      [title]="readOnly ? 'This field is read-only' : required ? 'This field is required' : ''"
    >
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
        <div class="calendar-icon-wrap">
          <svg
            class="calendar-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <input type="date" (change)="onPickerChange($event)" class="date-picker" />
        </div>
      }
    </div>
  `,
  styles: [
    `
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
        padding: 0 28px 0 3px;
        margin: 0;
        font-size: 14px;
        font-family: inherit;
        color: #000;
        cursor: text;
        box-sizing: border-box;
        border-radius: 2px;
        transition:
          background var(--transition-fast),
          box-shadow var(--transition-fast);
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

      .calendar-icon-wrap {
        position: absolute;
        right: 2px;
        top: 50%;
        transform: translateY(-50%);
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .calendar-icon {
        width: 18px;
        height: 18px;
        color: #555;
        pointer-events: none;
      }

      .date-picker {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 2;
      }

      .date-picker::-webkit-calendar-picker-indicator {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        cursor: pointer;
      }
    `,
  ],
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

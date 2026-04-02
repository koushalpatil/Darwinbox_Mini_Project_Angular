import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { PdfField } from '../../../../core/models/pdf.models';

@Component({
  selector: 'app-radio-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="radio-wrap" [title]="readOnly ? 'This field is read-only' : required ? 'This field is required' : ''">
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
  styles: [`
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

    .radio-input--disabled { cursor: not-allowed; opacity: 0.6; }
    .radio-input--required { accent-color: var(--color-error); }
  `],
})
export class RadioFieldComponent {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() field: PdfField | null = null;
  @Input() value: any;
  @Input() readOnly = false;
  @Input() required = false;
  @Output() changed = new EventEmitter<{ key: string; value: string }>();

  get radioValue(): string {
    return this.field?.buttonValue || this.fieldKey;
  }

  onSelect(): void {
    if (!this.readOnly) {
      this.changed.emit({ key: this.fieldKey, value: this.radioValue });
    }
  }
}

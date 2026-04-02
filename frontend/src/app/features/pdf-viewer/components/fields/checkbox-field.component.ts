import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-checkbox-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="checkbox-wrap" [title]="readOnly ? 'This field is read-only' : required ? 'This field is required' : ''">
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
  styles: [`
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
  `],
})
export class CheckboxFieldComponent {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() value: any;
  @Input() readOnly = false;
  @Input() required = false;
  @Output() changed = new EventEmitter<{ key: string; value: string }>();

  onToggle(e: Event): void {
    if (!this.readOnly) {
      const checked = (e.target as HTMLInputElement).checked;
      this.changed.emit({ key: this.fieldKey, value: checked ? 'Yes' : 'Off' });
    }
  }
}

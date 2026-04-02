import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { executeJSAction } from '../../utils/js-executor';
import { PdfField, JsActions } from '../../../../core/models/pdf.models';
import { LoggerService } from '../../../../core/services/logger.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-button-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [id]="'btn-' + elementId"
      type="button"
      (click)="onClick()"
      class="button-field"
    ></button>
  `,
  styles: [`
    .button-field {
      width: 100%;
      height: 100%;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      margin: 0;
      transition: background var(--transition-fast);
      border-radius: 2px;
    }

    .button-field:hover {
      background: rgba(99, 102, 241, 0.1);
    }

    .button-field:active {
      background: rgba(99, 102, 241, 0.2);
    }
  `],
})
export class ButtonFieldComponent {
  @Input() elementId = '';
  @Input() fieldKey = '';
  @Input() field: PdfField | null = null;
  @Input() value: any;
  @Input() jsActions: JsActions = {};
  @Input() formData: Record<string, any> = {};
  @Input() allFields: PdfField[] = [];
  @Output() submitEvent = new EventEmitter<void>();

  private logger = inject(LoggerService);

  onClick(): void {
    const aScripts = Array.isArray(this.jsActions.A)
      ? this.jsActions.A.filter(Boolean)
      : this.jsActions.A
        ? [this.jsActions.A]
        : [];
    if (aScripts.length > 0) {
      const result = executeJSAction(aScripts, this.value, this.formData || {}, this.allFields);
      if (result.value !== null) {
        this.logger.debug('Button action result:', result.value);
      }
    }
    this.logger.debug('Button clicked:', this.field?.name);
    this.submitEvent.emit();
  }
}

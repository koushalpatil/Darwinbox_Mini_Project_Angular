import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { executeJSAction } from '../../utils/js-executor';
import { TextFieldComponent } from '../fields/text-field.component';
import { CheckboxFieldComponent } from '../fields/checkbox-field.component';
import { RadioFieldComponent } from '../fields/radio-field.component';
import { DropdownFieldComponent } from '../fields/dropdown-field.component';
import { ButtonFieldComponent } from '../fields/button-field.component';
import { SignatureFieldComponent } from '../fields/signature-field.component';
import { DateFieldComponent } from '../fields/date-field.component';
import { PdfField, JsActions, FieldOverrides } from '../../../../core/models/pdf.models';

function getScripts(jsActions: JsActions, key: string): string[] {
  const val = jsActions[key];
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
}

function hasScripts(jsActions: JsActions, key: string): boolean {
  return getScripts(jsActions, key).length > 0;
}

@Component({
  selector: 'app-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TextFieldComponent,
    CheckboxFieldComponent,
    RadioFieldComponent,
    DropdownFieldComponent,
    ButtonFieldComponent,
    SignatureFieldComponent,
    DateFieldComponent,
  ],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent implements OnInit, OnChanges {
  @Input() field!: PdfField;
  @Input() widgetIndex = 0;
  @Input() value: any;
  @Input() formData: Record<string, any> = {};
  @Input() allFields: PdfField[] = [];
  @Input() fieldOverrides: FieldOverrides = {};
  @Output() fieldChange = new EventEmitter<{ key: string; value: any }>();
  @Output() submitEvent = new EventEmitter<void>();

  fieldKey = '';
  elementId = '';
  jsActions: JsActions = {};
  isReadOnly = false;
  isRequired = false;
  isCalculated = false;
  fieldSubType = 'text';

  private prevCalcValue: any = undefined;
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.computeDerivedState();
    this.runCalculateScripts();

    interval(500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.runCalculateScripts());
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.computeDerivedState();
    if (changes['formData'] || changes['value']) {
      this.runCalculateScripts();
    }
  }

  private computeDerivedState(): void {
    this.fieldKey =
      this.field?.type === 'PDFRadioGroup'
        ? `${this.field.name}-page-${this.field.page}`
        : `${this.field?.name}-page-${this.field?.page}-w${this.widgetIndex}`;
    this.elementId = `${this.field?.name}-page-${this.field?.page}-w${this.widgetIndex}`;
    this.jsActions = (this.field?.jsActions || {}) as JsActions;
    this.fieldSubType = this.field?.subType || 'text';
    this.isCalculated = hasScripts(this.jsActions, 'C');

    const overrides = (this.fieldOverrides || {})[this.field?.name] || {};
    this.isReadOnly =
      overrides.readOnly !== undefined ? overrides.readOnly : this.field?.readOnly || false;
    this.isRequired =
      overrides.required !== undefined ? overrides.required : this.field?.required || false;
  }

  private runCalculateScripts(): void {
    const calculateScripts = getScripts(this.jsActions, 'C');
    if (calculateScripts.length === 0) return;
    const result = executeJSAction(
      calculateScripts,
      this.value,
      this.formData || {},
      this.allFields,
    );
    if (result.value !== null && result.value !== this.prevCalcValue) {
      this.prevCalcValue = result.value;
      this.fieldChange.emit({ key: this.fieldKey, value: result.value });
    }
  }

  onFieldChanged(event: { key: string; value: any }): void {
    this.fieldChange.emit(event);
  }

  handleChange(e: Event): void {
    const newValue = (e.target as HTMLInputElement).value;
    const accepted = this.handleKeystroke(newValue);
    if (accepted !== null) {
      this.fieldChange.emit({ key: this.fieldKey, value: accepted });
    }
  }

  handleBlur(e: Event): void {
    this.handleValidate();
    this.handleFormat(e);
    const blurScripts = getScripts(this.jsActions, 'Bl');
    if (blurScripts.length > 0) {
      executeJSAction(blurScripts, this.value, this.formData || {}, this.allFields);
    }
  }

  handleFocus(): void {
    const focusScripts = getScripts(this.jsActions, 'Fo');
    if (focusScripts.length > 0) {
      executeJSAction(focusScripts, this.value, this.formData || {}, this.allFields);
    }
  }

  handleMouseEnter(): void {
    const enterScripts = getScripts(this.jsActions, 'E');
    if (enterScripts.length > 0) {
      executeJSAction(enterScripts, this.value, this.formData || {}, this.allFields);
    }
  }

  handleMouseLeave(): void {
    const exitScripts = getScripts(this.jsActions, 'X');
    if (exitScripts.length > 0) {
      executeJSAction(exitScripts, this.value, this.formData || {}, this.allFields);
    }
  }

  handleMouseDown(): void {
    const downScripts = getScripts(this.jsActions, 'D');
    if (downScripts.length > 0) {
      executeJSAction(downScripts, this.value, this.formData || {}, this.allFields);
    }
  }

  handleMouseUp(): void {
    const upScripts = getScripts(this.jsActions, 'U');
    if (upScripts.length > 0) {
      executeJSAction(upScripts, this.value, this.formData || {}, this.allFields);
    }
  }

  private handleKeystroke(newValue: string): string | null {
    const keystrokeScripts = getScripts(this.jsActions, 'K');
    if (keystrokeScripts.length > 0) {
      const result = executeJSAction(
        keystrokeScripts,
        newValue,
        this.formData || {},
        this.allFields,
      );
      if (!result.rc) return null;
      if (result.value !== null) return result.value;
    }
    return newValue;
  }

  private handleFormat(e: Event): void {
    const formatScripts = getScripts(this.jsActions, 'F');
    if (formatScripts.length > 0) {
      const result = executeJSAction(
        formatScripts,
        this.value,
        this.formData || {},
        this.allFields,
      );
      if (result.value !== null && result.value !== this.value) {
        this.fieldChange.emit({ key: this.fieldKey, value: result.value });
      }
    }
    if (e?.target) {
      (e.target as HTMLElement).style.background = 'transparent';
      (e.target as HTMLElement).style.border = 'none';
    }
  }

  private handleValidate(): boolean {
    const validateScripts = getScripts(this.jsActions, 'V');
    if (validateScripts.length === 0) return true;

    const result = executeJSAction(
      validateScripts,
      this.value,
      this.formData || {},
      this.allFields,
    );

    if (!result.rc) return false;

    if (result.value !== null && result.value !== this.value) {
      this.fieldChange.emit({ key: this.fieldKey, value: result.value });
    }

    return true;
  }
}

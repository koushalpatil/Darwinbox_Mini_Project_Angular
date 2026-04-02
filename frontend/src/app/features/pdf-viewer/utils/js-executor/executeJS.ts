import { buildDocProxy, buildAFPolyfills } from './sandbox';
import {
  handleAFSimpleCalculate,
  handleAFNumberKeystroke,
  handleAFNumberFormat,
  handleAFRangeValidate,
  handleAFSpecialKeystroke,
  handleAFSpecialFormat,
  handleAFPercentKeystroke,
  handleAFPercentFormat,
  handleAFDateKeystroke,
  handleAFDateFormat,
  handleAFTimeKeystroke,
  handleAFTimeFormat,
} from './acrobatHandlers';

function executeSingleJS(
  jsCode: string,
  currentValue: any,
  formData: Record<string, any>,
  allFields: any[],
): { value: any; rc: boolean } {
  if (!jsCode || !jsCode.trim()) return { value: null, rc: true };

  try {
    if (/AFSimple_Calculate/i.test(jsCode)) {
      const r = handleAFSimpleCalculate(jsCode, formData, allFields);
      if (r) return r;
    }

    if (/AFNumber_Keystroke/i.test(jsCode)) {
      return handleAFNumberKeystroke(jsCode, currentValue);
    }

    if (/AFNumber_Format/i.test(jsCode)) {
      const r = handleAFNumberFormat(jsCode, currentValue);
      if (r) return r;
    }

    if (/AFRange_Validate/i.test(jsCode)) {
      const r = handleAFRangeValidate(jsCode, currentValue);
      if (r) return r;
    }

    if (/AFSpecial_Keystroke/i.test(jsCode)) {
      const r = handleAFSpecialKeystroke(jsCode, currentValue);
      if (r) return r;
    }

    if (/AFSpecial_Format/i.test(jsCode)) {
      const r = handleAFSpecialFormat(jsCode, currentValue);
      if (r) return r;
    }

    if (/AFPercent_Keystroke/i.test(jsCode)) {
      return handleAFPercentKeystroke(jsCode, currentValue);
    }

    if (/AFPercent_Format/i.test(jsCode)) {
      return handleAFPercentFormat(jsCode, currentValue);
    }

    if (/AFDate_Keystroke/i.test(jsCode)) {
      return handleAFDateKeystroke(jsCode, currentValue);
    }

    if (/AFDate_Format/i.test(jsCode)) {
      return handleAFDateFormat(jsCode, currentValue);
    }

    if (/AFTime_Keystroke/i.test(jsCode)) {
      return handleAFTimeKeystroke(jsCode, currentValue);
    }

    if (/AFTime_Format/i.test(jsCode)) {
      return handleAFTimeFormat(jsCode, currentValue);
    }

    if (/event\.value\s*=\s*event\.value\.toUpperCase\s*\(\s*\)/i.test(jsCode)) {
      return { value: (currentValue || '').toUpperCase(), rc: true };
    }

    if (/event\.value\s*=\s*event\.value\.toLowerCase\s*\(\s*\)/i.test(jsCode)) {
      return { value: (currentValue || '').toLowerCase(), rc: true };
    }

    if (/event\.value\s*=\s*event\.value\.trim\s*\(\s*\)/i.test(jsCode)) {
      return { value: (currentValue || '').trim(), rc: true };
    }

    if (/this\.getField/i.test(jsCode) && /event\.value\s*=/i.test(jsCode)) {
      try {
        const docProxy = buildDocProxy(formData, allFields);
        const event = { value: currentValue || '', rc: true };
        const fn = new Function(
          'event',
          'doc',
          buildAFPolyfills() +
            `var self = doc;\n` +
            jsCode.replace(/\bthis\.getField/g, 'doc.getField') +
            '\nreturn event;',
        );
        const result = fn(event, docProxy);
        return {
          value: result.value !== undefined ? String(result.value) : null,
          rc: result.rc !== false,
        };
      } catch (e) {
        console.debug('Custom this.getField JS eval failed:', e);
      }
    }

    const safePattern = /^[\s;]*event\.value\s*=\s*event\.value\.\w+\([^)]*\)\s*;?\s*$/;
    if (safePattern.test(jsCode)) {
      try {
        const event = { value: currentValue || '', rc: true };
        const fn = new Function('event', buildAFPolyfills() + jsCode + '; return event;');
        const result = fn(event);
        return {
          value: result.value !== undefined ? String(result.value) : null,
          rc: result.rc !== false,
        };
      } catch (e) {
        console.debug('Sandboxed JS eval failed:', e);
      }
    }

    if (/event\.(value|rc)\s*=/i.test(jsCode) || /AF\w+/i.test(jsCode)) {
      try {
        const event = { value: currentValue || '', rc: true };
        const docProxy = buildDocProxy(formData, allFields);
        const fn = new Function(
          'event',
          'doc',
          buildAFPolyfills() +
            jsCode.replace(/\bthis\.getField/g, 'doc.getField') +
            '; return event;',
        );
        const result = fn(event, docProxy);
        const valueChanged =
          result.value !== undefined && String(result.value) !== (currentValue || '');
        return {
          value: valueChanged ? String(result.value) : null,
          rc: result.rc !== false,
        };
      } catch (e) {
        console.debug('Generic sandbox eval failed:', e);
      }
    }

    try {
      const event = { value: currentValue || '', rc: true };
      const docProxy = buildDocProxy(formData, allFields);
      const fn = new Function(
        'event',
        'doc',
        buildAFPolyfills() +
          `var self = doc;\n` +
          jsCode.replace(/\bthis\.getField/g, 'doc.getField') +
          '; return event;',
      );
      const result = fn(event, docProxy);
      const valueChanged =
        result.value !== undefined && String(result.value) !== (currentValue || '');
      return {
        value: valueChanged ? String(result.value) : null,
        rc: result.rc !== false,
      };
    } catch (e) {
      console.debug('Last-resort sandbox eval failed:', e, 'Script:', jsCode);
    }
  } catch (e) {
    console.warn('executeSingleJS error:', e, 'Script:', jsCode);
  }

  return { value: null, rc: true };
}

function normalizeScripts(jsCode: string | string[]): string[] {
  if (!jsCode) return [];
  if (Array.isArray(jsCode)) return jsCode.filter((s) => s && s.trim());
  if (typeof jsCode === 'string' && jsCode.trim()) return [jsCode];
  return [];
}

export function executeJSAction(
  jsCode: string | string[],
  currentValue: any,
  formData: Record<string, any>,
  allFields: any[],
): { value: any; rc: boolean } {
  const scripts = normalizeScripts(jsCode);
  if (scripts.length === 0) return { value: null, rc: true };

  let value = currentValue;
  let anyResult = false;

  for (const script of scripts) {
    const result = executeSingleJS(script, value, formData, allFields);

    if (!result.rc) {
      return { value: null, rc: false };
    }

    if (result.value !== null) {
      value = result.value;
      anyResult = true;
    }
  }

  return { value: anyResult ? value : null, rc: true };
}

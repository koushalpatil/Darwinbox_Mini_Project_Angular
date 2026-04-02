import { resolveFieldValue } from './resolveFieldValue';

export function handleAFSimpleCalculate(
  jsCode: string,
  formData: Record<string, any>,
  allFields: any[],
): { value: string; rc: boolean } | null {
  const match = jsCode.match(
    /AFSimple_Calculate\s*\(\s*"(\w+)"\s*,\s*new\s+Array\s*\(([^)]*)\)\s*\)/i,
  );
  if (!match) return null;

  const operation = match[1].toUpperCase();
  const fieldNames = match[2].split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));

  const values = fieldNames.map((name: string) => {
    const raw = resolveFieldValue(name, formData, allFields);
    return parseFloat(raw) || 0;
  });

  let result = 0;
  switch (operation) {
    case 'SUM':
      result = values.reduce((a: number, b: number) => a + b, 0);
      break;
    case 'AVG':
      result =
        values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
      break;
    case 'MIN':
      result = values.length > 0 ? Math.min(...values) : 0;
      break;
    case 'MAX':
      result = values.length > 0 ? Math.max(...values) : 0;
      break;
    case 'PRD':
      result = values.reduce((a: number, b: number) => a * b, 1);
      break;
    default:
      result = 0;
  }

  return { value: String(result), rc: true };
}

export function handleAFNumberKeystroke(
  jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } {
  const match = jsCode.match(/AFNumber_Keystroke\s*\(\s*(\d+)\s*(?:,\s*(\d+))?/i);
  const nDec = match ? parseInt(match[1], 10) : 2;
  const sepStyle = match && match[2] ? parseInt(match[2], 10) : 0;
  const decimalSep = sepStyle === 1 || sepStyle === 3 ? ',' : '.';
  const val = currentValue ?? '';

  if (val === '' || val === '-' || val === '+' || val === decimalSep) {
    return { value: null, rc: true };
  }

  const escapedSep = decimalSep === '.' ? '\\.' : ',';
  let pattern: RegExp;
  if (nDec === 0) {
    pattern = /^[+-]?\d*$/;
  } else {
    pattern = new RegExp(`^[+-]?\\d*${escapedSep}?\\d{0,${nDec}}$`);
  }

  return { value: null, rc: pattern.test(val) };
}

export function handleAFNumberFormat(
  jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } | null {
  const match = jsCode.match(/AFNumber_Format\s*\(\s*(\d+)/i);
  if (!match) return null;

  const nDec = parseInt(match[1], 10);

  const cleanValue = String(currentValue ?? '').replace(/[^0-9.\-+]/g, '');
  const num = parseFloat(cleanValue);
  if (isNaN(num)) return { value: currentValue, rc: true };

  const formatted = num.toFixed(nDec);
  return { value: formatted, rc: true };
}

export function handleAFRangeValidate(
  jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } | null {
  const match = jsCode.match(
    /AFRange_Validate\s*\(\s*(true|false)\s*,\s*([+-]?[\d.]+)\s*,\s*(true|false)\s*,\s*([+-]?[\d.]+)\s*\)/i,
  );
  if (!match) return null;

  const bGreaterThan = match[1].toLowerCase() === 'true';
  const nGreaterThan = parseFloat(match[2]);
  const bLessThan = match[3].toLowerCase() === 'true';
  const nLessThan = parseFloat(match[4]);

  if (!currentValue || currentValue === '') return { value: null, rc: true };
  const num = parseFloat(currentValue);
  if (isNaN(num)) return { value: null, rc: true };

  if (bGreaterThan && num < nGreaterThan) return { value: null, rc: false };
  if (bLessThan && num > nLessThan) return { value: null, rc: false };

  return { value: null, rc: true };
}

export function handleAFSpecialKeystroke(
  jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } | null {
  const match = jsCode.match(/AFSpecial_Keystroke\s*\(\s*(\d+)\s*\)/i);
  if (!match) return null;

  const nMask = parseInt(match[1], 10);
  const val = currentValue || '';

  switch (nMask) {
    case 0:
      return { value: null, rc: /^\d{0,5}$/.test(val) };
    case 1:
      return { value: null, rc: /^\d{0,5}(-\d{0,4})?$/.test(val) };
    case 2:
      return { value: null, rc: /^[\d()\s.\-]{0,14}$/.test(val) };
    case 3:
      return { value: null, rc: /^\d{0,3}(-\d{0,2}(-\d{0,4})?)?$/.test(val) };
    default:
      return { value: null, rc: true };
  }
}

export function handleAFSpecialFormat(
  jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } | null {
  const match = jsCode.match(/AFSpecial_Format\s*\(\s*(\d+)\s*\)/i);
  if (!match) return null;

  const nMask = parseInt(match[1], 10);
  const digits = (currentValue || '').replace(/\D/g, '');
  if (!digits) return { value: currentValue || '', rc: true };

  switch (nMask) {
    case 0:
      return { value: digits.slice(0, 5), rc: true };
    case 1:
      if (digits.length <= 5) return { value: digits, rc: true };
      return {
        value: `${digits.slice(0, 5)}-${digits.slice(5, 9)}`,
        rc: true,
      };
    case 2:
      if (digits.length <= 3) return { value: digits, rc: true };
      if (digits.length <= 6)
        return {
          value: `(${digits.slice(0, 3)}) ${digits.slice(3)}`,
          rc: true,
        };
      return {
        value: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`,
        rc: true,
      };
    case 3:
      if (digits.length <= 3) return { value: digits, rc: true };
      if (digits.length <= 5)
        return {
          value: `${digits.slice(0, 3)}-${digits.slice(3)}`,
          rc: true,
        };
      return {
        value: `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`,
        rc: true,
      };
    default:
      return { value: null, rc: true };
  }
}

export function handleAFPercentKeystroke(
  jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } {
  const match = jsCode.match(/AFPercent_Keystroke\s*\(\s*(\d+)/i);
  const nDec = match ? parseInt(match[1], 10) : 2;
  const val = currentValue || '';

  if (val === '' || val === '-' || val === '.' || val === '+') {
    return { value: null, rc: true };
  }

  const clean = val.replace(/%$/, '');
  const pattern = nDec === 0 ? /^[+-]?\d*$/ : new RegExp(`^[+-]?\\d*\\.?\\d{0,${nDec}}$`);

  return { value: null, rc: pattern.test(clean) };
}

export function handleAFPercentFormat(
  jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } {
  const match = jsCode.match(/AFPercent_Format\s*\(\s*(\d+)/i);
  const nDec = match ? parseInt(match[1], 10) : 2;

  const clean = (currentValue || '').replace(/%/g, '').trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return { value: currentValue, rc: true };

  return { value: num.toFixed(nDec) + '%', rc: true };
}

export function handleAFDateKeystroke(
  _jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } {
  const val = currentValue || '';
  return { value: null, rc: /^[\d/\-.\s]*$/.test(val) };
}

export function handleAFDateFormat(
  _jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } {
  return { value: currentValue, rc: true };
}

export function handleAFTimeKeystroke(
  _jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } {
  const val = currentValue || '';
  return { value: null, rc: /^[\d:.\sAaPpMm]*$/.test(val) };
}

export function handleAFTimeFormat(
  _jsCode: string,
  currentValue: any,
): { value: any; rc: boolean } {
  return { value: currentValue, rc: true };
}

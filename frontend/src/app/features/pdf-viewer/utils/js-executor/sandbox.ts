import { resolveFieldValue } from './resolveFieldValue';

export function buildDocProxy(formData: Record<string, any>, allFields: any[]) {
  return {
    getField(name: string) {
      const raw = resolveFieldValue(name, formData, allFields);
      const num = parseFloat(raw);
      return {
        value: raw,
        valueAsNumber: isNaN(num) ? 0 : num,
        valueAsString: String(raw ?? ''),
      };
    },
  };
}

export function buildAFPolyfills(): string {
  return `
    /* ── AF* polyfills injected by jsExecutor ── */
    function AFSimple_Calculate(op, arr) {
      var values = arr.map(function(n) {
        var f = doc.getField(n);
        return f ? (parseFloat(f.value) || 0) : 0;
      });
      var result = 0;
      switch ((op || "").toUpperCase()) {
        case "SUM": result = values.reduce(function(a,b){return a+b},0); break;
        case "AVG": result = values.length > 0 ? values.reduce(function(a,b){return a+b},0)/values.length : 0; break;
        case "MIN": result = values.length > 0 ? Math.min.apply(null,values) : 0; break;
        case "MAX": result = values.length > 0 ? Math.max.apply(null,values) : 0; break;
        case "PRD": result = values.reduce(function(a,b){return a*b},1); break;
      }
      event.value = String(result);
    }
    function AFNumber_Keystroke(nDec,sepStyle,negStyle,currStyle,strCurrency,bPrepend) {
      var v = String(event.value || "");
      if (v===""||v==="-"||v==="+"||v===".") return;
      var p = nDec===0 ? /^[+-]?\\\\d*$/ : new RegExp("^[+-]?\\\\\\\\d*\\\\\\\\.?\\\\\\\\d{0,"+nDec+"}$");
      if (!p.test(v)) event.rc = false;
    }
    function AFNumber_Format(nDec) {
      var n = parseFloat(event.value);
      if (!isNaN(n)) event.value = n.toFixed(nDec);
    }
    function AFRange_Validate(bGT,nGT,bLT,nLT) {
      var n = parseFloat(event.value);
      if (isNaN(n)) return;
      if (bGT && n < nGT) event.rc = false;
      if (bLT && n > nLT) event.rc = false;
    }
    function AFSpecial_Keystroke(mask) {}
    function AFSpecial_Format(mask) {}
    function AFPercent_Keystroke(nDec,sep) {
      AFNumber_Keystroke(nDec,sep || 0,0,0,"",false);
    }
    function AFPercent_Format(nDec) {
      var n = parseFloat(event.value);
      if (!isNaN(n)) event.value = n.toFixed(nDec) + "%";
    }
    function AFDate_KeystrokeEx(fmt) {}
    function AFDate_FormatEx(fmt) {}
    function AFDate_Keystroke(fmt) {}
    function AFDate_Format(fmt) {}
    function AFTime_Keystroke(n) {}
    function AFTime_KeystrokeEx(fmt) {}
    function AFTime_Format(n) {}
    function AFTime_FormatEx(fmt) {}
    function AFMergeChange(event) {
      return event.value;
    }
  `;
}

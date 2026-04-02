const { KNOWN_ACTION_KEYS, createEmptyActions } = require("./helpers");
const { extractAllJSActions } = require("./extractors");

function normalizeToArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string" && val.trim()) return [val];
  return [];
}

function scanDictForJS(dict, context) {
  const actions = extractAllJSActions(dict, context);
  for (const key of [...KNOWN_ACTION_KEYS, "A"]) {
    const arr = actions[key];
    if (arr && arr.length > 0) return arr[0];
  }

  if (actions._unknown && actions._unknown.length > 0) {
    const first = actions._unknown[0];
    return typeof first === "string" ? first : first.js || "";
  }
  return "";
}

function mergeJSActions(base, overlay) {
  const merged = createEmptyActions();
  const allKeys = new Set([...Object.keys(base), ...Object.keys(overlay)]);

  for (const key of allKeys) {
    const baseArr = normalizeToArray(base[key]);
    const overlayArr = normalizeToArray(overlay[key]);

    const combined = [...baseArr];
    for (const item of overlayArr) {
      if (!combined.includes(item)) {
        combined.push(item);
      }
    }
    merged[key] = combined;
  }

  return merged;
}

module.exports = { scanDictForJS, mergeJSActions };

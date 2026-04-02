const { PDFName, PDFStream, PDFArray } = require("pdf-lib");
const {
  resolveLookup,
  KNOWN_ACTION_KEYS,
  createEmptyActions,
} = require("./helpers");

function extractJSSingle(actionObj, context) {
  if (!actionObj) return "";
  try {
    const dict = resolveLookup(actionObj, context);
    if (!dict || typeof dict.get !== "function") return "";

    const jsEntry = dict.get(PDFName.of("JS"));
    if (!jsEntry) return "";

    if (jsEntry instanceof PDFStream) {
      try {
        const bytes = jsEntry.getContents();
        return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      } catch {
        return "";
      }
    }

    if (typeof jsEntry.decodeText === "function") return jsEntry.decodeText();
    if (typeof jsEntry.asString === "function") return jsEntry.asString();
    return String(jsEntry);
  } catch {
    return "";
  }
}

function extractJSFromAction(actionObj, context) {
  const results = [];
  if (!actionObj) return results;

  const dict = resolveLookup(actionObj, context);
  if (!dict || typeof dict.get !== "function") return results;

  const js = extractJSSingle(dict, context);
  if (js) results.push(js);

  try {
    const nextEntry = dict.get(PDFName.of("Next"));
    if (nextEntry) {
      const resolved = resolveLookup(nextEntry, context);
      if (resolved instanceof PDFArray) {
        const items = resolved.asArray ? resolved.asArray() : [];
        for (const item of items) {
          results.push(...extractJSFromAction(item, context));
        }
      } else if (resolved) {
        results.push(...extractJSFromAction(resolved, context));
      }
    }
  } catch {}

  return results;
}

function extractAllJSActions(dict, context) {
  const actions = createEmptyActions();
  if (!dict || typeof dict.get !== "function") return actions;

  let aaEntry = resolveLookup(dict.get(PDFName.of("AA")), context);
  if (aaEntry && typeof aaEntry.get === "function") {
    for (const key of KNOWN_ACTION_KEYS) {
      const actionDict = resolveLookup(aaEntry.get(PDFName.of(key)), context);
      const jsArr = extractJSFromAction(actionDict, context);
      if (jsArr.length > 0) {
        actions[key].push(...jsArr);
      }
    }

    if (typeof aaEntry.entries === "function") {
      try {
        for (const [pdfKey, pdfVal] of aaEntry.entries()) {
          const keyStr =
            pdfKey instanceof PDFName ? pdfKey.decodeText() : String(pdfKey);
          const cleanKey = keyStr.startsWith("/") ? keyStr.slice(1) : keyStr;
          if (!KNOWN_ACTION_KEYS.includes(cleanKey) && cleanKey !== "A") {
            const actionDict = resolveLookup(pdfVal, context);
            const jsArr = extractJSFromAction(actionDict, context);
            if (jsArr.length > 0) {
              actions._unknown.push(
                ...jsArr.map((js) => ({ trigger: cleanKey, js })),
              );
            }
          }
        }
      } catch {}
    }
  }

  const aDict = resolveLookup(dict.get(PDFName.of("A")), context);
  const aJsArr = extractJSFromAction(aDict, context);
  if (aJsArr.length > 0) {
    actions.A.push(...aJsArr);
  }

  return actions;
}

module.exports = { extractJSFromAction, extractAllJSActions };

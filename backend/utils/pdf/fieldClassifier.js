const {
  extractAllJSActions,
  scanDictForJS,
  mergeJSActions,
  createEmptyActions,
} = require("../js-actions");

function extractFormatFromJS(js) {
  if (!js) return {};

  const dateMatch = js.match(
    /AFDate_(?:KeystrokeEx|FormatEx)\s*\(\s*["']([^"']+)["']\s*\)/i,
  );
  if (dateMatch) {
    return { subType: "date", dateFormat: dateMatch[1] };
  }

  if (/AFDate_/i.test(js)) {
    return { subType: "date", dateFormat: "DD/MM/YYYY" };
  }

  const numMatch = js.match(/AFNumber_Keystroke\s*\(([^)]*)\)/i);
  if (numMatch) {
    return { subType: "number", numberFormat: numMatch[1].trim() };
  }

  if (/AFNumber_|AFPercent_|AFRange_|AFSimple_Calculate/i.test(js)) {
    return { subType: "number" };
  }

  return {};
}

function classifyTextField(field) {
  let allActions = createEmptyActions();
  try {
    const rawDict = field.acroField.dict;
    const context = rawDict.context;

    const fieldActions = extractAllJSActions(rawDict, context);
    allActions = mergeJSActions(allActions, fieldActions);

    const fieldJS = scanDictForJS(rawDict, context);

    if (fieldJS) {
      const result = extractFormatFromJS(fieldJS);
      if (result.subType) {
        return { ...result, jsActions: allActions };
      }
    }

    const widgets = field.acroField.getWidgets();
    for (const widget of widgets) {
      const widgetActions = extractAllJSActions(widget.dict, context);
      allActions = mergeJSActions(allActions, widgetActions);

      const widgetJS = scanDictForJS(widget.dict, context);
      if (widgetJS) {
        const result = extractFormatFromJS(widgetJS);
        if (result.subType) {
          return { ...result, jsActions: allActions };
        }
      }
    }
  } catch (e) {
    console.debug("classifyTextField failed:", e);
  }
  return { subType: "text", jsActions: allActions };
}

function extractFieldJSActions(field) {
  let allActions = createEmptyActions();
  try {
    const rawDict = field.acroField.dict;
    const context = rawDict.context;
    allActions = mergeJSActions(
      allActions,
      extractAllJSActions(rawDict, context),
    );

    const widgets = field.acroField.getWidgets();
    for (const widget of widgets) {
      allActions = mergeJSActions(
        allActions,
        extractAllJSActions(widget.dict, context),
      );
    }
  } catch (e) {
    console.debug("extractFieldJSActions failed:", e);
  }
  return allActions;
}

module.exports = {
  extractFormatFromJS,
  classifyTextField,
  extractFieldJSActions,
};

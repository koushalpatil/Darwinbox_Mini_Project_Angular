const { extractAllJSActions } = require("./extractors");
const {
  extractDocumentLevelJS,
  extractPageLevelJS,
  extractOpenActionJS,
  extractCalculationOrderJS,
} = require("./documentExtractors");

function extractAllDocumentJS(pdfDoc) {
  const documentLevel = extractDocumentLevelJS(pdfDoc);
  const pageLevel = extractPageLevelJS(pdfDoc);
  const openAction = extractOpenActionJS(pdfDoc);
  const calculationOrder = extractCalculationOrderJS(pdfDoc);

  const fieldLevel = [];
  const widgetLevel = [];
  try {
    const form = pdfDoc.getForm();
    const context = pdfDoc.context;

    form.getFields().forEach((field) => {
      const fieldName = field.getName();
      const rawDict = field.acroField.dict;

      const fieldActions = extractAllJSActions(rawDict, context);
      const hasFieldJS = Object.values(fieldActions).some((v) =>
        Array.isArray(v) ? v.length > 0 : !!v,
      );
      if (hasFieldJS) {
        fieldLevel.push({
          location: "FieldLevel",
          fieldName,
          actions: fieldActions,
        });
      }

      const widgets = field.acroField.getWidgets();
      widgets.forEach((widget, wIdx) => {
        const widgetActions = extractAllJSActions(widget.dict, context);
        const hasWidgetJS = Object.values(widgetActions).some((v) =>
          Array.isArray(v) ? v.length > 0 : !!v,
        );
        if (hasWidgetJS) {
          widgetLevel.push({
            location: "WidgetLevel",
            fieldName,
            widgetIndex: wIdx,
            actions: widgetActions,
          });
        }
      });
    });
  } catch (e) {
    console.debug("Field/Widget level scan failed:", e);
  }

  return {
    documentLevel,
    pageLevel,
    openAction,
    calculationOrder,
    fieldLevel,
    widgetLevel,
  };
}

module.exports = { extractAllDocumentJS };

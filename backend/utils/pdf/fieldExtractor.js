const { PDFName, PDFNumber } = require("pdf-lib");
const {
  classifyTextField,
  extractFieldJSActions,
} = require("./fieldClassifier");
const {
  mergeJSActions,
  extractCalculationOrderJS,
  createEmptyActions,
} = require("../js-actions");

function buildAnnotPageMap(pdfDoc) {
  const pages = pdfDoc.getPages();
  const annotDictToPageIndex = new Map();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const annots = page.node.Annots();
    if (annots) {
      const refs = annots.asArray();
      for (const ref of refs) {
        try {
          const dict = pdfDoc.context.lookup(ref);
          if (dict) {
            annotDictToPageIndex.set(dict, i);
          }
        } catch (e) {}
      }
    }
  }

  return annotDictToPageIndex;
}

function isSystemField(fieldName) {
  return (
    fieldName.startsWith("pdf_") ||
    fieldName.startsWith("adobe") ||
    fieldName.startsWith("fake")
  );
}

function buildCOActionsMap(pdfDoc) {
  const coMap = new Map();
  try {
    const coEntries = extractCalculationOrderJS(pdfDoc);
    for (const entry of coEntries) {
      coMap.set(entry.fieldName, entry.actions);
    }
  } catch (e) {
    console.debug("buildCOActionsMap failed:", e);
  }
  return coMap;
}

function extractTypeSpecificData(field, fieldType, widgetIdx) {
  const data = {};

  if (fieldType === "PDFDropdown" || fieldType === "PDFOptionList") {
    try {
      data.options = field.getOptions().map((opt) => ({
        displayValue: opt,
        exportValue: opt,
      }));
    } catch (e) {
      data.options = [];
    }
  }

  if (fieldType === "PDFRadioGroup") {
    try {
      const options = field.getOptions();
      data.buttonValue = options[widgetIdx] || `option_${widgetIdx}`;
      data.value = field.getSelected();
    } catch (e) {
      data.buttonValue = `option_${widgetIdx}`;
    }
  } else if (fieldType === "PDFTextField") {
    try {
      data.value = field.getText();
    } catch (e) {}

    try {
      const rawDict = field.acroField.dict;
      const maxLenEntry = rawDict.get(PDFName.of("MaxLen"));
      if (maxLenEntry) {
        const maxLenVal =
          maxLenEntry instanceof PDFNumber
            ? maxLenEntry.asNumber()
            : parseInt(String(maxLenEntry), 10);
        if (!isNaN(maxLenVal) && maxLenVal > 0) {
          data.maxLen = maxLenVal;
        }
      }
    } catch (e) {
      console.debug("Could not read MaxLen:", e);
    }

    const classification = classifyTextField(field);
    data.subType = classification.subType;
    if (classification.dateFormat) data.dateFormat = classification.dateFormat;
    if (classification.numberFormat)
      data.numberFormat = classification.numberFormat;
    if (classification.jsActions) data.jsActions = classification.jsActions;
  } else if (fieldType === "PDFCheckBox") {
    try {
      data.value = field.isChecked();
    } catch (e) {}
    data.jsActions = extractFieldJSActions(field);
  } else if (fieldType === "PDFDropdown" || fieldType === "PDFOptionList") {
    try {
      const selected = field.getSelected();
      data.value = Array.isArray(selected) ? selected[0] : selected;
    } catch (e) {}
    data.jsActions = extractFieldJSActions(field);
  }

  return data;
}

function extractFieldsFromDocument(pdfDoc) {
  const form = pdfDoc.getForm();
  const annotDictToPageIndex = buildAnnotPageMap(pdfDoc);
  const coActionsMap = buildCOActionsMap(pdfDoc);
  const extractedFields = [];

  form.getFields().forEach((field) => {
    const fieldName = field.getName();
    const fieldType = field.constructor.name;

    if (isSystemField(fieldName)) return;

    const widgets = field.acroField.getWidgets();

    widgets.forEach((widget, widgetIdx) => {
      const rect = widget.getRectangle();
      const pageIndex = annotDictToPageIndex.get(widget.dict) ?? 0;

      if (rect.width <= 0 || rect.height <= 0) return;

      let readOnly = false;
      let required = false;
      try {
        if (typeof field.isReadOnly === "function")
          readOnly = field.isReadOnly();
        if (typeof field.isRequired === "function")
          required = field.isRequired();
      } catch (e) {
        console.debug("Could not read field flags:", e);
      }

      const typeData = extractTypeSpecificData(field, fieldType, widgetIdx);

      if (coActionsMap.has(fieldName)) {
        const coActions = coActionsMap.get(fieldName);
        const existingActions = typeData.jsActions || createEmptyActions();
        typeData.jsActions = mergeJSActions(existingActions, coActions);
      }

      const fieldData = {
        name: fieldName,
        type: fieldType,
        page: pageIndex,
        widgetIndex: widgetIdx,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        readOnly,
        required,
        ...typeData,
      };

      extractedFields.push(fieldData);
    });
  });

  return promoteCheckboxGroupsToRadio(extractedFields);
}

function promoteCheckboxGroupsToRadio(fields) {
  const checkboxCountByName = {};
  for (const f of fields) {
    if (f.type === "PDFCheckBox") {
      checkboxCountByName[f.name] = (checkboxCountByName[f.name] || 0) + 1;
    }
  }

  return fields.map((f) => {
    if (f.type === "PDFCheckBox" && checkboxCountByName[f.name] > 1) {
      return {
        ...f,
        type: "PDFRadioGroup",
        buttonValue: f.buttonValue || `option_${f.widgetIndex}`,
      };
    }
    return f;
  });
}

module.exports = { buildAnnotPageMap, extractFieldsFromDocument };

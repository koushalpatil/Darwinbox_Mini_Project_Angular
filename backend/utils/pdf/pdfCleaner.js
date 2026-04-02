const { PDFDocument } = require("pdf-lib");

async function createCleanedPdf(arrayBuffer) {
  const cleanPdfDoc = await PDFDocument.load(Buffer.from(arrayBuffer));
  const cleanForm = cleanPdfDoc.getForm();

  cleanForm.getFields().forEach((field) => {
    const fieldType = field.constructor.name;

    try {
      if (fieldType === "PDFTextField") {
        field.setText("");
      } else if (fieldType === "PDFCheckBox") {
        field.uncheck();
      } else if (fieldType === "PDFRadioGroup") {
        try {
          field.clear();
        } catch (e) {}
      } else if (fieldType === "PDFDropdown" || fieldType === "PDFOptionList") {
        try {
          field.clear();
        } catch (e) {
          try {
            field.select("");
          } catch (e2) {}
        }
      }
    } catch (e) {
      console.warn(`Could not clear field: ${field.getName()}`, e);
    }
  });

  const cleanedBytes = await cleanPdfDoc.save();
  return Buffer.from(cleanedBytes);
}

module.exports = { createCleanedPdf };

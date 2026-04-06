const { PDFDocument } = require("pdf-lib");

async function fillPdf(pdfBuffer, fieldValues) {
  const pdfDoc = await PDFDocument.load(Buffer.from(pdfBuffer));
  const form = pdfDoc.getForm();

  for (const [fieldName, value] of Object.entries(fieldValues)) {
    let field;
    try {
      field = form.getField(fieldName);
    } catch (e) {
      console.warn(`Field "${fieldName}" not found in PDF, skipping.`);
      continue;
    }

    const fieldType = field.constructor.name;

    try {
      switch (fieldType) {
        case "PDFTextField":
          field.setText(value != null ? String(value) : "");
          break;

        case "PDFCheckBox":
          if (value === true || value === "true" || value === "Yes") {
            field.check();
          } else {
            field.uncheck();
          }
          break;

        case "PDFRadioGroup":
          if (value != null && value !== "") {
            field.select(String(value));
          }
          break;

        case "PDFDropdown":
        case "PDFOptionList":
          if (value != null && value !== "") {
            field.select(String(value));
          }
          break;

        default:
          console.warn(
            `Unsupported field type "${fieldType}" for "${fieldName}", skipping.`,
          );
      }
    } catch (e) {
      console.warn(`Failed to set field "${fieldName}" (${fieldType}):`, e);
    }
  }

  form.flatten();

  const filledBytes = await pdfDoc.save();
  return Buffer.from(filledBytes);
}

module.exports = { fillPdf };

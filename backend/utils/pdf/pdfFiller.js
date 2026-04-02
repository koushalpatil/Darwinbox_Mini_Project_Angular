const { PDFDocument } = require("pdf-lib");

async function fillPdfFields(pdfBuffer, formData) {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();

  for (const [fieldName, value] of Object.entries(formData)) {
    try {
      const field = form.getField(fieldName);
      const fieldType = field.constructor.name;

      switch (fieldType) {
        case "PDFTextField":
          field.setText(value != null ? String(value) : "");
          break;

        case "PDFCheckBox":
          value ? field.check() : field.uncheck();
          break;

        case "PDFDropdown":
        case "PDFOptionList":
          if (value != null && String(value).length > 0) {
            field.select(String(value));
          }
          break;

        case "PDFRadioGroup":
          if (value != null && String(value).length > 0) {
            field.select(String(value));
          }
          break;

        default:
          console.warn(
            `fillPdfFields: unsupported field type "${fieldType}" for "${fieldName}"`,
          );
      }
    } catch (err) {
      console.warn(`fillPdfFields: skipping "${fieldName}":`, err.message);
    }
  }

  form.flatten();

  const filledPdfBytes = await pdfDoc.save();
  return Buffer.from(filledPdfBytes);
}

module.exports = { fillPdfFields };

const { PDFDocument } = require("pdf-lib");

async function fetchImageBytes(value) {
  if (value.startsWith("data:image")) {
    const base64Part = value.split(",")[1];
    if (base64Part) return Buffer.from(base64Part, "base64");
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    const response = await fetch(value);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (value.length > 20) {
    return Buffer.from(value, "base64");
  }

  return null;
}

async function fillPdf(pdfBuffer, fieldValues, signatureFields = []) {
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

  for (const sig of signatureFields) {
    try {
      console.log(
        `Processing signature "${sig.name}" — fetching image from: ${sig.value.substring(0, 80)}...`,
      );
      const imgBytes = await fetchImageBytes(sig.value);

      if (!imgBytes || imgBytes.length === 0) {
        console.warn(`No image data for signature "${sig.name}", skipping.`);
        continue;
      }

      let embeddedImage;
      if (imgBytes[0] === 0x89 && imgBytes[1] === 0x50) {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      } else if (imgBytes[0] === 0xff && imgBytes[1] === 0xd8) {
        embeddedImage = await pdfDoc.embedJpg(imgBytes);
      } else {
        embeddedImage = await pdfDoc.embedPng(imgBytes);
      }

      const page = pdfDoc.getPage(sig.page);

      try {
        const sigField = form.getField(sig.name);
        form.removeField(sigField);
      } catch (e) {}

      page.drawImage(embeddedImage, {
        x: sig.x,
        y: sig.y,
        width: sig.width,
        height: sig.height,
      });

      console.log(
        `Embedded signature "${sig.name}" on page ${sig.page} at (${sig.x}, ${sig.y}) — ${sig.width}x${sig.height}`,
      );
    } catch (e) {
      console.warn(`Failed to embed signature "${sig.name}":`, e);
    }
  }

  form.flatten();

  const filledBytes = await pdfDoc.save();
  return Buffer.from(filledBytes);
}

module.exports = { fillPdf };

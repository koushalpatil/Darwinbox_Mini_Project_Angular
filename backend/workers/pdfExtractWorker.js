const { parentPort } = require("worker_threads");
const { PDFDocument } = require("pdf-lib");
const { extractFieldsFromDocument } = require("../utils/pdf/fieldExtractor");
const { createCleanedPdf } = require("../utils/pdf/pdfCleaner");
const { extractAllDocumentJS } = require("../utils/js-actions/masterExtractor");

parentPort.on("message", async (data) => {
  try {
    const { pdfBuffer } = data;
    const buffer = Buffer.from(pdfBuffer);

    const pdfDoc = await PDFDocument.load(buffer);

    const documentJS = extractAllDocumentJS(pdfDoc);

    const fields = extractFieldsFromDocument(pdfDoc);

    const cleanedPdfBuffer = await createCleanedPdf(buffer);

    parentPort.postMessage({
      fields,
      documentJS,
      cleanedPdfBase64: cleanedPdfBuffer.toString("base64"),
    });
  } catch (err) {
    parentPort.postMessage({
      error: err.message || "Worker extraction failed",
    });
  }
});

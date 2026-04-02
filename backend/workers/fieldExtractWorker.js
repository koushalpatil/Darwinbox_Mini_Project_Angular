const { parentPort } = require("worker_threads");
const { PDFDocument } = require("pdf-lib");
const { extractFieldsFromDocument } = require("../utils/pdf/fieldExtractor");

parentPort.on("message", async (data) => {
  try {
    const buffer = Buffer.from(data.pdfBuffer);
    const pdfDoc = await PDFDocument.load(buffer);
    const fields = extractFieldsFromDocument(pdfDoc);
    parentPort.postMessage({ fields });
  } catch (err) {
    parentPort.postMessage({ error: err.message || "Field extraction failed" });
  }
});

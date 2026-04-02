const { parentPort } = require("worker_threads");
const { PDFDocument } = require("pdf-lib");
const { extractAllDocumentJS } = require("../utils/js-actions/masterExtractor");

parentPort.on("message", async (data) => {
  try {
    const buffer = Buffer.from(data.pdfBuffer);
    const pdfDoc = await PDFDocument.load(buffer);
    const documentJS = extractAllDocumentJS(pdfDoc);
    parentPort.postMessage({ documentJS });
  } catch (err) {
    parentPort.postMessage({ error: err.message || "JS extraction failed" });
  }
});

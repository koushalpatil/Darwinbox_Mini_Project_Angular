const { parentPort } = require("worker_threads");
const { createCleanedPdf } = require("../utils/pdf/pdfCleaner");

parentPort.on("message", async (data) => {
  try {
    const buffer = Buffer.from(data.pdfBuffer);
    const cleanedBuffer = await createCleanedPdf(buffer);
    parentPort.postMessage({
      cleanedPdfBase64: cleanedBuffer.toString("base64"),
    });
  } catch (err) {
    parentPort.postMessage({ error: err.message || "PDF cleaning failed" });
  }
});

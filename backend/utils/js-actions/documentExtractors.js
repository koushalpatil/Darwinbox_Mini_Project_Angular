const { PDFName, PDFArray } = require("pdf-lib");
const { resolveLookup } = require("./helpers");
const { extractJSFromAction, extractAllJSActions } = require("./extractors");

function walkNameTree(node, context) {
  const results = [];
  if (!node) return results;

  const dict = resolveLookup(node, context);
  if (!dict || typeof dict.get !== "function") return results;

  const namesArr = dict.get(PDFName.of("Names"));
  if (namesArr) {
    const resolved = resolveLookup(namesArr, context);
    const arr =
      resolved instanceof PDFArray
        ? resolved
        : namesArr instanceof PDFArray
          ? namesArr
          : null;
    if (arr) {
      const items = arr.asArray ? arr.asArray() : [];
      for (let i = 0; i < items.length - 1; i += 2) {
        const nameObj = items[i];
        const valueObj = items[i + 1];
        const name =
          typeof nameObj?.decodeText === "function"
            ? nameObj.decodeText()
            : typeof nameObj?.asString === "function"
              ? nameObj.asString()
              : String(nameObj ?? "");

        const actionDict = resolveLookup(valueObj, context);
        const jsArr = extractJSFromAction(actionDict, context);
        for (const js of jsArr) {
          results.push({ name, js });
        }
      }
    }
  }

  const kidsArr = dict.get(PDFName.of("Kids"));
  if (kidsArr) {
    const resolved = resolveLookup(kidsArr, context);
    const arr =
      resolved instanceof PDFArray
        ? resolved
        : kidsArr instanceof PDFArray
          ? kidsArr
          : null;
    if (arr) {
      const kids = arr.asArray ? arr.asArray() : [];
      for (const kid of kids) {
        results.push(...walkNameTree(kid, context));
      }
    }
  }

  return results;
}

function extractDocumentLevelJS(pdfDoc) {
  const results = [];
  try {
    const context = pdfDoc.context;
    const catalog = context.lookup(context.trailerInfo.Root);
    if (!catalog || typeof catalog.get !== "function") return results;

    const names = resolveLookup(catalog.get(PDFName.of("Names")), context);
    if (!names || typeof names.get !== "function") return results;

    const jsNameTree = names.get(PDFName.of("JavaScript"));
    const entries = walkNameTree(jsNameTree, context);

    for (const entry of entries) {
      results.push({
        location: "DocumentLevel",
        name: entry.name,
        js: entry.js,
      });
    }
  } catch (e) {
    console.debug("extractDocumentLevelJS failed:", e);
  }
  return results;
}

function extractPageLevelJS(pdfDoc) {
  const results = [];
  try {
    const context = pdfDoc.context;
    const pages = pdfDoc.getPages();
    const pageAAKeys = ["O", "C"];

    pages.forEach((page, pageIndex) => {
      const pageDict = page.node;
      if (!pageDict || typeof pageDict.get !== "function") return;

      let aaEntry = resolveLookup(pageDict.get(PDFName.of("AA")), context);
      if (aaEntry && typeof aaEntry.get === "function") {
        for (const key of pageAAKeys) {
          const actionDict = resolveLookup(
            aaEntry.get(PDFName.of(key)),
            context,
          );
          const jsArr = extractJSFromAction(actionDict, context);
          for (const js of jsArr) {
            results.push({
              location: "PageLevel",
              page: pageIndex,
              trigger: key === "O" ? "PageOpen" : "PageClose",
              js,
            });
          }
        }
      }
    });
  } catch (e) {
    console.debug("extractPageLevelJS failed:", e);
  }
  return results;
}

function extractOpenActionJS(pdfDoc) {
  const results = [];
  try {
    const context = pdfDoc.context;
    const catalog = context.lookup(context.trailerInfo.Root);
    if (!catalog || typeof catalog.get !== "function") return results;

    const openAction = resolveLookup(
      catalog.get(PDFName.of("OpenAction")),
      context,
    );
    if (!openAction) return results;
    if (openAction instanceof PDFArray) return results;

    const jsArr = extractJSFromAction(openAction, context);
    for (const js of jsArr) {
      results.push({ location: "OpenAction", js });
    }
  } catch (e) {
    console.debug("extractOpenActionJS failed:", e);
  }
  return results;
}

function extractCalculationOrderJS(pdfDoc) {
  const results = [];
  try {
    const context = pdfDoc.context;
    const catalog = context.lookup(context.trailerInfo.Root);
    if (!catalog || typeof catalog.get !== "function") return results;

    const acroForm = resolveLookup(
      catalog.get(PDFName.of("AcroForm")),
      context,
    );
    if (!acroForm || typeof acroForm.get !== "function") return results;

    const coArray = acroForm.get(PDFName.of("CO"));
    if (!coArray) return results;

    const resolved = resolveLookup(coArray, context);
    const arr =
      resolved instanceof PDFArray
        ? resolved
        : coArray instanceof PDFArray
          ? coArray
          : null;
    if (!arr) return results;

    const items = arr.asArray ? arr.asArray() : [];
    items.forEach((ref, idx) => {
      const fieldDict = resolveLookup(ref, context);
      if (!fieldDict || typeof fieldDict.get !== "function") return;

      const tEntry = fieldDict.get(PDFName.of("T"));
      const fieldName = tEntry
        ? typeof tEntry.decodeText === "function"
          ? tEntry.decodeText()
          : typeof tEntry.asString === "function"
            ? tEntry.asString()
            : String(tEntry)
        : `co_field_${idx}`;

      const actions = extractAllJSActions(fieldDict, context);
      const hasAnyJS = Object.values(actions).some((v) =>
        Array.isArray(v) ? v.length > 0 : !!v,
      );

      if (hasAnyJS) {
        results.push({
          location: "CalculationOrder",
          index: idx,
          fieldName,
          actions,
        });
      }
    });
  } catch (e) {
    console.debug("extractCalculationOrderJS failed:", e);
  }
  return results;
}

module.exports = {
  extractDocumentLevelJS,
  extractPageLevelJS,
  extractOpenActionJS,
  extractCalculationOrderJS,
};

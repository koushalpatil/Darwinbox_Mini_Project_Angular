import { PDFName, PDFString, PDFNumber, PDFHexString, PDFDocument } from 'pdf-lib';

const ANNOTATION_SUBTYPE_MAP: Record<string, string> = {
  Text: 'Text',
  FreeText: 'FreeText',
  Line: 'Line',
  Square: 'Square',
  Circle: 'Circle',
  Polygon: 'Polygon',
  PolyLine: 'PolyLine',
  Highlight: 'Highlight',
  Underline: 'Underline',
  Squiggly: 'Squiggly',
  StrikeOut: 'StrikeOut',
  Stamp: 'Stamp',
  Caret: 'Caret',
  Ink: 'Ink',
  FileAttachment: 'FileAttachment',
  Sound: 'Sound',
  Redact: 'Redact',
};

function generateAnnotationId(): string {
  const hex = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `annot-${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

function buildAnnotFlags(opts: any): number {
  let flags = 0;
  if (opts.hidden) flags |= 2;
  if (opts.printable !== false) flags |= 4;
  if (opts.readOnly) flags |= 64;
  if (opts.locked) flags |= 128;
  return flags;
}

function colorToArray(context: any, rgb: number[]) {
  return context.obj(rgb.map((c: number) => PDFNumber.of(c)));
}

export function addAnnotation(pdfDoc: PDFDocument, options: any): { id: string } {
  if (options.page == null) throw new Error('addAnnotation: `page` is required');
  if (!options.type) throw new Error('addAnnotation: `type` is required');
  if (!options.rect) throw new Error('addAnnotation: `rect` is required');

  const subtype = ANNOTATION_SUBTYPE_MAP[options.type];
  if (!subtype) {
    throw new Error(
      `addAnnotation: unsupported annotation type "${options.type}". ` +
        `Supported: ${Object.keys(ANNOTATION_SUBTYPE_MAP).join(', ')}`,
    );
  }

  const pages = pdfDoc.getPages();
  if (options.page < 0 || options.page >= pages.length) {
    throw new Error(
      `addAnnotation: page index ${options.page} is out of range (0–${pages.length - 1})`,
    );
  }

  const page = pages[options.page];
  const context = pdfDoc.context;
  const id = options.id || generateAnnotationId();

  const { x, y, width, height } = options.rect;

  const annotDict = context.obj({
    Type: 'Annot',
    Subtype: subtype,
    Rect: [x, y, x + width, y + height],
    NM: PDFHexString.fromText(id),
    M: PDFString.of(new Date().toISOString()),
    F: PDFNumber.of(buildAnnotFlags(options)),
  });

  if (options.contents != null) {
    annotDict.set(PDFName.of('Contents'), PDFHexString.fromText(options.contents));
  }
  if (options.author) {
    annotDict.set(PDFName.of('T'), PDFHexString.fromText(options.author));
  }
  if (options.subject) {
    annotDict.set(PDFName.of('Subj'), PDFHexString.fromText(options.subject));
  }
  if (options.color) {
    annotDict.set(PDFName.of('C'), colorToArray(context, options.color));
  }
  if (options.opacity != null) {
    annotDict.set(PDFName.of('CA'), PDFNumber.of(options.opacity));
  }
  if (options.rotation != null) {
    annotDict.set(PDFName.of('Rotate'), PDFNumber.of(options.rotation));
  }

  if (options.borderWidth != null || options.borderColor) {
    const bsEntries: any = {};
    bsEntries.Type = 'Border';
    bsEntries.W = options.borderWidth ?? 1;
    bsEntries.S = 'S';
    annotDict.set(PDFName.of('BS'), context.obj(bsEntries));
  }
  if (options.borderColor) {
    annotDict.set(PDFName.of('IC'), colorToArray(context, options.borderColor));
  }

  if (options.customData && Object.keys(options.customData).length > 0) {
    annotDict.set(
      PDFName.of('CustomData'),
      PDFHexString.fromText(JSON.stringify(options.customData)),
    );
  }

  const annotRef = context.register(annotDict);

  const existingAnnots = (page.node as any).Annots();
  if (existingAnnots) {
    existingAnnots.push(annotRef);
  } else {
    const newAnnotsArray = context.obj([annotRef]);
    page.node.set(PDFName.of('Annots'), newAnnotsArray);
  }

  return { id };
}

export function removeAnnotation(
  pdfDoc: PDFDocument,
  options: { id: string },
): { removed: boolean; page?: number } {
  if (!options?.id) {
    throw new Error('removeAnnotation: `id` is required');
  }

  const targetId = options.id;
  const pages = pdfDoc.getPages();
  const context = pdfDoc.context;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const annotsArray = (page.node as any).Annots();
    if (!annotsArray) continue;

    const refs = annotsArray.asArray();

    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      let dict: any;
      try {
        dict = context.lookup(ref);
      } catch {
        continue;
      }
      if (!dict) continue;

      const nmEntry = dict.get(PDFName.of('NM'));
      if (!nmEntry) continue;

      let nm = '';
      if (nmEntry instanceof PDFHexString) {
        nm = nmEntry.decodeText();
      } else if (nmEntry instanceof PDFString) {
        nm = nmEntry.decodeText();
      } else {
        nm = nmEntry.toString();
      }

      if (nm === targetId) {
        annotsArray.remove(i);

        if (annotsArray.size() === 0) {
          page.node.delete(PDFName.of('Annots'));
        }

        return { removed: true, page: pageIndex };
      }
    }
  }

  return { removed: false };
}

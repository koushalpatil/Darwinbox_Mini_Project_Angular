/* ── PDF.models — Shared type definitions ── */

/** Metadata returned by the upload API + the raw bytes for rendering. */
export interface PdfFileData {
  name: string;
  size: number;
  type: string;
  arrayBuffer: ArrayBuffer;
  uploadedAt: string;
  s3Key: string;
}

/** A single field extracted from the PDF (backend response). */
export interface PdfField {
  name: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: any;
  readOnly?: boolean;
  required?: boolean;
  options?: PdfFieldOption[];
  maxLen?: number;
  subType?: string;
  dateFormat?: string;
  buttonValue?: string;
  widgetIndex?: number;
  jsActions?: JsActions;
}

export interface PdfFieldOption {
  displayValue: string;
  exportValue?: string;
}

/** JS action scripts keyed by Acrobat trigger codes. */
export interface JsActions {
  /** Calculate */ C?: string | string[];
  /** Keystroke */ K?: string | string[];
  /** Format */ F?: string | string[];
  /** Validate */ V?: string | string[];
  /** Focus */ Fo?: string | string[];
  /** Blur */ Bl?: string | string[];
  /** Mouse Enter */ E?: string | string[];
  /** Mouse Exit */ X?: string | string[];
  /** Mouse Down */ D?: string | string[];
  /** Mouse Up */ U?: string | string[];
  /** Action */ A?: string | string[];
  [key: string]: string | string[] | undefined;
}

/** Per-field runtime overrides (readOnly / required set via JS). */
export interface FieldOverrides {
  [fieldName: string]: {
    readOnly?: boolean;
    required?: boolean;
  };
}

/** Rendered page data produced by PdfRendererService. */
export interface PdfPageData {
  pageNum: number;
  pdfPage: any; // pdfjs-dist PDFPageProxy
  viewport: any; // pdfjs-dist PageViewport
  width: number;
  height: number;
  fields: PdfField[];
}

/** Upload pipeline stages shown in the upload-zone stepper. */
export type UploadStage =
  | 'uploading_to_s3'
  | 'retrieving_from_s3'
  | 'extracting_fields'
  | 'completed'
  | 'done'
  | null;

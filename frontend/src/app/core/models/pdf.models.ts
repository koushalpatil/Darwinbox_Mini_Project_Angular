export interface PdfFileData {
  name: string;
  size: number;
  type: string;
  arrayBuffer: ArrayBuffer;
  uploadedAt: string;
  s3Key: string;
}

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

export interface JsActions {
  C?: string | string[];
  K?: string | string[];
  F?: string | string[];
  V?: string | string[];
  Fo?: string | string[];
  Bl?: string | string[];
  E?: string | string[];
  X?: string | string[];
  D?: string | string[];
  U?: string | string[];
  A?: string | string[];
  [key: string]: string | string[] | undefined;
}

export interface FieldOverrides {
  [fieldName: string]: {
    readOnly?: boolean;
    required?: boolean;
  };
}

export interface PdfPageData {
  pageNum: number;
  pdfPage: any;
  viewport: any;
  width: number;
  height: number;
  fields: PdfField[];
}

export type UploadStage =
  | 'uploading_to_s3'
  | 'retrieving_from_s3'
  | 'extracting_fields'
  | 'completed'
  | 'done'
  | null;

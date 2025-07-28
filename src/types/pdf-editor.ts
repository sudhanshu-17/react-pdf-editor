export interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  pageNumber: number;
}

export interface SignatureElement {
  id: string;
  imageData: string; // Base64 PNG data
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // Rotation angle in degrees
  color: string; // Signature drawing color
  pageNumber: number;
  timestamp: number;
  opacity: number; // Signature opacity (0-1)
}

export interface SavedSignature {
  id: string;
  name: string;
  imageData: string; // Base64 PNG data
  width: number;
  height: number;
  color: string;
  timestamp: number;
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'checkbox' | 'radio' | 'select' | 'button';
  value: string | boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  fieldName: string; // Original PDF field name
  options?: string[]; // For select/radio fields
}

export interface FormFieldData {
  [fieldName: string]: string | boolean;
}

export interface PDFDocument {
  file: File;
  name: string;
  numPages: number;
  textElements: TextElement[];
  signatureElements: SignatureElement[];
  formFields: FormField[];
  formData: FormFieldData;
}

export interface ToolbarState {
  selectedTool: 'select' | 'text' | 'signature';
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  signatureCanvasWidth: number;
  signatureCanvasHeight: number;
  signatureColor: string; // Color for signature drawing
}

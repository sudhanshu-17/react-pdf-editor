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

export interface PDFDocument {
  file: File;
  name: string;
  numPages: number;
  textElements: TextElement[];
}

export interface ToolbarState {
  selectedTool: 'select' | 'text';
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}
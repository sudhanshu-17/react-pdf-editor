declare module 'jspdf' {
  interface jsPDFOptions {
    orientation?: 'portrait' | 'landscape';
    unit?: 'pt' | 'mm' | 'cm' | 'in';
    format?: string | [number, number];
  }

  class jsPDF {
    constructor(options?: jsPDFOptions);
    addImage(
      imageData: string | HTMLImageElement | HTMLCanvasElement,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number
    ): jsPDF;
    setFontSize(size: number): jsPDF;
    setTextColor(color: string): jsPDF;
    setFont(fontName: string, fontStyle?: string): jsPDF;
    text(text: string, x: number, y: number): jsPDF;
    save(filename: string): void;
  }

  export default jsPDF;
} 
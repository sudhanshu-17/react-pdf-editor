import { PDFDocument as PDFLibDocument, rgb, StandardFonts, PDFForm, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFButton, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { PDFDocument, TextElement, SignatureElement, FormFieldData } from '@/types/pdf-editor';
// For toast notifications
let showToast: ((msg: string) => void) | null = null;
export const setPDFLibExportToast = (fn: (msg: string) => void) => { showToast = fn; };

export const exportPDFWithFormData = async (
  document: PDFDocument,
  formData: FormFieldData,
  filename: string = 'edited-pdf',
  formFields?: import('@/types/pdf-editor').FormField[]
): Promise<Blob> => {
  try {
    const originalPdfBytes = await document.file.arrayBuffer();
    
    const pdfDoc = await PDFLibDocument.load(originalPdfBytes);
    
    const form = pdfDoc.getForm();
    
    const pdfFields = form.getFields();
    const pdfFieldNames = pdfFields.map(f => f.getName());
    console.log('DEBUG: PDF-lib field names:', pdfFieldNames);
    console.log('DEBUG: formData keys:', Object.keys(formData));
    if (showToast) {
      showToast('PDF fields: ' + pdfFieldNames.join(', '));
      showToast('Form data keys: ' + Object.keys(formData).join(', '));
    }
    const overlap = pdfFieldNames.filter(name => Object.keys(formData).includes(name));
    if (overlap.length === 0 && showToast) {
      showToast('WARNING: No matching field names between PDF and form data!');
    }

    await fillFormFieldsFuzzy(form, formData);

    form.flatten();

    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    if (formFields && formFields.length > 0) {
      const pdfContainer = typeof window !== 'undefined' ? window.document.querySelector('.react-pdf__Document') : null;
      const pdfPageElement = pdfContainer ? pdfContainer.querySelector('.react-pdf__Page') : null;
      const originalCanvas = pdfPageElement ? pdfPageElement.querySelector('canvas') as HTMLCanvasElement : null;
      
      formFields.forEach(field => {
        try {
          if (field.type === 'button' || !field.value) return;
          
          const pageIndex = (field.pageNumber || 1) - 1;
          if (pageIndex < 0 || pageIndex >= pages.length) return;
          
          const page = pages[pageIndex];
          const { width: pageWidth, height: pageHeight } = page.getSize();
          
          let x, y, fontSize, maxWidth;
          
          if (originalCanvas && pdfPageElement) {
            try {
              const pdfRect = originalCanvas.getBoundingClientRect();
              const pageRect = pdfPageElement.getBoundingClientRect();
              
              const relX = field.x / pageRect.width;
              const relY = field.y / pageRect.height;
              const relW = field.width / pageRect.width;
              const relH = field.height / pageRect.height;
              
              x = relX * pageWidth;
              y = pageHeight - (relY * pageHeight) - (relH * pageHeight * 0.75);
              fontSize = Math.max(8, Math.min(relH * pageHeight * 0.5, 12));
              maxWidth = Math.max(50, relW * pageWidth - 4);
              
            } catch (conversionError) {
              x = field.x;
              y = pageHeight - field.y - field.height * 0.75;
              fontSize = Math.max(8, Math.min(field.height * 0.5, 12));
              maxWidth = Math.max(50, field.width - 4);
            }
          } else {
            x = field.x;
            y = pageHeight - field.y - field.height * 0.75;
            fontSize = Math.max(8, Math.min(field.height * 0.5, 12));
            maxWidth = Math.max(50, field.width - 4);
          }
          
          const textValue = String(field.value);
          const lines = textValue.split('\n');
          
          lines.forEach((line, lineIndex) => {
            const lineY = y - (lineIndex * fontSize * 1.2);
            if (lineY > fontSize) {
              page.drawText(line, {
                x: x + 2,
                y: lineY,
                size: fontSize,
                font: helveticaFont,
                color: rgb(0, 0, 0),
                maxWidth: maxWidth,
              });
            }
          });
        } catch (fieldError) {
          console.error('Error drawing field:', field, fieldError);
        }
      });
    }

    await addCustomElements(pdfDoc, document.textElements, document.signatureElements);

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    
    saveAs(pdfBlob, `${filename}.pdf`);
    
    return pdfBlob;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
};

// Fuzzy fill: try to match by name, then by case-insensitive, then by partial match
const fillFormFieldsFuzzy = async (form: PDFForm, formData: FormFieldData): Promise<void> => {
  const fields = form.getFields();
  const dataKeys = Object.keys(formData);
  for (const field of fields) {
    let fieldName = field.getName();
    let fieldValue = formData[fieldName];
    // Try case-insensitive match
    if (fieldValue === undefined) {
      const ciKey = dataKeys.find(k => k.toLowerCase() === fieldName.toLowerCase());
      if (ciKey) fieldValue = formData[ciKey];
    }
    // Try partial match
    if (fieldValue === undefined) {
      const partialKey = dataKeys.find(k => fieldName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(fieldName.toLowerCase()));
      if (partialKey) fieldValue = formData[partialKey];
    }
    if (fieldValue === undefined || fieldValue === null) continue;
    try {
      if (field.constructor.name === 'PDFTextField') {
        const textField = field as PDFTextField;
        textField.setText(String(fieldValue));
      } else if (field.constructor.name === 'PDFCheckBox') {
        const checkBox = field as PDFCheckBox;
        if (typeof fieldValue === 'boolean') {
          if (fieldValue) {
            checkBox.check();
          } else {
            checkBox.uncheck();
          }
        }
      } else if (field.constructor.name === 'PDFRadioGroup') {
        const radioGroup = field as PDFRadioGroup;
        if (typeof fieldValue === 'string' && fieldValue) {
          radioGroup.select(fieldValue);
        }
      } else if (field.constructor.name === 'PDFDropdown') {
        const dropdown = field as PDFDropdown;
        if (typeof fieldValue === 'string' && fieldValue) {
          dropdown.select(fieldValue);
        }
      }
    } catch (fieldError) {
      console.warn(`Error filling field ${fieldName}:`, fieldError);
    }
  }
};

const addCustomElements = async (
  pdfDoc: PDFLibDocument,
  textElements: TextElement[],
  signatureElements: SignatureElement[]
): Promise<void> => {
  const pages = pdfDoc.getPages();
  
  // Add text elements - BACK TO ORIGINAL WORKING VERSION
  for (const textElement of textElements) {
    const pageIndex = textElement.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    try {
      // Convert coordinates (PDF-lib uses bottom-left origin) - ORIGINAL WORKING CODE
      const x = textElement.x;
      const y = pageHeight - textElement.y - textElement.fontSize;
      
      // Get font
      let font;
      try {
        if (textElement.fontFamily.toLowerCase().includes('times')) {
          font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        } else if (textElement.fontFamily.toLowerCase().includes('courier')) {
          font = await pdfDoc.embedFont(StandardFonts.Courier);
        } else {
          font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }
      } catch {
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
      
      // Parse color
      const color = parseColor(textElement.color);
      
      // Draw text
      page.drawText(textElement.content, {
        x,
        y,
        size: textElement.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
      });
      
    } catch (error) {
      console.warn(`Error adding text element:`, error);
    }
  }
  
  // Add signature elements - BACK TO ORIGINAL WORKING VERSION
  for (const signatureElement of signatureElements) {
    const pageIndex = signatureElement.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();
    
    try {
      // Convert base64 image to bytes
      const imageBytes = base64ToBytes(signatureElement.imageData);
      
      // Embed image
      let image;
      try {
        image = await pdfDoc.embedPng(imageBytes);
      } catch {
        // Fallback to JPEG if PNG fails
        try {
          image = await pdfDoc.embedJpg(imageBytes);
        } catch {
          console.warn('Failed to embed signature image');
          continue;
        }
      }
      
      // Convert coordinates (PDF-lib uses bottom-left origin) - Original + small downward adjustment
      const x = signatureElement.x;
      const y = pageHeight - signatureElement.y - signatureElement.height - 20;
      
      // Draw image
      page.drawImage(image, {
        x,
        y,
        width: signatureElement.width,
        height: signatureElement.height,
        opacity: signatureElement.opacity,
        rotate: signatureElement.rotation ? degrees(signatureElement.rotation) : undefined,
      });
      
    } catch (error) {
      console.warn(`Error adding signature element:`, error);
    }
  }
};

const parseColor = (colorString: string): { r: number; g: number; b: number } => {
  // Remove # if present
  const hex = colorString.replace('#', '');
  
  // Parse hex color
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  return { r, g, b };
};

const base64ToBytes = (base64: string): Uint8Array => {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // Convert base64 to binary string
  const binaryString = atob(base64Data);
  
  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
};

// Export form data as JSON for debugging
export const exportFormDataAsJSON = (
  formData: FormFieldData,
  filename: string = 'form-data'
): void => {
  try {
    const jsonData = {
      formData,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json'
    });

    saveAs(blob, `${filename}.json`);
  } catch (error) {
    throw new Error('Failed to export form data as JSON');
  }
};

// Create a flattened PDF (non-editable form)
export const exportFlattenedPDF = async (
  document: PDFDocument,
  formData: FormFieldData,
  filename: string = 'flattened-pdf'
): Promise<void> => {
  try {
    // Read the original PDF file
    const originalPdfBytes = await document.file.arrayBuffer();
    
    // Load the PDF with PDF-lib
    const pdfDoc = await PDFLibDocument.load(originalPdfBytes);
    
    // Get the form from the PDF
    const form = pdfDoc.getForm();
    
    // Fill in the form fields with the captured data
    await fillFormFieldsFuzzy(form, formData);
    
    // Add custom text elements and signatures
    await addCustomElements(pdfDoc, document.textElements, document.signatureElements);
    
    // Flatten the form to make it non-editable
    form.flatten();
    
    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Download the PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    saveAs(blob, `${filename}.pdf`);
    
  } catch (error) {
    console.error('Error exporting flattened PDF:', error);
    throw new Error('Failed to export flattened PDF');
  }
};

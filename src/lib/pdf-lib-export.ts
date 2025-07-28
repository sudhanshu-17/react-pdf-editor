import { PDFDocument as PDFLibDocument, rgb, StandardFonts, PDFForm, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFButton, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { PDFDocument, TextElement, SignatureElement, FormFieldData } from '@/types/pdf-editor';
// For toast notifications
let showToast: ((msg: string) => void) | null = null;
export const setPDFLibExportToast = (fn: (msg: string) => void) => { showToast = fn; };

export const exportPDFWithFormData = async (
  document: PDFDocument,
  formData: FormFieldData,
  filename: string = 'edited-pdf'
): Promise<void> => {
  try {
    // Read the original PDF file
    const originalPdfBytes = await document.file.arrayBuffer();
    
    // Load the PDF with PDF-lib
    const pdfDoc = await PDFLibDocument.load(originalPdfBytes);
    
    // Get the form from the PDF
    const form = pdfDoc.getForm();
    
    // DEBUG: List all PDF field names
    const pdfFields = form.getFields();
    const pdfFieldNames = pdfFields.map(f => f.getName());
    console.log('DEBUG: PDF-lib field names:', pdfFieldNames);
    console.log('DEBUG: formData keys:', Object.keys(formData));
    if (showToast) {
      showToast('PDF fields: ' + pdfFieldNames.join(', '));
      showToast('Form data keys: ' + Object.keys(formData).join(', '));
    }
    // Warn if no overlap
    const overlap = pdfFieldNames.filter(name => Object.keys(formData).includes(name));
    if (overlap.length === 0 && showToast) {
      showToast('WARNING: No matching field names between PDF and form data!');
    }

    // Fill in the form fields with the captured data (with fuzzy fallback)
    await fillFormFieldsFuzzy(form, formData);

    // Always flatten the form so values are visible
    form.flatten();

    // Draw form field values as text overlays for extra reliability
    const pages = pdfDoc.getPages();
    if (document.formFields && document.formFields.length > 0) {
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      document.formFields.forEach(field => {
        // Only draw visible fields (skip buttons)
        if (field.type === 'button') return;
        // Find the page
        const pageIndex = (field.pageNumber || 1) - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) return;
        const page = pages[pageIndex];
        const { height: pageHeight } = page.getSize();
        // Calculate PDF coordinates (PDF-lib uses bottom-left origin)
        const x = field.x;
        const y = pageHeight - field.y - field.height / 2;
        // DEBUG: Draw a red rectangle at the field position
        page.drawRectangle({
          x: x,
          y: y - field.height / 2,
          width: field.width,
          height: field.height,
          color: rgb(1, 0, 0),
          opacity: 0.2,
          borderColor: rgb(1, 0, 0),
          borderWidth: 1,
        });
        // Draw the value as large red text
        page.drawText(String(field.value), {
          x: x + 2,
          y: y,
          size: Math.max(14, field.height * 0.7),
          font: helveticaFont,
          color: rgb(1, 0, 0),
        });
      });
    }
    
    // Add custom text elements and signatures
    await addCustomElements(pdfDoc, document.textElements, document.signatureElements);
    
    // Flatten the form to make it non-editable (optional)
    // form.flatten();
    
    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Download the PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    saveAs(blob, `${filename}.pdf`);
    
  } catch (error) {
    console.error('Error exporting PDF with form data:', error);
    if (showToast) showToast('ERROR: Failed to export PDF with form data');
    throw new Error('Failed to export PDF with form data');
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
  
  // Add text elements
  for (const textElement of textElements) {
    const pageIndex = textElement.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    try {
      // Convert coordinates (PDF-lib uses bottom-left origin)
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
  
  // Add signature elements
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
      
      // Convert coordinates (PDF-lib uses bottom-left origin)
      const x = signatureElement.x;
      const y = pageHeight - signatureElement.y - signatureElement.height;
      
      // Draw image
      page.drawImage(image, {
        x,
        y,
        width: signatureElement.width,
        height: signatureElement.height,
        opacity: signatureElement.opacity,
        rotate: signatureElement.rotation ? { angle: signatureElement.rotation } : undefined,
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
    await fillFormFields(form, formData);
    
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

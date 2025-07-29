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

        // Draw form field values as text overlays for GUARANTEED visibility
    // This ensures form fields are visible even if PDF-lib form filling fails
    const pages = pdfDoc.getPages();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Use formFields array if available (more reliable positioning), otherwise fallback to formData
    if (formFields && formFields.length > 0) {
      // Get viewport information for proper coordinate conversion (fixes mobile issues)
      const pdfContainer = typeof window !== 'undefined' ? window.document.querySelector('.react-pdf__Document') : null;
      const pdfPageElement = pdfContainer ? pdfContainer.querySelector('.react-pdf__Page') : null;
      const originalCanvas = pdfPageElement ? pdfPageElement.querySelector('canvas') as HTMLCanvasElement : null;
      
      // Use the reliable form fields array (same as image export)
      formFields.forEach(field => {
        try {
          // Only draw visible fields (skip buttons)
          if (field.type === 'button' || !field.value) return;
          
          // Get the page
          const pageIndex = (field.pageNumber || 1) - 1;
          if (pageIndex < 0 || pageIndex >= pages.length) return;
          
          const page = pages[pageIndex];
          const { width: pageWidth, height: pageHeight } = page.getSize();
          
          let x, y, fontSize, maxWidth;
          
          // If we have DOM elements available, use proper scaling conversion (fixes mobile)
          if (originalCanvas && pdfPageElement) {
            try {
              const pdfRect = originalCanvas.getBoundingClientRect();
              const pageRect = pdfPageElement.getBoundingClientRect();
              
              // Convert field position to relative coordinates (same as image export)
              const relX = field.x / pageRect.width;
              const relY = field.y / pageRect.height;
              const relW = field.width / pageRect.width;
              const relH = field.height / pageRect.height;
              
                             // Convert to PDF coordinates
               x = relX * pageWidth;
               y = pageHeight - (relY * pageHeight) - (relH * pageHeight * 0.75);
               fontSize = Math.max(8, Math.min(relH * pageHeight * 0.5, 12));
               maxWidth = Math.max(50, relW * pageWidth - 4);
              
                         } catch (conversionError) {
               // Fallback to direct coordinates if DOM conversion fails
               x = field.x;
               y = pageHeight - field.y - field.height * 0.75;
               fontSize = Math.max(8, Math.min(field.height * 0.5, 12));
               maxWidth = Math.max(50, field.width - 4);
             }
           } else {
             // Fallback for when DOM elements are not available
             x = field.x;
             y = pageHeight - field.y - field.height * 0.75;
             fontSize = Math.max(8, Math.min(field.height * 0.5, 12));
             maxWidth = Math.max(50, field.width - 4);
           }
          
          // Draw the field value
          page.drawText(String(field.value), {
            x: x + 2,
            y: y - fontSize * 0.2,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
            maxWidth: maxWidth,
          });
          
        } catch (fieldError) {
          console.warn(`Error drawing form field ${field.name}:`, fieldError);
        }
      });
    } else {
      // Fallback to formData with PDF field positioning
      Object.entries(formData).forEach(([fieldName, fieldValue]) => {
        if (!fieldValue || typeof fieldValue !== 'string') return;
        
        // Try to find corresponding PDF form field for positioning
        const pdfField = form.getFields().find(f => {
          const pdfFieldName = f.getName();
          return pdfFieldName === fieldName || 
                 pdfFieldName.toLowerCase() === fieldName.toLowerCase() ||
                 pdfFieldName.toLowerCase().includes(fieldName.toLowerCase()) ||
                 fieldName.toLowerCase().includes(pdfFieldName.toLowerCase());
        });
        
        if (pdfField) {
          try {
            const fieldWidgets = pdfField.acroField.getWidgets();
            if (fieldWidgets.length > 0) {
              const widget = fieldWidgets[0];
              const rect = widget.getRectangle();
              
              // Use first page as fallback (most forms are single page)
              const page = pages[0];
              
              // Calculate position (PDF-lib uses bottom-left origin)
              const x = rect.x;
              const y = rect.y;
              const fieldWidth = rect.width;
              const fieldHeight = rect.height;
              
                              // Calculate appropriate font size based on field height
                const fontSize = Math.max(8, Math.min(fieldHeight * 0.5, 12));
              
                              // Draw the field value with proper styling
                page.drawText(String(fieldValue), {
                  x: x + 2,
                  y: y + (fieldHeight - fontSize) * 0.75,
                  size: fontSize,
                  font: helveticaFont,
                  color: rgb(0, 0, 0),
                  maxWidth: Math.max(50, fieldWidth - 4),
                });
            }
          } catch (widgetError) {
            console.warn(`Error getting field position for ${fieldName}, using fallback`);
          }
        }
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

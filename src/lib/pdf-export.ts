import { saveAs } from 'file-saver';
import { PDFDocument, TextElement } from '@/types/pdf-editor';
import jsPDF from 'jspdf';

// Export the PDF viewer as an image (PNG)
export const exportAsImage = async (
  filename: string = 'edited-pdf'
): Promise<void> => {
  try {
    console.log('🎨 Starting image export...');
    
    // Wait for any pending renders
    await new Promise(resolve => setTimeout(resolve, 200));

    // Find the PDF viewer container
    const pdfContainer = document.querySelector('.react-pdf__Document');
    if (!pdfContainer) {
      throw new Error('PDF document container not found');
    }

    // Get the PDF page element
    const pdfPageElement = pdfContainer.querySelector('.react-pdf__Page');
    if (!pdfPageElement) {
      throw new Error('PDF page element not found');
    }

    // Get the original canvas from react-pdf
    const originalCanvas = pdfPageElement.querySelector('canvas') as HTMLCanvasElement;
    if (!originalCanvas) {
      throw new Error('PDF canvas not found');
    }

    console.log('📄 Found PDF canvas:', originalCanvas.width, 'x', originalCanvas.height);

    // Create a new canvas for export
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas dimensions to match the PDF
    exportCanvas.width = originalCanvas.width;
    exportCanvas.height = originalCanvas.height;

    // Draw the original PDF onto our export canvas
    ctx.drawImage(originalCanvas, 0, 0);

    // Get all text overlays
    const textOverlays = document.querySelectorAll('[data-text-overlay="true"]');
    console.log('📝 Found text overlays:', textOverlays.length);

    // Draw text overlays on top
    textOverlays.forEach((overlay, index) => {
      try {
        const element = overlay as HTMLElement;
        const rect = element.getBoundingClientRect();
        const pdfRect = originalCanvas.getBoundingClientRect();
        
        // Calculate relative position (accounting for scaling)
        const relativeX = (rect.left - pdfRect.left) / pdfRect.width;
        const relativeY = (rect.top - pdfRect.top) / pdfRect.height;
        
        const x = relativeX * exportCanvas.width;
        const y = relativeY * exportCanvas.height;
        
        // Get text content
        const textContent = element.textContent || element.innerText || '';
        if (!textContent) return;
        
        // Get computed style
        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseFloat(computedStyle.fontSize) * (exportCanvas.width / pdfRect.width);
        
        // Set text style
        ctx.font = `${computedStyle.fontWeight} ${fontSize}px ${computedStyle.fontFamily}`;
        ctx.fillStyle = computedStyle.color || '#000000';
        ctx.textBaseline = 'top';
        
        // Draw text
        ctx.fillText(textContent, x, y);
        
        console.log(`✏️ Drew text ${index + 1}: "${textContent}" at (${Math.round(x)}, ${Math.round(y)})`);
        
      } catch (overlayError) {
        console.warn('Failed to draw text overlay:', overlayError);
      }
    });

    // Convert canvas to blob and download
    exportCanvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `${filename}.png`);
        console.log('✅ Image export completed:', `${filename}.png`);
      } else {
        throw new Error('Failed to create image blob');
      }
    }, 'image/png', 0.95);

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
};

// Export PDF data with text overlay information as JSON
export const exportProjectData = (
  document: PDFDocument,
  filename: string = 'pdf-project'
): void => {
  try {
    const projectData = {
      filename: document.name,
      numPages: document.numPages,
      textElements: document.textElements,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json'
    });

    saveAs(blob, `${filename}.json`);
  } catch (error) {
    console.error('Project export failed:', error);
    throw error;
  }
};

// Real PDF export function using jsPDF
export const exportAsPDF = async (
  document: PDFDocument,
  filename: string = 'edited-pdf'
): Promise<void> => {
  try {
    console.log('📄 Starting REAL PDF export...');
    console.log('📋 Document:', document.name);
    console.log('📝 Text elements to export:', document.textElements.length);
    
    // Wait for any pending renders
    await new Promise(resolve => setTimeout(resolve, 200));

    // Find the PDF container and canvas
    const pdfContainer = window.document.querySelector('.react-pdf__Document');
    if (!pdfContainer) {
      throw new Error('PDF document container not found');
    }

    const pdfPageElement = pdfContainer.querySelector('.react-pdf__Page');
    if (!pdfPageElement) {
      throw new Error('PDF page element not found');
    }

    const originalCanvas = pdfPageElement.querySelector('canvas') as HTMLCanvasElement;
    if (!originalCanvas) {
      throw new Error('PDF canvas not found');
    }

    console.log('📄 Found PDF canvas:', originalCanvas.width, 'x', originalCanvas.height);

    // Get canvas as image data
    const canvasDataUrl = originalCanvas.toDataURL('image/jpeg', 0.95);
    
    // Use a simpler approach - match the canvas size more directly
    const canvasRatio = originalCanvas.width / originalCanvas.height;
    
    // Use a standard scale that works better
    const scaleFactor = 0.264583; // mm per pixel
    const pdfWidth = originalCanvas.width * scaleFactor;
    const pdfHeight = originalCanvas.height * scaleFactor;

    // Create new PDF document
    const pdf = new jsPDF({
      orientation: canvasRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    console.log(`📐 PDF size: ${Math.round(pdfWidth)}mm x ${Math.round(pdfHeight)}mm (scale: ${scaleFactor})`);

    // Add the original PDF page as background image
    pdf.addImage(canvasDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Add text overlays
    const textOverlays = window.document.querySelectorAll('[data-text-overlay="true"]');
    console.log('📝 Adding text overlays:', textOverlays.length);

    textOverlays.forEach((overlay, index) => {
      try {
        const element = overlay as HTMLElement;
        const rect = element.getBoundingClientRect();
        const pdfRect = originalCanvas.getBoundingClientRect();
        
        // Get text content
        const textContent = element.textContent || element.innerText || '';
        if (!textContent.trim()) return;
        
        // Simpler direct mapping approach
        const relativeX = (rect.left - pdfRect.left);
        const relativeY = (rect.top - pdfRect.top);
        
        // Direct coordinate mapping using the scale factor
        const x = relativeX * scaleFactor;
        const y = relativeY * scaleFactor + 3; // Small baseline offset
        
        // Get computed style
        const computedStyle = window.getComputedStyle(element);
        
        // Simpler font size calculation - direct pixel to mm conversion
        const fontSizePx = parseFloat(computedStyle.fontSize);
        const fontSizeMM = fontSizePx * scaleFactor * 3.78; // Convert to points for PDF (1mm ≈ 2.83pt)
        
        // Fix color parsing - convert RGB to hex if needed
        let textColor = computedStyle.color || '#000000';
        if (textColor.startsWith('rgb')) {
          const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
            textColor = `#${r}${g}${b}`;
          }
        }
        
        // Set text style in PDF with better values
        pdf.setFontSize(Math.max(6, Math.min(48, fontSizeMM))); // Clamp between 6-48pt
        pdf.setTextColor(textColor);
        
        // Set font weight
        if (computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 600) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        // Add text to PDF
        pdf.text(textContent, x, y);
        
        console.log(`✏️ Added text ${index + 1}: "${textContent}" at (${Math.round(x)}mm, ${Math.round(y)}mm), size: ${Math.round(fontSizeMM)}pt, color: ${textColor}`);
        
      } catch (overlayError) {
        console.warn('Failed to add text overlay to PDF:', overlayError);
      }
    });

    // Save the PDF
    pdf.save(`${filename}.pdf`);
    console.log('✅ Real PDF export completed:', `${filename}.pdf`);
    
  } catch (error) {
    console.error('❌ PDF export failed:', error);
    throw error;
  }
};

// Simple text overlay export for debugging
export const exportTextData = (
  textElements: TextElement[],
  filename: string = 'text-overlays'
): void => {
  try {
    const textData = textElements.map(element => ({
      id: element.id,
      content: element.content,
      position: { x: element.x, y: element.y },
      style: {
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        color: element.color,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle
      },
      page: element.pageNumber
    }));

    const csvContent = [
      'ID,Content,X,Y,FontSize,FontFamily,Color,FontWeight,FontStyle,Page',
      ...textData.map(item => 
        `"${item.id}","${item.content}",${item.position.x},${item.position.y},${item.style.fontSize},"${item.style.fontFamily}","${item.style.color}","${item.style.fontWeight}","${item.style.fontStyle}",${item.page}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    saveAs(blob, `${filename}.csv`);
  } catch (error) {
    console.error('Text data export failed:', error);
    throw error;
  }
}; 
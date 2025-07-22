import { saveAs } from 'file-saver';
import { PDFDocument, TextElement, SignatureElement } from '@/types/pdf-editor';
import jsPDF from 'jspdf';

// Export the PDF viewer as an image (PNG) with signature support
export const exportAsImage = async (
  filename: string = 'edited-pdf'
): Promise<void> => {
  try {
    // Wait for any pending renders
    await new Promise(resolve => setTimeout(resolve, 200));

    // Find the PDF viewer container
    const pdfContainer = document.querySelector('.react-pdf__Document');
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

    // Draw text overlays on top
    textOverlays.forEach((overlay) => {
      try {
        const element = overlay as HTMLElement;
        const rect = element.getBoundingClientRect();
        const pdfRect = originalCanvas.getBoundingClientRect();
        
        const relativeX = (rect.left - pdfRect.left) / pdfRect.width;
        const relativeY = (rect.top - pdfRect.top) / pdfRect.height;
        
        const x = relativeX * exportCanvas.width;
        const y = relativeY * exportCanvas.height;
        
        const textContent = element.textContent || element.innerText || '';
        if (!textContent) return;
        
        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseFloat(computedStyle.fontSize) * (exportCanvas.width / pdfRect.width);
        
        ctx.font = `${computedStyle.fontWeight} ${fontSize}px ${computedStyle.fontFamily}`;
        ctx.fillStyle = computedStyle.color || '#000000';
        ctx.textBaseline = 'top';
        
        ctx.fillText(textContent, x, y);
        
      } catch (overlayError) {
        // Silent error handling
      }
    });

    // Get all signature overlays
    const signatureOverlays = document.querySelectorAll('[data-signature-overlay="true"]');

    // Draw signature overlays on top using Promise.all for better performance
    const signaturePromises = Array.from(signatureOverlays).map((overlay) => {
      return new Promise<void>((resolve) => {
        try {
          const element = overlay as HTMLElement;
          const rect = element.getBoundingClientRect();
          const pdfRect = originalCanvas.getBoundingClientRect();
          
          const relativeX = (rect.left - pdfRect.left) / pdfRect.width;
          const relativeY = (rect.top - pdfRect.top) / pdfRect.height;
          
          const x = relativeX * exportCanvas.width;
          const y = relativeY * exportCanvas.height;
          
          const signatureImg = element.querySelector('img') as HTMLImageElement;
          if (!signatureImg || !signatureImg.src) {
            resolve();
            return;
          }
          
          const img = window.document.createElement('img');
          img.onload = () => {
            try {
              const imgWidth = img.naturalWidth || img.width;
              const imgHeight = img.naturalHeight || img.height;
              const scaleX = (rect.width / pdfRect.width) * exportCanvas.width / imgWidth;
              const scaleY = (rect.height / pdfRect.height) * exportCanvas.height / imgHeight;
              const scale = Math.min(scaleX, scaleY);
              
              const scaledWidth = imgWidth * scale;
              const scaledHeight = imgHeight * scale;
              
              ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
              resolve();
            } catch (error) {
              resolve();
            }
          };
          img.onerror = () => resolve();
          img.src = signatureImg.src;
          
        } catch (overlayError) {
          resolve();
        }
      });
    });

    // Wait for all signatures to be drawn
    await Promise.all(signaturePromises);

    // Convert canvas to high-quality PNG blob and download
    exportCanvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `${filename}.png`);
      } else {
        throw new Error('Failed to create image blob');
      }
    }, 'image/png', 1.0); // Maximum quality PNG

  } catch (error) {
    throw error;
  }
};

// Export PDF data with text overlay and signature information as JSON
export const exportProjectData = (
  document: PDFDocument,
  filename: string = 'pdf-project'
): void => {
  try {
    const projectData = {
      filename: document.name,
      numPages: document.numPages,
      textElements: document.textElements,
      signatureElements: document.signatureElements.map(sig => ({
        ...sig,
        // Store signature metadata but truncate image data for file size
        imageDataPreview: sig.imageData.substring(0, 100) + '...[truncated]'
      })),
      timestamp: new Date().toISOString(),
      version: '2.0'
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json'
    });

    saveAs(blob, `${filename}.json`);
  } catch (error) {
    throw error;
  }
};

// Real PDF export function using jsPDF with signature support
export const exportAsPDF = async (
  document: PDFDocument,
  filename: string = 'edited-pdf',
  currentPage: number = 1
): Promise<void> => {
  try {
    // Wait for any pending renders
    await new Promise(resolve => setTimeout(resolve, 200));

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

    // Get canvas as high-quality image data
    const canvasDataUrl = originalCanvas.toDataURL('image/jpeg', 0.95);
    
    const canvasRatio = originalCanvas.width / originalCanvas.height;
    const scaleFactor = 0.264583; // mm per pixel
    const pdfWidth = originalCanvas.width * scaleFactor;
    const pdfHeight = originalCanvas.height * scaleFactor;

    // Create new PDF document
    const pdf = new jsPDF({
      orientation: canvasRatio > 1 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    // Add the original PDF page as background image
    pdf.addImage(canvasDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // Get PDF page bounds for coordinate conversion
    const pdfRect = originalCanvas.getBoundingClientRect();

    // Filter text elements for current page only
    const currentPageTextElements = document.textElements.filter(
      element => element.pageNumber === currentPage
    );

    // Add text elements using actual TextElement data (much more reliable!)
    currentPageTextElements.forEach((textElement) => {
      try {
        // Skip empty text
        if (!textElement.content.trim()) return;

        // Find the corresponding DOM element for position
        const domElement = window.document.querySelector(
          `[data-text-overlay="true"][data-text-id="${textElement.id}"]`
        ) as HTMLElement;
        
        let x, y;
        
        if (domElement) {
          // Use DOM position if element is found
          const rect = domElement.getBoundingClientRect();
          x = (rect.left - pdfRect.left) * scaleFactor;
          y = (rect.top - pdfRect.top) * scaleFactor;
        } else {
          // Fallback to stored coordinates
          x = textElement.x * scaleFactor;
          y = textElement.y * scaleFactor;
        }

        // Convert font size to PDF units (more accurate conversion)
        const fontSizeMM = (textElement.fontSize * scaleFactor * 0.75); // 0.75 is the px to pt conversion
        
        // Set font size with proper bounds
        pdf.setFontSize(Math.max(8, Math.min(72, fontSizeMM)));
        
        // Set text color using the actual stored color with better handling
        let textColor = textElement.color || '#000000';
        
        // Ensure color is in correct hex format
        if (!textColor.startsWith('#')) {
          textColor = '#000000'; // fallback to black
        }
        
        pdf.setTextColor(textColor);
        
        // Map font family to PDF-supported fonts
        let pdfFontFamily = 'helvetica'; // default
        const fontFamily = textElement.fontFamily.toLowerCase();
        
        if (fontFamily.includes('times') || fontFamily.includes('serif')) {
          pdfFontFamily = 'times';
        } else if (fontFamily.includes('courier') || fontFamily.includes('mono')) {
          pdfFontFamily = 'courier';
        }
        // helvetica covers Arial, sans-serif, etc.

        // Set font weight and style using actual stored values
        let fontStyle = 'normal';
        if (textElement.fontWeight === 'bold' && textElement.fontStyle === 'italic') {
          fontStyle = 'bolditalic';
        } else if (textElement.fontWeight === 'bold') {
          fontStyle = 'bold';
        } else if (textElement.fontStyle === 'italic') {
          fontStyle = 'italic';
        }

        pdf.setFont(pdfFontFamily, fontStyle);
        
        // Add text to PDF with proper positioning
        pdf.text(textElement.content, x, y + fontSizeMM); // Adjust y for baseline
        
      } catch (textError) {
        console.warn('Error adding text element to PDF:', textError);
      }
    });

    // Filter signature elements for current page only
    const currentPageSignatureElements = document.signatureElements.filter(
      element => element.pageNumber === currentPage
    );

    // Add signature overlays for current page
    const signatureOverlays = window.document.querySelectorAll('[data-signature-overlay="true"]');

    // Process signatures sequentially to avoid memory issues
    for (let index = 0; index < signatureOverlays.length; index++) {
      const overlay = signatureOverlays[index];
      
      try {
        const element = overlay as HTMLElement;
        const signatureId = element.getAttribute('data-signature-id');
        
        // Only process signatures that are on the current page
        const signatureElement = currentPageSignatureElements.find(sig => sig.id === signatureId);
        if (!signatureElement) continue;
        
        const rect = element.getBoundingClientRect();
        
        const signatureImg = element.querySelector('img') as HTMLImageElement;
        if (!signatureImg || !signatureImg.src) {
          continue;
        }
        
        const relativeX = (rect.left - pdfRect.left);
        const relativeY = (rect.top - pdfRect.top);
        
        const x = relativeX * scaleFactor;
        const y = relativeY * scaleFactor;
        
        const signatureWidthMM = rect.width * scaleFactor;
        const signatureHeightMM = rect.height * scaleFactor;
        
        // Add signature image to PDF with high quality
        pdf.addImage(
          signatureImg.src,
          'PNG',
          x,
          y,
          signatureWidthMM,
          signatureHeightMM
        );
        
      } catch (signatureError) {
        console.warn('Error adding signature to PDF:', signatureError);
      }
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);
    
  } catch (error) {
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
    throw error;
  }
};

// Export signature data for debugging
export const exportSignatureData = (
  signatureElements: SignatureElement[],
  filename: string = 'signature-overlays'
): void => {
  try {
    const signatureData = signatureElements.map(element => ({
      id: element.id,
      position: { x: element.x, y: element.y },
      dimensions: { width: element.width, height: element.height },
      rotation: element.rotation,
      color: element.color,
      opacity: element.opacity,
      page: element.pageNumber,
      timestamp: new Date(element.timestamp).toISOString(),
      hasImageData: !!element.imageData
    }));

    const csvContent = [
      'ID,X,Y,Width,Height,Rotation,Color,Opacity,Page,Timestamp,HasImageData',
      ...signatureData.map(item => 
        `"${item.id}",${item.position.x},${item.position.y},${item.dimensions.width},${item.dimensions.height},${item.rotation},"${item.color}",${item.opacity},${item.page},"${item.timestamp}",${item.hasImageData}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    saveAs(blob, `${filename}.csv`);
  } catch (error) {
    throw error;
  }
}; 
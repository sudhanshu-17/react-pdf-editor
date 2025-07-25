import { useState, useCallback, useRef } from 'react';

export interface PDFScaleInfo {
  displayScale: number; // Scale factor from PDF coordinates to display coordinates
  pdfWidth: number;     // Native PDF width in points
  pdfHeight: number;    // Native PDF height in points  
  displayWidth: number; // Actual displayed width in pixels
  displayHeight: number; // Actual displayed height in pixels
  userZoom: number;     // User zoom level (1.0 = 100%)
}

export const usePDFScale = () => {
  const [scaleInfo, setScaleInfo] = useState<PDFScaleInfo>({
    displayScale: 1,
    pdfWidth: 0,
    pdfHeight: 0,
    displayWidth: 0,
    displayHeight: 0,
    userZoom: 1
  });

  // Convert display coordinates to PDF coordinates
  const displayToPDF = useCallback((x: number, y: number) => {
    return {
      x: x / scaleInfo.displayScale,
      y: y / scaleInfo.displayScale
    };
  }, [scaleInfo.displayScale]);

  // Convert PDF coordinates to display coordinates  
  const pdfToDisplay = useCallback((x: number, y: number) => {
    return {
      x: x * scaleInfo.displayScale,
      y: y * scaleInfo.displayScale
    };
  }, [scaleInfo.displayScale]);

  // Update scale info when PDF page loads or user zooms
  const updateScaleInfo = useCallback((
    pdfWidth: number,
    pdfHeight: number, 
    displayWidth: number,
    displayHeight: number,
    userZoom: number = 1
  ) => {
    // Calculate the actual scale factor between PDF coordinates and display coordinates
    // This includes both responsive scaling AND user zoom
    const displayScale = (displayWidth / pdfWidth) * userZoom;
    
    setScaleInfo({
      displayScale,
      pdfWidth,
      pdfHeight,
      displayWidth,
      displayHeight,
      userZoom
    });
  }, []);

  return {
    scaleInfo,
    displayToPDF,
    pdfToDisplay,
    updateScaleInfo
  };
}; 
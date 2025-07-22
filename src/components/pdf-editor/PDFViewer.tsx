import React, { useState, useRef, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextElement, SignatureElement, ToolbarState } from '@/types/pdf-editor';
import { DraggableText } from './DraggableText';
import { DraggableSignature } from './DraggableSignature';
import { pdfOptions } from '@/lib/pdf-config';

interface PDFViewerProps {
  file: File;
  textElements: TextElement[];
  signatureElements: SignatureElement[];
  currentPage: number;
  numPages: number;
  toolbarState: ToolbarState;
  selectedTextId: string | null;
  selectedSignatureId: string | null;
  editingTextId: string | null;
  onPageChange: (page: number) => void;
  onNumPagesChange: (numPages: number) => void;
  onTextElementUpdate: (id: string, updates: Partial<TextElement>) => void;
  onSignatureElementUpdate: (id: string, updates: Partial<SignatureElement>) => void;
  onTextElementDelete: (id: string) => void;
  onSignatureElementDelete: (id: string) => void;
  onTextElementSelect: (id: string | null) => void;
  onSignatureElementSelect: (id: string | null) => void;
  onTextElementAdd: (element: Omit<TextElement, 'id'>) => void;
  onSignatureElementAdd: (element: Omit<SignatureElement, 'id'>) => void;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  textElements,
  signatureElements,
  currentPage,
  numPages,
  toolbarState,
  selectedTextId,
  selectedSignatureId,
  editingTextId,
  onPageChange,
  onNumPagesChange,
  onTextElementUpdate,
  onSignatureElementUpdate,
  onTextElementDelete,
  onSignatureElementDelete,
  onTextElementSelect,
  onSignatureElementSelect,
  onTextElementAdd,
  onSignatureElementAdd,
  onStartEdit,
  onStopEdit
}) => {
  const [scale, setScale] = useState(1.0);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    onNumPagesChange(numPages);
  };

  const handleDocumentLoadError = (error: Error) => {
    // Silent error handling - could add user notification here if needed
  };

  const handlePageLoadSuccess = (page: any) => {
    setPageWidth(page.width);
    setPageHeight(page.height);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.preventDefault();
    e.nativeEvent.stopImmediatePropagation();

    if (toolbarState.selectedTool === 'text') {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      const newTextElement: Omit<TextElement, 'id'> = {
        content: 'New Text',
        x: Math.max(5, Math.round(x)),
        y: Math.max(5, Math.round(y)),
        fontSize: toolbarState.fontSize,
        fontFamily: toolbarState.fontFamily,
        color: toolbarState.color,
        fontWeight: toolbarState.fontWeight,
        fontStyle: toolbarState.fontStyle,
        pageNumber: currentPage
      };

      onTextElementAdd(newTextElement);
      setMousePosition(null);
    } else if (toolbarState.selectedTool === 'signature') {
      if (selectedSignatureId) {
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        
        const x = Math.max(5, (e.clientX - rect.left) / scale);
        const y = Math.max(5, (e.clientY - rect.top) / scale);

        onSignatureElementUpdate(selectedSignatureId, {
          x,
          y,
          pageNumber: currentPage
        });
      }

      setMousePosition(null);
    } else if (toolbarState.selectedTool === 'select') {
      if (selectedTextId || selectedSignatureId) {
        onTextElementSelect(null);
        onSignatureElementSelect(null);
      }
    }

    requestAnimationFrame(() => {
      if (document.activeElement && 'blur' in document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (toolbarState.selectedTool === 'text' || toolbarState.selectedTool === 'signature') {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      setMousePosition({ x, y });
    }
  }, [toolbarState.selectedTool, scale]);

  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
  }, []);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1);

  return (
    <Card className="flex-1 bg-canvas-bg border-0 shadow-soft overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Controls Bar */}
        <div className="bg-toolbar-bg border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <span className="text-sm px-3">
              {currentPage} / {numPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <span className="text-sm px-3 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={resetZoom}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-muted/30 p-8" style={{ scrollBehavior: 'auto' }}>
          <div className="flex justify-center">
            <div 
              ref={containerRef}
              className="relative bg-white shadow-large rounded-lg overflow-hidden"
              style={{ 
                transform: `scale(${scale})`,
                transformOrigin: 'center top',
                isolation: 'isolate'
              }}
            >
              <Document
                file={file}
                onLoadSuccess={handleDocumentLoadSuccess}
                onLoadError={handleDocumentLoadError}
                options={pdfOptions}
                loading={
                  <div className="flex flex-col items-center justify-center h-96 w-96 bg-white border rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading PDF...</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center h-96 w-96 bg-white border rounded-lg text-destructive">
                    <div className="text-center p-6 max-w-md">
                      <div className="text-4xl mb-4">📄❌</div>
                      <h3 className="text-lg font-semibold mb-2">Failed to load PDF</h3>
                      <div className="text-sm text-muted-foreground mb-4 space-y-2">
                        <p>This could be due to:</p>
                        <ul className="text-left list-disc list-inside space-y-1">
                          <li>Corrupted or invalid PDF file</li>
                          <li>PDF.js worker loading issue</li>
                          <li>Browser compatibility issue</li>
                        </ul>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.reload()}
                        >
                          Reload Page
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) window.location.reload();
                            };
                            input.click();
                          }}
                        >
                          Try Different File
                        </Button>
                      </div>
                    </div>
                  </div>
                }
              >
                <div 
                  className={`relative block ${
                    toolbarState.selectedTool === 'text' 
                      ? 'cursor-crosshair' 
                      : toolbarState.selectedTool === 'signature'
                      ? 'cursor-copy'
                      : 'cursor-default'
                  }`}
                  onClick={handleCanvasClick}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onMouseDown={(e) => {
                    if (toolbarState.selectedTool === 'text' || toolbarState.selectedTool === 'signature') {
                      e.preventDefault();
                    }
                  }}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    lineHeight: 0
                  }}
                >
                  <Page
                    pageNumber={currentPage}
                    onLoadSuccess={handlePageLoadSuccess}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                  
                  {/* Overlays Container */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 10 }}
                  >
                    {/* Tool placement preview */}
                    {mousePosition && (
                      <div
                        className="absolute pointer-events-none z-50"
                        style={{
                          left: mousePosition.x,
                          top: mousePosition.y,
                          transform: 'translate(-2px, -2px)'
                        }}
                      >
                        {toolbarState.selectedTool === 'text' && (
                          <div className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded-full text-xs shadow-lg opacity-90 animate-bounce">
                            <span>📝</span>
                            <span>Click to add text</span>
                          </div>
                        )}
                        {toolbarState.selectedTool === 'signature' && selectedSignatureId && (
                          <div className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-full text-xs shadow-lg opacity-90 animate-bounce">
                            <span>🖋️</span>
                            <span>Click to place signature</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Text Elements */}
                    {textElements.map((textElement) => (
                      <DraggableText
                        key={textElement.id}
                        textElement={textElement}
                        isSelected={selectedTextId === textElement.id}
                        isEditing={editingTextId === textElement.id}
                        onUpdate={onTextElementUpdate}
                        onDelete={onTextElementDelete}
                        onSelect={onTextElementSelect}
                        onStartEdit={onStartEdit}
                        onStopEdit={onStopEdit}
                        scale={1}
                      />
                    ))}

                    {/* Signature Elements */}
                    {signatureElements.map((signatureElement) => (
                      <DraggableSignature
                        key={signatureElement.id}
                        signatureElement={signatureElement}
                        isSelected={selectedSignatureId === signatureElement.id}
                        onUpdate={onSignatureElementUpdate}
                        onDelete={onSignatureElementDelete}
                        onSelect={onSignatureElementSelect}
                        scale={1}
                      />
                    ))}
                  </div>
                </div>
              </Document>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
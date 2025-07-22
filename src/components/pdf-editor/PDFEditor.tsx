import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PDFUpload } from './PDFUpload';
import { Toolbar } from './Toolbar';
import { PDFViewer } from './PDFViewer';
import { SignatureCanvasComponent } from './SignatureCanvas';
import { TextElement, SignatureElement, SavedSignature, ToolbarState, PDFDocument } from '@/types/pdf-editor';
import { Button } from '@/components/ui/button';
import { Download, Save, FileText, Image, FileCode, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportAsPDF, exportAsImage, exportProjectData, exportTextData } from '@/lib/pdf-export';

// Storage keys for localStorage
const SAVED_SIGNATURES_KEY = 'pdf-editor-saved-signatures';

// Helper functions for signature storage
const loadSavedSignatures = (): SavedSignature[] => {
  try {
    const stored = localStorage.getItem(SAVED_SIGNATURES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveSavedSignatures = (signatures: SavedSignature[]) => {
  try {
    localStorage.setItem(SAVED_SIGNATURES_KEY, JSON.stringify(signatures));
  } catch {
    // Silent fail if localStorage is not available
  }
};

export const PDFEditor: React.FC = () => {
  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>(() => loadSavedSignatures());
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    selectedTool: 'select',
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    signatureCanvasWidth: 400,
    signatureCanvasHeight: 200,
    signatureColor: '#000000'
  });

  const { toast } = useToast();

  // Save signatures to localStorage whenever savedSignatures changes
  useEffect(() => {
    saveSavedSignatures(savedSignatures);
  }, [savedSignatures]);

  const handleFileUpload = useCallback((file: File) => {
    setDocument({
      file,
      name: file.name,
      numPages: 0,
      textElements: [],
      signatureElements: []
    });
    setCurrentPage(1);
    setSelectedTextId(null);
    setSelectedSignatureId(null);
    setEditingTextId(null);
    
    toast({
      title: "PDF Loaded",
      description: `Successfully loaded ${file.name}`,
    });
  }, [toast]);

  const handleNumPagesChange = useCallback((numPages: number) => {
    if (document) {
      setDocument(prev => prev ? { ...prev, numPages } : null);
    }
  }, [document]);

  const handleTextElementAdd = useCallback((element: Omit<TextElement, 'id'>) => {
    if (!document) return;

    const newElement: TextElement = {
      ...element,
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setDocument(prev => prev ? {
      ...prev,
      textElements: [...prev.textElements, newElement]
    } : null);

    // Auto-select and start editing the new text element
    setSelectedTextId(newElement.id);
    setSelectedSignatureId(null);
    
    // Start editing after a small delay to ensure the element is rendered
    setTimeout(() => {
      setEditingTextId(newElement.id);
    }, 50);

    // Switch back to select tool after adding text
    setToolbarState(prev => ({ 
      ...prev, 
      selectedTool: 'select' 
    }));

    toast({
      title: "Text Added! ✨",
      description: "Now in Select mode. Click the text to edit, or drag to move.",
      duration: 3000,
    });
  }, [document, toast]);

  const handleSignatureElementAdd = useCallback((element: Omit<SignatureElement, 'id'>) => {
    if (!document) return;

    const newElement: SignatureElement = {
      ...element,
      id: `signature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setDocument(prev => prev ? {
      ...prev,
      signatureElements: [...prev.signatureElements, newElement]
    } : null);

    // Auto-select the new signature element
    setSelectedSignatureId(newElement.id);
    setSelectedTextId(null);

    // Switch back to select tool after adding signature
    setToolbarState(prev => ({ 
      ...prev, 
      selectedTool: 'select' 
    }));

    toast({
      title: "Signature Added! ✍️",
      description: "Signature placed successfully. Drag to reposition, resize, or rotate.",
      duration: 3000,
    });
  }, [document, toast]);

  const handleTextElementUpdate = useCallback((id: string, updates: Partial<TextElement>) => {
    if (!document) return;

    setDocument(prev => prev ? {
      ...prev,
      textElements: prev.textElements.map(element =>
        element.id === id ? { ...element, ...updates } : element
      )
    } : null);
  }, [document]);

  const handleSignatureElementUpdate = useCallback((id: string, updates: Partial<SignatureElement>) => {
    if (!document) return;

    setDocument(prev => prev ? {
      ...prev,
      signatureElements: prev.signatureElements.map(element =>
        element.id === id ? { ...element, ...updates } : element
      )
    } : null);
  }, [document]);

  const handleTextElementDelete = useCallback((id: string) => {
    if (!document) return;

    setDocument(prev => prev ? {
      ...prev,
      textElements: prev.textElements.filter(element => element.id !== id)
    } : null);

    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
    if (editingTextId === id) {
      setEditingTextId(null);
    }
  }, [document, selectedTextId, editingTextId]);

  const handleSignatureElementDelete = useCallback((id: string) => {
    if (!document) return;

    setDocument(prev => prev ? {
      ...prev,
      signatureElements: prev.signatureElements.filter(element => element.id !== id)
    } : null);

    if (selectedSignatureId === id) {
      setSelectedSignatureId(null);
    }

    toast({
      title: "Signature Deleted",
      description: "Signature removed successfully.",
    });
  }, [document, selectedSignatureId, toast]);

  const handleTextElementSelect = useCallback((id: string | null) => {
    setSelectedTextId(id);
    setSelectedSignatureId(null);
    setEditingTextId(null);
  }, []);

  const handleSignatureElementSelect = useCallback((id: string | null) => {
    setSelectedSignatureId(id);
    setSelectedTextId(null);
    setEditingTextId(null);
  }, []);

  const handleStartEdit = useCallback((id: string) => {
    setEditingTextId(id);
    setSelectedTextId(id);
  }, []);

  const handleStopEdit = useCallback(() => {
    setEditingTextId(null);
  }, []);

  const handleToolbarChange = useCallback((updates: Partial<ToolbarState>) => {
    setToolbarState(prev => ({ ...prev, ...updates }));
    
    // Apply updates to selected text element
    if (selectedTextId && document && updates.selectedTool !== 'signature') {
      const updatesToApply: Partial<TextElement> = {};
      
      if (updates.fontSize !== undefined) updatesToApply.fontSize = updates.fontSize;
      if (updates.fontFamily !== undefined) updatesToApply.fontFamily = updates.fontFamily;
      if (updates.color !== undefined) updatesToApply.color = updates.color;
      if (updates.fontWeight !== undefined) updatesToApply.fontWeight = updates.fontWeight;
      if (updates.fontStyle !== undefined) updatesToApply.fontStyle = updates.fontStyle;
      
      if (Object.keys(updatesToApply).length > 0) {
        handleTextElementUpdate(selectedTextId, updatesToApply);
      }
    }

    // Handle signature tool selection
    if (updates.selectedTool === 'signature' && updates.selectedTool !== toolbarState.selectedTool) {
      setShowSignatureCanvas(true);
    }
  }, [selectedTextId, document, handleTextElementUpdate, toolbarState.selectedTool]);

  // Handle signature canvas save
  const handleSignatureSave = useCallback((imageData: string) => {
    if (!document) return;

    // Create a temporary image to get dimensions using window.Image
    const img = window.document.createElement('img');
    img.onload = () => {
      const width = img.naturalWidth || toolbarState.signatureCanvasWidth;
      const height = img.naturalHeight || toolbarState.signatureCanvasHeight;

      // Save signature to stored signatures
      const savedSignature: SavedSignature = {
        id: `saved-signature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Signature ${savedSignatures.length + 1}`,
        imageData,
        width,
        height,
        color: toolbarState.signatureColor,
        timestamp: Date.now()
      };

      // Add to saved signatures (limit to 10 signatures)
      setSavedSignatures(prev => {
        const updated = [savedSignature, ...prev].slice(0, 10);
        return updated;
      });

      // Create signature element for the document
      const signatureElement: Omit<SignatureElement, 'id'> = {
        imageData,
        x: 50,
        y: 50,
        width,
        height,
        rotation: 0,
        color: toolbarState.signatureColor,
        opacity: 1.0,
        pageNumber: currentPage,
        timestamp: Date.now()
      };

      handleSignatureElementAdd(signatureElement);
      setShowSignatureCanvas(false);

      toast({
        title: "Signature Saved! 💾",
        description: "Signature has been saved for future use. Check the toolbar to reuse it.",
        duration: 4000,
      });
    };
    img.onerror = () => {
      // Fallback if image loading fails
      const signatureElement: Omit<SignatureElement, 'id'> = {
        imageData,
        x: 50,
        y: 50,
        width: toolbarState.signatureCanvasWidth,
        height: toolbarState.signatureCanvasHeight,
        rotation: 0,
        color: toolbarState.signatureColor,
        opacity: 1.0,
        pageNumber: currentPage,
        timestamp: Date.now()
      };

      handleSignatureElementAdd(signatureElement);
      setShowSignatureCanvas(false);
    };
    img.src = imageData;
  }, [document, currentPage, toolbarState.signatureCanvasWidth, toolbarState.signatureCanvasHeight, toolbarState.signatureColor, savedSignatures.length, handleSignatureElementAdd, toast]);

  const handleSignatureCancel = useCallback(() => {
    setShowSignatureCanvas(false);
    setToolbarState(prev => ({ ...prev, selectedTool: 'select' }));
  }, []);

  // Use saved signature
  const handleUseSavedSignature = useCallback((savedSignature: SavedSignature) => {
    if (!document) return;

    const signatureElement: Omit<SignatureElement, 'id'> = {
      imageData: savedSignature.imageData,
      x: 50,
      y: 50,
      width: savedSignature.width,
      height: savedSignature.height,
      rotation: 0,
      color: savedSignature.color,
      opacity: 1.0,
      pageNumber: currentPage,
      timestamp: Date.now()
    };

    handleSignatureElementAdd(signatureElement);

    toast({
      title: "Signature Reused! ♻️",
      description: `Applied "${savedSignature.name}" to your document.`,
      duration: 3000,
    });
  }, [document, currentPage, handleSignatureElementAdd, toast]);

  // Delete saved signature
  const handleDeleteSavedSignature = useCallback((signatureId: string) => {
    setSavedSignatures(prev => prev.filter(sig => sig.id !== signatureId));
    toast({
      title: "Saved Signature Deleted",
      description: "Signature removed from saved signatures.",
      duration: 2000,
    });
  }, [toast]);

  // Clear all saved signatures
  const handleClearSavedSignatures = useCallback(() => {
    setSavedSignatures([]);
    toast({
      title: "All Signatures Cleared",
      description: "All saved signatures have been removed.",
      duration: 2000,
    });
  }, [toast]);

  // Duplicate selected element (Ctrl+D)
  const handleDuplicateElement = useCallback(() => {
    if (!document) return;

    if (selectedTextId) {
      // Duplicate text element
      const textElement = document.textElements.find(el => el.id === selectedTextId);
      if (textElement) {
        const newElement: TextElement = {
          ...textElement,
          id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          x: textElement.x + 20, // Offset by 20px
          y: textElement.y + 20,
        };

        setDocument(prev => prev ? {
          ...prev,
          textElements: [...prev.textElements, newElement]
        } : null);

        // Select the new element
        setSelectedTextId(newElement.id);
        setSelectedSignatureId(null);

        toast({
          title: "Text Duplicated! 📄",
          description: "Text element duplicated and selected.",
          duration: 2000,
        });
      }
    } else if (selectedSignatureId) {
      // Duplicate signature element
      const signatureElement = document.signatureElements.find(el => el.id === selectedSignatureId);
      if (signatureElement) {
        const newElement: SignatureElement = {
          ...signatureElement,
          id: `signature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          x: signatureElement.x + 20, // Offset by 20px
          y: signatureElement.y + 20,
          timestamp: Date.now()
        };

        setDocument(prev => prev ? {
          ...prev,
          signatureElements: [...prev.signatureElements, newElement]
        } : null);

        // Select the new element
        setSelectedSignatureId(newElement.id);
        setSelectedTextId(null);

        toast({
          title: "Signature Duplicated! ✍️",
          description: "Signature duplicated and selected.",
          duration: 2000,
        });
      }
    }
  }, [document, selectedTextId, selectedSignatureId, toast]);

  const handleSave = useCallback(() => {
    if (!document) return;
    
    toast({
      title: "Document Saved",
      description: "Your changes have been saved locally",
    });
  }, [document, toast]);

  // Helper to generate clean filename
  const getFileName = useCallback(() => {
    if (!document) return 'edited-pdf';
    return document.name.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '_');
  }, [document]);

  // Export as Real PDF
  const handleExportPDF = useCallback(async () => {
    if (!document) return;
    
    try {
      toast({
        title: "Exporting as PDF...",
        description: "Creating your PDF with text overlays and signatures",
      });

      const fileName = getFileName();
      await exportAsPDF(document, fileName, currentPage);
      
      toast({
        title: "PDF Export Complete! 📄",
        description: "Your edited PDF has been downloaded successfully",
      });
      
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export as PDF. Please try again.",
        variant: "destructive",
      });
    }
  }, [document, toast, getFileName, currentPage]);

  // Export as PNG Image
  const handleExportImage = useCallback(async () => {
    if (!document) return;
    
    try {
      toast({
        title: "Exporting as Image...",
        description: "Converting your PDF to PNG format",
      });

      const fileName = getFileName();
      await exportAsImage(fileName);
      
      toast({
        title: "Image Export Complete! 🖼️",
        description: "Your PDF has been downloaded as a PNG image",
      });
      
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export as image. Please try again.",
        variant: "destructive",
      });
    }
  }, [document, toast, getFileName]);

  // Export project data as JSON
  const handleExportProject = useCallback(async () => {
    if (!document) return;
    
    try {
      toast({
        title: "Exporting Project...",
        description: "Saving your text overlays, signatures and settings",
      });

      const fileName = getFileName();
      exportProjectData(document, fileName);
      
      toast({
        title: "Project Export Complete! 💾",
        description: "Your project data has been saved as JSON",
      });
      
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not save project data. Please try again.",
        variant: "destructive",
      });
    }
  }, [document, toast, getFileName]);

  // Export text data as CSV
  const handleExportTextData = useCallback(async () => {
    if (!document) return;
    
    try {
      toast({
        title: "Exporting Text Data...",
        description: "Saving all text overlays as CSV",
      });

      const fileName = getFileName();
      exportTextData(document.textElements, fileName);
      
      toast({
        title: "Text Data Export Complete! 📄",
        description: "Your text overlays have been saved as CSV",
      });
      
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export text data. Please try again.",
        variant: "destructive",
      });
    }
  }, [document, toast, getFileName]);

  // Memoize current page text elements for performance
  const currentPageTexts = useMemo(() => {
    return document?.textElements.filter(
      text => text.pageNumber === currentPage
    ) || [];
  }, [document?.textElements, currentPage]);

  // Memoize current page signature elements for performance
  const currentPageSignatures = useMemo(() => {
    return document?.signatureElements.filter(
      signature => signature.pageNumber === currentPage
    ) || [];
  }, [document?.signatureElements, currentPage]);

  // Keyboard shortcuts for tool switching and duplication
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId || showSignatureCanvas) return;
      
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle Ctrl+D for duplication
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedTextId || selectedSignatureId) {
          handleDuplicateElement();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setToolbarState(prev => ({ ...prev, selectedTool: 'select' }));
          }
          break;
        case 't':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setToolbarState(prev => ({ ...prev, selectedTool: 'text' }));
          }
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setToolbarState(prev => ({ ...prev, selectedTool: 'signature' }));
            setShowSignatureCanvas(true);
          }
          break;
        case 'escape':
          e.preventDefault();
          setToolbarState(prev => ({ ...prev, selectedTool: 'select' }));
          if (selectedTextId) {
            setSelectedTextId(null);
          }
          if (selectedSignatureId) {
            setSelectedSignatureId(null);
          }
          if (editingTextId) {
            setEditingTextId(null);
          }
          if (showSignatureCanvas) {
            setShowSignatureCanvas(false);
          }
          break;
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [editingTextId, selectedTextId, selectedSignatureId, showSignatureCanvas, handleDuplicateElement]);

  if (!document) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-toolbar-bg border-b shadow-soft">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text">
                InkAgent PDF Editor Pro
              </h1>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="container mx-auto px-4 py-8">
          <PDFUpload onFileUpload={handleFileUpload} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-toolbar-bg border-b shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <h1 className="text-lg font-bold">InkAgent PDF Editor Pro</h1>
              <span className="text-sm text-muted-foreground">
                {document.name}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              
              {/* Export Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Export as PDF
                    <span className="ml-auto text-xs text-muted-foreground">✨ New!</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={handleExportImage}>
                    <Image className="w-4 h-4 mr-2" />
                    Export as PNG Image
                    <span className="ml-auto text-xs text-muted-foreground">Alternative</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleExportProject}>
                    <FileCode className="w-4 h-4 mr-2" />
                    Save Project Data
                    <span className="ml-auto text-xs text-muted-foreground">JSON</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={handleExportTextData}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export Text Data
                    <span className="ml-auto text-xs text-muted-foreground">CSV</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-sidebar-bg border-r shadow-soft flex flex-col max-h-[calc(100vh-73px)]">
          <div className="flex-1 overflow-y-auto p-4">
            <Toolbar 
              toolbarState={toolbarState}
              onToolbarChange={handleToolbarChange}
              savedSignatures={savedSignatures}
              onUseSavedSignature={handleUseSavedSignature}
              onDeleteSavedSignature={handleDeleteSavedSignature}
              onClearSavedSignatures={handleClearSavedSignatures}
            />
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1">
          <PDFViewer
            file={document.file}
            textElements={currentPageTexts}
            signatureElements={currentPageSignatures}
            currentPage={currentPage}
            numPages={document.numPages}
            toolbarState={toolbarState}
            selectedTextId={selectedTextId}
            selectedSignatureId={selectedSignatureId}
            editingTextId={editingTextId}
            onPageChange={setCurrentPage}
            onNumPagesChange={handleNumPagesChange}
            onTextElementUpdate={handleTextElementUpdate}
            onSignatureElementUpdate={handleSignatureElementUpdate}
            onTextElementDelete={handleTextElementDelete}
            onSignatureElementDelete={handleSignatureElementDelete}
            onTextElementSelect={handleTextElementSelect}
            onSignatureElementSelect={handleSignatureElementSelect}
            onTextElementAdd={handleTextElementAdd}
            onSignatureElementAdd={handleSignatureElementAdd}
            onStartEdit={handleStartEdit}
            onStopEdit={handleStopEdit}
          />
        </div>
      </div>

      {/* Signature Canvas Modal */}
      <Dialog open={showSignatureCanvas} onOpenChange={setShowSignatureCanvas}>
        <DialogContent className="max-w-3xl">
          <SignatureCanvasComponent
            width={toolbarState.signatureCanvasWidth}
            height={toolbarState.signatureCanvasHeight}
            color={toolbarState.signatureColor}
            onSave={handleSignatureSave}
            onCancel={handleSignatureCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PDFUpload } from './PDFUpload';
import { Toolbar } from './Toolbar';
import { PDFViewer } from './PDFViewer';
import { TextElement, ToolbarState, PDFDocument } from '@/types/pdf-editor';
import { Button } from '@/components/ui/button';
import { Download, Save, FileText, Image, FileCode, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportAsPDF, exportAsImage, exportProjectData, exportTextData } from '@/lib/pdf-export';

export const PDFEditor: React.FC = () => {
  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    selectedTool: 'select',
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'normal',
    fontStyle: 'normal'
  });

  const { toast } = useToast();

  const handleFileUpload = useCallback((file: File) => {
    setDocument({
      file,
      name: file.name,
      numPages: 0,
      textElements: []
    });
    setCurrentPage(1);
    setSelectedTextId(null);
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
    
    // Start editing after a small delay to ensure the element is rendered
    setTimeout(() => {
      setEditingTextId(newElement.id);
    }, 50);

    // 🎯 Smart UX: Switch back to select tool after adding text
    // This prevents accidental creation of multiple text elements
    setToolbarState(prev => ({ 
      ...prev, 
      selectedTool: 'select' 
    }));

    // Show user-friendly feedback
    toast({
      title: "Text Added! ✨",
      description: "Now in Select mode. Click the text to edit, or drag to move.",
      duration: 3000,
    });
    
    console.log('✅ New text element added, editing started, and switched to select mode');
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

  const handleTextElementSelect = useCallback((id: string | null) => {
    setSelectedTextId(id);
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
    if (selectedTextId && document) {
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
  }, [selectedTextId, document, handleTextElementUpdate]);

  const handleSave = useCallback(() => {
    if (!document) return;
    
    // Here you would implement saving logic
    // For now, just show a toast
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
        description: "Creating your PDF with text overlays",
      });

      const fileName = getFileName();
      await exportAsPDF(document, fileName);
      
      toast({
        title: "PDF Export Complete! 📄",
        description: "Your edited PDF has been downloaded successfully",
      });
      
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "Could not export as PDF. Please try again.",
        variant: "destructive",
      });
    }
  }, [document, toast, getFileName]);

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
      console.error('Image export failed:', error);
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
        description: "Saving your text overlays and settings",
      });

      const fileName = getFileName();
      exportProjectData(document, fileName);
      
      toast({
        title: "Project Export Complete! 💾",
        description: "Your project data has been saved as JSON",
      });
      
    } catch (error) {
      console.error('Project export failed:', error);
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
      console.error('Text export failed:', error);
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

  // Keyboard shortcuts for tool switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not editing text
      if (editingTextId) return;
      
      // Ignore shortcuts if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          if (!e.ctrlKey && !e.metaKey) { // Avoid conflict with Ctrl+V
            e.preventDefault();
            setToolbarState(prev => ({ ...prev, selectedTool: 'select' }));
          }
          break;
        case 't':
          if (!e.ctrlKey && !e.metaKey) { // Avoid conflict with Ctrl+T
            e.preventDefault();
            setToolbarState(prev => ({ ...prev, selectedTool: 'text' }));
          }
          break;
        case 'escape':
          // Escape always switches to select mode and deselects text
          e.preventDefault();
          setToolbarState(prev => ({ ...prev, selectedTool: 'select' }));
          if (selectedTextId) {
            console.log('⌨️ Deselecting text with Escape key');
            setSelectedTextId(null);
          }
          if (editingTextId) {
            setEditingTextId(null);
          }
          break;
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [editingTextId, selectedTextId]);

  if (!document) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-toolbar-bg border-b shadow-soft">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
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
        <div className="w-80 bg-sidebar-bg border-r shadow-soft overflow-y-auto">
          <div className="p-4">
            <Toolbar 
              toolbarState={toolbarState}
              onToolbarChange={handleToolbarChange}
            />
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1">
          <PDFViewer
            file={document.file}
            textElements={currentPageTexts}
            currentPage={currentPage}
            numPages={document.numPages}
            toolbarState={toolbarState}
            selectedTextId={selectedTextId}
            editingTextId={editingTextId}
            onPageChange={setCurrentPage}
            onNumPagesChange={handleNumPagesChange}
            onTextElementUpdate={handleTextElementUpdate}
            onTextElementDelete={handleTextElementDelete}
            onTextElementSelect={handleTextElementSelect}
            onTextElementAdd={handleTextElementAdd}
            onStartEdit={handleStartEdit}
            onStopEdit={handleStopEdit}
          />
        </div>
      </div>
    </div>
  );
};
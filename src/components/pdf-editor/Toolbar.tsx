import React from 'react';
import { MousePointer2, Type, Bold, Italic, Palette, PenTool, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ToolbarState, SavedSignature } from '@/types/pdf-editor';

interface ToolbarProps {
  toolbarState: ToolbarState;
  onToolbarChange: (updates: Partial<ToolbarState>) => void;
  savedSignatures: SavedSignature[];
  onUseSavedSignature: (signature: SavedSignature) => void;
  onDeleteSavedSignature: (signatureId: string) => void;
  onClearSavedSignatures: () => void;
}

const fontFamilies = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
];

const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

const colors = [
  { value: '#000000', label: 'Black' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#FF0000', label: 'Red' },
  { value: '#00FF00', label: 'Green' },
  { value: '#0000FF', label: 'Blue' },
  { value: '#FFFF00', label: 'Yellow' },
  { value: '#FF00FF', label: 'Magenta' },
  { value: '#00FFFF', label: 'Cyan' },
  { value: '#FFA500', label: 'Orange' },
  { value: '#800080', label: 'Purple' },
];

const signatureCanvasSizes = [
  { width: 300, height: 150, label: 'Small (300×150)' },
  { width: 400, height: 200, label: 'Medium (400×200)' },
  { width: 500, height: 250, label: 'Large (500×250)' },
];

const signatureColors = [
  { value: '#000000', label: 'Black' },
  { value: '#0066CC', label: 'Blue' },
  { value: '#CC0000', label: 'Red' },
  { value: '#006600', label: 'Green' },
  { value: '#660066', label: 'Purple' },
  { value: '#CC6600', label: 'Orange' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ 
  toolbarState, 
  onToolbarChange,
  savedSignatures,
  onUseSavedSignature,
  onDeleteSavedSignature,
  onClearSavedSignatures
}) => {
  return (
    <div className="space-y-4">
      {/* Tool Selection */}
      <Card className="bg-toolbar-bg border-0 shadow-soft p-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tools</Label>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant={toolbarState.selectedTool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToolbarChange({ selectedTool: 'select' })}
              className="flex items-center justify-start gap-2 w-full"
            >
              <MousePointer2 className="w-4 h-4" />
              Select
            </Button>
            <Button
              variant={toolbarState.selectedTool === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToolbarChange({ selectedTool: 'text' })}
              className="flex items-center justify-start gap-2 w-full"
            >
              <Type className="w-4 h-4" />
              Add Text
            </Button>
            <Button
              variant={toolbarState.selectedTool === 'signature' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToolbarChange({ selectedTool: 'signature' })}
              className="flex items-center justify-start gap-2 w-full"
            >
              <PenTool className="w-4 h-4" />
              Add Signature
            </Button>
          </div>
        </div>
      </Card>

      {/* Signature Settings - Only show when signature tool is selected */}
      {toolbarState.selectedTool === 'signature' && (
        <Card className="bg-toolbar-bg border-0 shadow-soft p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Signature Settings
            </Label>
            
            {/* Signature Color */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Signature Color</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {signatureColors.map((color) => (
                  <button
                    key={color.value}
                    className={`
                      w-full h-8 rounded border-2 transition-all flex items-center justify-center
                      ${toolbarState.signatureColor === color.value 
                        ? 'border-primary scale-105 shadow-sm ring-1 ring-primary/20' 
                        : 'border-muted hover:border-muted-foreground hover:scale-102'
                      }
                    `}
                    style={{ backgroundColor: color.value }}
                    onClick={() => onToolbarChange({ signatureColor: color.value })}
                    title={color.label}
                  >
                    {toolbarState.signatureColor === color.value && (
                      <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Signature Canvas Size */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Canvas Size</Label>
              <Select 
                value={`${toolbarState.signatureCanvasWidth}x${toolbarState.signatureCanvasHeight}`} 
                onValueChange={(value) => {
                  const [width, height] = value.split('x').map(Number);
                  onToolbarChange({ 
                    signatureCanvasWidth: width, 
                    signatureCanvasHeight: height 
                  });
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {signatureCanvasSizes.map((size) => (
                    <SelectItem key={`${size.width}x${size.height}`} value={`${size.width}x${size.height}`}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Saved Signatures */}
            {savedSignatures.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Saved Signatures ({savedSignatures.length}/10)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSavedSignatures}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {savedSignatures.map((signature) => (
                    <div
                      key={signature.id}
                      className="relative group bg-white border border-muted rounded p-2 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => onUseSavedSignature(signature)}
                    >
                      <div className="aspect-[2/1] flex items-center justify-center bg-muted/30 rounded mb-1">
                        <img
                          src={signature.imageData}
                          alt={signature.name}
                          className="max-w-full max-h-full object-contain"
                          style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))' }}
                        />
                      </div>
                      <div className="text-xs text-center text-muted-foreground truncate">
                        {signature.name}
                      </div>
                      
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSavedSignature(signature.id);
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive hover:bg-destructive/90 text-white rounded-full"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 p-3 rounded leading-relaxed">
              <div className="font-medium text-blue-800 mb-1">💡 Pro Tips:</div>
              <ul className="space-y-1 text-blue-700">
                <li>• Draw signature, then click PDF to place</li>
                <li>• Signatures auto-save for reuse</li>
                <li>• Drag corners to resize (maintains aspect ratio)</li>
                <li>• Use green handle to rotate</li>
                <li>• <kbd className="px-1 bg-blue-100 rounded text-xs">Ctrl+D</kbd> to duplicate</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Text Formatting - Only show when text tool is selected */}
      {toolbarState.selectedTool === 'text' && (
        <Card className="bg-toolbar-bg border-0 shadow-soft p-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Text Formatting</Label>
            
            {/* Font Family */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Font</Label>
              <Select 
                value={toolbarState.fontFamily} 
                onValueChange={(value) => onToolbarChange({ fontFamily: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <Select 
                value={toolbarState.fontSize.toString()} 
                onValueChange={(value) => onToolbarChange({ fontSize: parseInt(value) })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Style */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Style</Label>
              <div className="flex gap-2">
                <Button
                  variant={toolbarState.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolbarChange({ 
                    fontWeight: toolbarState.fontWeight === 'bold' ? 'normal' : 'bold' 
                  })}
                  className="flex-1"
                >
                  <Bold className="w-3 h-3" />
                </Button>
                <Button
                  variant={toolbarState.fontStyle === 'italic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onToolbarChange({ 
                    fontStyle: toolbarState.fontStyle === 'italic' ? 'normal' : 'italic' 
                  })}
                  className="flex-1"
                >
                  <Italic className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    className={`
                      w-8 h-8 rounded border-2 transition-all
                      ${toolbarState.color === color.value 
                        ? 'border-primary scale-110 shadow-sm' 
                        : 'border-muted hover:border-muted-foreground hover:scale-105'
                      }
                    `}
                    style={{ backgroundColor: color.value }}
                    onClick={() => onToolbarChange({ color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Keyboard Shortcuts Help */}
      <Card className="bg-muted/30 border-0 p-3">
        <Label className="text-xs font-medium mb-2 block">Keyboard Shortcuts</Label>
        <div className="text-xs text-muted-foreground space-y-1">
          <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">V</kbd> Select Tool</div>
          <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">T</kbd> Text Tool</div>
          <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">S</kbd> Signature Tool</div>
          <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+D</kbd> Duplicate Selected</div>
          <div><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> Deselect All</div>
        </div>
      </Card>
    </div>
  );
};
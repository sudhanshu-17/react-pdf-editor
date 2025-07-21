import React from 'react';
import { MousePointer2, Type, Bold, Italic, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ToolbarState } from '@/types/pdf-editor';

interface ToolbarProps {
  toolbarState: ToolbarState;
  onToolbarChange: (updates: Partial<ToolbarState>) => void;
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

export const Toolbar: React.FC<ToolbarProps> = ({ toolbarState, onToolbarChange }) => {
  return (
    <Card className="bg-toolbar-bg border-0 shadow-soft">
      <div className="p-4 space-y-4">
        {/* Tool Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tools</Label>
          <div className="flex gap-1">
            <Button
              variant={toolbarState.selectedTool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToolbarChange({ selectedTool: 'select' })}
              className={`flex items-center gap-2 transition-all ${
                toolbarState.selectedTool === 'select' ? 'ring-2 ring-primary/20' : ''
              }`}
              title="Select and move text elements (V)"
            >
              <MousePointer2 className="w-4 h-4" />
              <span>Select</span>
              {toolbarState.selectedTool === 'select' && (
                <span className="text-xs opacity-60">(V)</span>
              )}
            </Button>
            <Button
              variant={toolbarState.selectedTool === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onToolbarChange({ selectedTool: 'text' })}
              className={`flex items-center gap-2 transition-all ${
                toolbarState.selectedTool === 'text' ? 'ring-2 ring-primary/20' : ''
              }`}
              title="Click on PDF to add new text (T)"
            >
              <Type className="w-4 h-4" />
              <span>Text</span>
              {toolbarState.selectedTool === 'text' && (
                <span className="text-xs opacity-60">(T)</span>
              )}
            </Button>
          </div>
          {toolbarState.selectedTool === 'text' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-xs animate-pulse">
              <div className="flex items-center gap-2 text-blue-700">
                <span>🎯</span>
                <strong>Text Mode Active</strong>
              </div>
              <p className="text-blue-600 mt-1">
                Click anywhere on the PDF to place new text at that exact position
              </p>
              <p className="text-blue-500 text-[10px] mt-1 opacity-75">
                💡 Will auto-switch to Select mode after placing text
              </p>
            </div>
          )}
          {toolbarState.selectedTool === 'select' && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1">
                <span>✨</span>
                <span>Click text to edit • Drag to move • Click empty space to deselect</span>
              </p>
              <p className="text-[10px] opacity-75">
                <strong>Shortcuts:</strong> V = Select • T = Text • ESC = Deselect & Select
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Export Info */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Export Options</Label>
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1">
              <span>📄</span>
              <span><strong>PDF Export:</strong> Real PDF with text overlays ✨</span>
            </p>
            <p className="flex items-center gap-1">
              <span>📸</span>
              <span><strong>PNG Image:</strong> Alternative format</span>
            </p>
            <p className="flex items-center gap-1">
              <span>💾</span>
              <span><strong>Project Data:</strong> Save your work</span>
            </p>
            <p className="flex items-center gap-1">
              <span>📊</span>
              <span><strong>Text Data:</strong> Export as spreadsheet</span>
            </p>
          </div>
        </div>

        <Separator />

        {/* Text Formatting */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Text Formatting</Label>
          
          {/* Font Family */}
          <div className="space-y-1">
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
          <div className="space-y-1">
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Style</Label>
            <div className="flex gap-1">
              <Button
                variant={toolbarState.fontWeight === 'bold' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolbarChange({ 
                  fontWeight: toolbarState.fontWeight === 'bold' ? 'normal' : 'bold' 
                })}
                className="p-2"
              >
                <Bold className="w-3 h-3" />
              </Button>
              <Button
                variant={toolbarState.fontStyle === 'italic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToolbarChange({ 
                  fontStyle: toolbarState.fontStyle === 'italic' ? 'normal' : 'italic' 
                })}
                className="p-2"
              >
                <Italic className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <div className="grid grid-cols-5 gap-1">
              {colors.map((color) => (
                <button
                  key={color.value}
                  className={`
                    w-6 h-6 rounded border-2 transition-all
                    ${toolbarState.color === color.value 
                      ? 'border-primary scale-110' 
                      : 'border-muted hover:border-muted-foreground'
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
      </div>
    </Card>
  );
};
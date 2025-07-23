import React, { useRef, useState, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Undo2, Check, X, Palette } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SignatureCanvasProps {
  width: number;
  height: number;
  color: string;
  onSave: (imageData: string) => void;
  onCancel: () => void;
}

const signatureColors = [
  { value: '#000000', label: 'Black' },
  { value: '#0066CC', label: 'Blue' },
  { value: '#CC0000', label: 'Red' },
  { value: '#006600', label: 'Green' },
  { value: '#660066', label: 'Purple' },
  { value: '#CC6600', label: 'Orange' },
];

export const SignatureCanvasComponent: React.FC<SignatureCanvasProps> = ({
  width,
  height,
  color,
  onSave,
  onCancel
}) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState(color);
  const isMobile = useIsMobile();

  const handleBegin = useCallback(() => {
    setIsEmpty(false);
  }, []);

  const handleEnd = useCallback(() => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setIsEmpty(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setIsEmpty(true);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      // Get high-quality PNG data
      const imageData = signatureRef.current.toDataURL('image/png', 1.0);
      onSave(imageData);
    }
  }, [onSave]);

  const handleUndo = useCallback(() => {
    if (signatureRef.current) {
      const data = signatureRef.current.toData();
      if (data.length > 0) {
        data.pop();
        signatureRef.current.fromData(data);
        setIsEmpty(data.length === 0);
      }
    }
  }, []);

  const handleColorChange = useCallback((newColor: string) => {
    setPenColor(newColor);
    // If there's existing drawing, we need to redraw with new color
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const existingData = signatureRef.current.toData();
      signatureRef.current.clear();
      signatureRef.current.fromData(existingData);
    }
  }, []);

  // Adjust canvas dimensions for mobile
  const canvasWidth = isMobile ? Math.min(width, window.innerWidth - 32) : width;
  const canvasHeight = isMobile ? Math.min(height, 150) : height;

  return (
    <Card className={`bg-white shadow-large max-w-2xl mx-auto ${isMobile ? 'p-3 m-2' : 'p-6'}`}>
      <div className={`space-y-${isMobile ? '3' : '4'}`}>
        <div className="flex items-center justify-between">
          <Label className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold flex items-center gap-2`}>
            <Palette className="w-5 h-5" />
            Draw Your Signature
          </Label>
          <div className={`flex gap-${isMobile ? '2' : '2'}`}>
            <Button
              variant="outline"
              size={isMobile ? 'default' : 'sm'}
              onClick={handleUndo}
              disabled={isEmpty}
              className={isMobile ? 'h-10 px-3' : ''}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              <span className={isMobile ? '' : 'hidden sm:inline'}>Undo</span>
            </Button>
            <Button
              variant="outline"
              size={isMobile ? 'default' : 'sm'}
              onClick={handleClear}
              disabled={isEmpty}
              className={isMobile ? 'h-10 px-3' : ''}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className={isMobile ? '' : 'hidden sm:inline'}>Clear</span>
            </Button>
          </div>
        </div>

        {/* Color Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Signature Color</Label>
          <div className={`flex ${isMobile ? 'gap-3 justify-center' : 'gap-2'}`}>
            {signatureColors.map((colorOption) => (
              <button
                key={colorOption.value}
                className={`
                  ${isMobile ? 'w-12 h-12' : 'w-8 h-8'} rounded-full border-2 transition-all
                  ${penColor === colorOption.value 
                    ? 'border-primary scale-110 shadow-md' 
                    : 'border-muted hover:border-muted-foreground hover:scale-105'
                  }
                `}
                style={{ backgroundColor: colorOption.value }}
                onClick={() => handleColorChange(colorOption.value)}
                title={colorOption.label}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Signature Canvas */}
        <div className="flex justify-center">
          <div 
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white w-full max-w-full overflow-hidden"
            style={{ padding: isMobile ? '4px' : '8px' }}
          >
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                width: canvasWidth,
                height: canvasHeight,
                className: 'signature-canvas',
                style: { 
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  cursor: 'crosshair',
                  maxWidth: '100%',
                  height: 'auto',
                  touchAction: 'none', // Prevent scrolling on touch
                }
              }}
              backgroundColor="rgba(255,255,255,0)" // Transparent background for PNG
              penColor={penColor}
              minWidth={isMobile ? 2.0 : 1.0}
              maxWidth={isMobile ? 4.0 : 3.0}
              velocityFilterWeight={0.7}
              onBegin={handleBegin}
              onEnd={handleEnd}
            />
          </div>
        </div>

        <div className={`text-center ${isMobile ? 'text-sm' : 'text-sm'} text-muted-foreground`}>
          {isMobile ? 'Draw your signature with your finger or stylus.' : 'Draw your signature with the selected color. Use a smooth, natural motion.'}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className={isMobile ? 'h-12 px-4 flex-1' : ''}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isEmpty}
            className={`bg-primary hover:bg-primary/90 ${isMobile ? 'h-12 px-4 flex-1' : ''}`}
          >
            <Check className="w-4 h-4 mr-2" />
            Add Signature
          </Button>
        </div>
      </div>
    </Card>
  );
}; 
import React, { useState, useRef, useCallback, useMemo } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { SignatureElement } from '@/types/pdf-editor';
import { X, Move, RotateCcw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraggableSignatureProps {
  signatureElement: SignatureElement;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<SignatureElement>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  scale: number;
}

// Throttle function for performance optimization
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

export const DraggableSignature: React.FC<DraggableSignatureProps> = ({
  signatureElement,
  isSelected,
  onUpdate,
  onDelete,
  onSelect,
  scale
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Throttled drag handler for performance optimization
  const throttledDragHandler = useMemo(
    () => throttle((data: DraggableData) => {
      onUpdate(signatureElement.id, {
        x: data.x / scale,
        y: data.y / scale
      });
    }, 16), // ~60fps throttling
    [signatureElement.id, scale, onUpdate]
  );

  const handleDrag = useCallback((e: DraggableEvent, data: DraggableData) => {
    e.preventDefault();
    throttledDragHandler(data);
  }, [throttledDragHandler]);

  const handleStart = useCallback((e: DraggableEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    onSelect(signatureElement.id);
  }, [signatureElement.id, onSelect]);

  const handleStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onSelect(signatureElement.id);
  }, [signatureElement.id, onSelect]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(signatureElement.id);
  }, [signatureElement.id, onDelete]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = signatureElement.width;
    const startHeight = signatureElement.height;
    const aspectRatio = startWidth / startHeight;

    const handleMouseMove = (moveE: MouseEvent) => {
      const deltaX = (moveE.clientX - startX) / scale;
      const deltaY = (moveE.clientY - startY) / scale;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (corner.includes('e')) newWidth = Math.max(20, startWidth + deltaX);
      if (corner.includes('w')) newWidth = Math.max(20, startWidth - deltaX);
      if (corner.includes('s')) newHeight = Math.max(10, startHeight + deltaY);
      if (corner.includes('n')) newHeight = Math.max(10, startHeight - deltaY);

      // Maintain aspect ratio on corner resize
      if (corner.length === 2) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }

      onUpdate(signatureElement.id, {
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [signatureElement.id, signatureElement.width, signatureElement.height, scale, onUpdate]);

  // MUCH SIMPLER rotation handler
  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Get initial angle between center and starting mouse position
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const startRotation = signatureElement.rotation || 0;

    const handleMouseMove = (moveE: MouseEvent) => {
      // Calculate current angle
      const currentAngle = Math.atan2(moveE.clientY - centerY, moveE.clientX - centerX) * (180 / Math.PI);
      
      // Calculate the difference
      let angleDiff = currentAngle - startAngle;
      
      // Calculate new rotation
      let newRotation = startRotation + angleDiff;
      
      // Normalize to 0-360 range
      newRotation = ((newRotation % 360) + 360) % 360;
      
      // Snap to 15-degree increments when shift is held
      if (moveE.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }
      
      onUpdate(signatureElement.id, { rotation: Math.round(newRotation) });
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [signatureElement.id, signatureElement.rotation, onUpdate]);

  // Calculate scaled dimensions and positioning
  const scaledWidth = Math.max(20, signatureElement.width * scale);
  const scaledHeight = Math.max(10, signatureElement.height * scale);
  const scaledX = signatureElement.x * scale;
  const scaledY = signatureElement.y * scale;

  // Get rotation value (ensure it's a number)
  const rotationDegrees = typeof signatureElement.rotation === 'number' ? signatureElement.rotation : 0;

  return (
    <Draggable
      nodeRef={containerRef}
      position={{ x: scaledX, y: scaledY }}
      onDrag={handleDrag}
      onStart={handleStart}
      onStop={handleStop}
      handle=".signature-drag-handle"
      bounds="parent"
      grid={[1, 1]}
      disabled={isResizing || isRotating}
    >
      <div
        ref={containerRef}
        data-signature-overlay="true"
        data-signature-id={signatureElement.id}
        className={`
          absolute group transition-all duration-200 will-change-transform
          ${isSelected 
            ? 'ring-2 ring-blue-500/70 z-20 shadow-lg' 
            : 'z-10 hover:shadow-sm'
          }
          ${isDragging || isResizing || isRotating ? 'shadow-large cursor-grabbing z-30' : ''}
        `}
        onClick={handleClick}
        style={{ 
          width: scaledWidth,
          height: scaledHeight,
          transform: `rotate(${rotationDegrees}deg) ${isDragging ? 'scale(1.02)' : isSelected ? 'scale(1.01)' : 'scale(1)'}`,
          transformOrigin: 'center center',
          transition: isDragging || isResizing || isRotating ? 'none' : 'transform 200ms ease-out',
          pointerEvents: 'auto',
          opacity: signatureElement.opacity || 1
        }}
      >
        {/* Signature Image */}
        <img
          src={signatureElement.imageData}
          alt="Signature"
          className="w-full h-full object-contain signature-drag-handle"
          style={{
            cursor: isDragging ? 'grabbing' : isRotating ? 'grabbing' : 'grab',
            filter: isSelected ? 'brightness(1.05)' : undefined,
            imageRendering: 'auto'
          }}
          draggable={false}
        />

        {/* Control Handles - only visible when selected */}
        {isSelected && (
          <>
            {/* Main control bar */}
            <div className="absolute -top-12 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
              <div className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs shadow-lg">
                <Move className="w-3 h-3 signature-drag-handle cursor-grab" />
                <span className="text-xs">Signature</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-4 w-4 p-0 text-white hover:bg-white/20 hover:text-white ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Resize handles */}
            {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((corner) => (
              <div
                key={corner}
                className={`absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-${corner === 'n' || corner === 's' ? 'ns' : corner === 'e' || corner === 'w' ? 'ew' : corner.includes('n') ? (corner.includes('w') ? 'nw' : 'ne') : (corner.includes('w') ? 'sw' : 'se')}-resize hover:bg-blue-600 transition-colors opacity-80 hover:opacity-100`}
                style={{
                  top: corner.includes('n') ? '-6px' : corner.includes('s') ? 'calc(100% - 6px)' : '50%',
                  left: corner.includes('w') ? '-6px' : corner.includes('e') ? 'calc(100% - 6px)' : '50%',
                  transform: corner.length === 1 ? 'translate(-50%, -50%)' : undefined
                }}
                onMouseDown={(e) => handleResizeStart(e, corner)}
              />
            ))}

            {/* Rotation handle */}
            <div
              className="absolute w-8 h-8 bg-green-500 border-3 border-white rounded-full cursor-grab hover:bg-green-600 transition-all flex items-center justify-center opacity-90 hover:opacity-100 shadow-lg hover:scale-110"
              style={{
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100
              }}
              onMouseDown={handleRotateStart}
              title="Drag to rotate signature"
            >
              <RotateCcw className="w-4 h-4 text-white" />
            </div>

            {/* Selection indicator */}
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm pointer-events-none" />

            {/* Size and rotation info */}
            <div className="absolute -bottom-8 left-0 bg-black/80 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {Math.round(signatureElement.width)}×{Math.round(signatureElement.height)}px • {Math.round(rotationDegrees)}°
              {isRotating && <span className="text-green-300 ml-2">🔄 Rotating</span>}
            </div>
          </>
        )}
      </div>
    </Draggable>
  );
}; 
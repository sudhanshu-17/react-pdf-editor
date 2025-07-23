import React, { useState, useRef, useCallback, useMemo } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { SignatureElement } from '@/types/pdf-editor';
import { X, Move, RotateCcw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface DraggableSignatureProps {
  signatureElement: SignatureElement;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<SignatureElement>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  scale: number;
}

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
  const isMobile = useIsMobile();

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    // Handle both mouse and touch events
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const startX = clientX;
    const startY = clientY;
    const startWidth = signatureElement.width;
    const startHeight = signatureElement.height;
    const aspectRatio = startWidth / startHeight;

    const handleMouseMove = (moveE: MouseEvent | TouchEvent) => {
      moveE.preventDefault();

      const moveClientX = 'touches' in moveE ? moveE.touches[0].clientX : moveE.clientX;
      const moveClientY = 'touches' in moveE ? moveE.touches[0].clientY : moveE.clientY;

      const deltaX = (moveClientX - startX) / scale;
      const deltaY = (moveClientY - startY) / scale;

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
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };

    // Add both mouse and touch listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
  }, [signatureElement.id, signatureElement.width, signatureElement.height, scale, onUpdate]);

  // Rotation handler
  const handleRotateStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Handle both mouse and touch events
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Get initial angle between center and starting position
    const startAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    const startRotation = signatureElement.rotation || 0;

    const handleMouseMove = (moveE: MouseEvent | TouchEvent) => {
      moveE.preventDefault();

      const moveClientX = 'touches' in moveE ? moveE.touches[0].clientX : moveE.clientX;
      const moveClientY = 'touches' in moveE ? moveE.touches[0].clientY : moveE.clientY;

      // Calculate current angle
      const currentAngle = Math.atan2(moveClientY - centerY, moveClientX - centerX) * (180 / Math.PI);
      
      // Calculate the difference
      let angleDiff = currentAngle - startAngle;
      
      // Calculate new rotation
      let newRotation = startRotation + angleDiff;
      
      // Normalize to 0-360 range
      newRotation = ((newRotation % 360) + 360) % 360;

      // Snap to 15-degree increments when shift is held (desktop only)
      if ('shiftKey' in moveE && moveE.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }

      onUpdate(signatureElement.id, { rotation: Math.round(newRotation) });
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };

    // Add both mouse and touch listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
  }, [signatureElement.id, signatureElement.rotation, onUpdate]);

  // Draggable event handlers
  const handleDrag = useCallback((e: DraggableEvent, data: DraggableData) => {
    onUpdate(signatureElement.id, {
      x: data.x / scale,
      y: data.y / scale
    });
  }, [signatureElement.id, scale, onUpdate]);

  const handleStart = useCallback((e: DraggableEvent) => {
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (error) {
      // Ignore passive event listener errors
    }
    setIsDragging(true);
    onSelect(signatureElement.id);
  }, [signatureElement.id, onSelect]);

  const handleStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Calculate scaled dimensions and positioning
  const scaledWidth = Math.max(20, signatureElement.width * scale);
  const scaledHeight = Math.max(10, signatureElement.height * scale);
  const scaledX = signatureElement.x * scale;
  const scaledY = signatureElement.y * scale;
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
            {/* Resize handles */}
            {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((corner) => (
              <div
                key={corner}
                className={`absolute ${isMobile ? 'w-5 h-5' : 'w-3 h-3'} bg-blue-500 border-2 border-white rounded-full cursor-${corner === 'n' || corner === 's' ? 'ns' : corner === 'e' || corner === 'w' ? 'ew' : corner.includes('n') ? (corner.includes('w') ? 'nw' : 'ne') : (corner.includes('w') ? 'sw' : 'se')}-resize hover:bg-blue-600 transition-colors opacity-80 hover:opacity-100`}
                style={{
                  top: corner.includes('n') ? (isMobile ? '-10px' : '-6px') : corner.includes('s') ? (isMobile ? 'calc(100% - 10px)' : 'calc(100% - 6px)') : '50%',
                  left: corner.includes('w') ? (isMobile ? '-10px' : '-6px') : corner.includes('e') ? (isMobile ? 'calc(100% - 10px)' : 'calc(100% - 6px)') : '50%',
                  transform: corner.length === 1 ? 'translate(-50%, -50%)' : undefined
                }}
                onMouseDown={(e) => handleResizeStart(e, corner)}
                onTouchStart={(e) => handleResizeStart(e, corner)}
              />
            ))}

            {/* Rotation handle */}
            <div
              className={`absolute ${isMobile ? 'w-10 h-10' : 'w-8 h-8'} bg-green-500 border-3 border-white rounded-full cursor-grab hover:bg-green-600 transition-all flex items-center justify-center opacity-90 hover:opacity-100 shadow-lg hover:scale-110`}
              style={{
                top: isMobile ? '-35px' : '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100
              }}
              onMouseDown={handleRotateStart}
              onTouchStart={handleRotateStart}
            >
              <RotateCcw className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
            </div>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(signatureElement.id);
              }}
              className={`
                absolute -top-2 -right-2 
                ${isMobile ? 'w-8 h-8' : 'w-6 h-6'} p-0 
                opacity-0 group-hover:opacity-100 transition-opacity 
                bg-destructive hover:bg-destructive/90 text-white rounded-full
              `}
            >
              <X className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
            </Button>

            {/* Size and rotation info */}
            <div className={`
              absolute -bottom-8 left-0 
              bg-black/80 text-white px-2 py-1 rounded 
              ${isMobile ? 'text-sm' : 'text-xs'} 
              opacity-0 group-hover:opacity-100 transition-opacity 
              pointer-events-none whitespace-nowrap
            `}>
              {Math.round(signatureElement.width)}×{Math.round(signatureElement.height)}px • {Math.round(rotationDegrees)}°
              {isRotating && <span className="text-green-300 ml-2">🔄 Rotating</span>}
            </div>
          </>
        )}
      </div>
    </Draggable>
  );
}; 
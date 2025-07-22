import React, { useState, useRef, useCallback } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { TextElement } from '@/types/pdf-editor';
import { X, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraggableTextProps {
  textElement: TextElement;
  isSelected: boolean;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<TextElement>) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  scale: number;
}

export const DraggableText: React.FC<DraggableTextProps> = ({
  textElement,
  isSelected,
  isEditing,
  onUpdate,
  onDelete,
  onSelect,
  onStartEdit,
  onStopEdit,
  scale
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Optimized drag handler with useCallback
  const handleDrag = useCallback((e: DraggableEvent, data: DraggableData) => {
    // Prevent page scrolling during drag
    e.preventDefault();
    
    onUpdate(textElement.id, {
      x: data.x / scale,
      y: data.y / scale
    });
  }, [textElement.id, scale, onUpdate]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onStartEdit(textElement.id);
  }, [textElement.id, onStartEdit]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(textElement.id, { content: e.target.value });
  }, [textElement.id, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onStopEdit();
    }
    if (e.key === 'Escape') {
      onStopEdit();
    }
  }, [onStopEdit]);

  const handleStart = useCallback((e: DraggableEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    onSelect(textElement.id);
  }, [textElement.id, onSelect]);

  const handleStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onSelect(textElement.id);
  }, [textElement.id, onSelect]);

  const textStyle = {
    fontSize: `${textElement.fontSize * scale}px`,
    fontFamily: textElement.fontFamily,
    color: textElement.color,
    fontWeight: textElement.fontWeight,
    fontStyle: textElement.fontStyle,
    userSelect: 'none' as const,
    cursor: isEditing ? 'text' : 'move',
    lineHeight: '1.2',
  };

  return (
    <Draggable
      nodeRef={containerRef}
      position={{ x: textElement.x * scale, y: textElement.y * scale }}
      onDrag={handleDrag}
      onStart={handleStart}
      onStop={handleStop}
      disabled={isEditing}
      handle=".drag-handle"
      bounds="parent"
      grid={[1, 1]}
    >
      <div
        ref={containerRef}
        data-text-overlay="true"
        data-text-id={textElement.id}
        className={`
          absolute group transition-all duration-200 will-change-transform
          ${isSelected 
            ? 'ring-2 ring-primary/50 z-20 shadow-sm' 
            : 'z-10 hover:shadow-sm'
          }
          ${isDragging ? 'shadow-large cursor-grabbing z-30' : ''}
          ${isEditing ? 'z-40 ring-2 ring-blue-500/70' : ''}
        `}
        onClick={handleClick}
        style={{ 
          transform: isDragging ? 'scale(1.02)' : isSelected ? 'scale(1.01)' : 'scale(1)',
          transition: isDragging ? 'none' : 'all 200ms ease-out',
          pointerEvents: 'auto' // Re-enable pointer events for text elements
        }}
      >
        {/* Drag Handle - only visible when selected */}
        {isSelected && !isEditing && (
          <div className="drag-handle absolute -top-8 -left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded text-xs shadow-md">
              <Move className="w-3 h-3 cursor-grab" />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(textElement.id);
                }}
                className="h-4 w-4 p-0 text-white hover:bg-white/20 hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Text Content */}
        {isEditing ? (
          <input
            ref={textRef as any}
            type="text"
            value={textElement.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={onStopEdit}
            autoFocus
            style={textStyle}
            className="bg-transparent border-none outline-none min-w-[100px] ring-2 ring-blue-500/70 rounded px-1"
          />
        ) : (
          <div
            ref={textRef}
            style={textStyle}
            onDoubleClick={handleDoubleClick}
            className={`
              min-w-[20px] min-h-[20px] whitespace-nowrap px-1 py-0.5 rounded
              transition-all duration-150
              ${isSelected 
                ? 'bg-primary/10 ring-1 ring-primary/50' 
                : 'hover:bg-primary/5 hover:ring-1 hover:ring-primary/30'
              }
              cursor-${isEditing ? 'text' : 'move'}
            `}
          >
            {textElement.content || 'Double click to edit'}
          </div>
        )}
      </div>
    </Draggable>
  );
};
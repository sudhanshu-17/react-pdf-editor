import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface PDFUploadProps {
  onFileUpload: (file: File) => void;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({ onFileUpload }) => {
  const isMobile = useIsMobile();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  return (
    <div className={`flex items-center justify-center ${isMobile ? 'min-h-[50vh] px-2' : 'min-h-[60vh]'}`}>
      <Card className={`w-full ${isMobile ? 'max-w-sm p-4' : 'max-w-md p-8'} text-center`}>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg cursor-pointer 
            transition-all duration-300 ease-in-out
            ${isDragActive 
              ? 'border-primary bg-accent/50 scale-105' 
              : 'border-muted-foreground/25 hover:border-primary hover:bg-accent/20'
            }
            ${isMobile ? 'p-6' : 'p-8'}
          `}
        >
          <input {...getInputProps()} />
          <div className={`flex flex-col items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
            {isDragActive ? (
              <Upload className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} text-primary animate-bounce`} />
            ) : (
              <FileText className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} text-muted-foreground`} />
            )}
            
            <div className="space-y-2">
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>
                {isDragActive ? 'Drop your PDF here' : 'Upload PDF Document'}
              </h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                {isMobile 
                  ? 'Tap to select a PDF file' 
                  : 'Drag and drop a PDF file here, or click to select'
                }
              </p>
            </div>
            
            <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
              Supports PDF files up to 10MB
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
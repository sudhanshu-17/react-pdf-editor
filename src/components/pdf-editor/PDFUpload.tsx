import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface PDFUploadProps {
  onFileUpload: (file: File) => void;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({ onFileUpload }) => {
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
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md p-8 text-center">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 cursor-pointer 
            transition-all duration-300 ease-in-out
            ${isDragActive 
              ? 'border-primary bg-accent/50 scale-105' 
              : 'border-muted-foreground/25 hover:border-primary hover:bg-accent/20'
            }
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {isDragActive ? (
              <Upload className="w-12 h-12 text-primary animate-bounce" />
            ) : (
              <FileText className="w-12 h-12 text-muted-foreground" />
            )}
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {isDragActive ? 'Drop your PDF here' : 'Upload PDF Document'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop a PDF file here, or click to select
              </p>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Supports PDF files up to 10MB
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Question } from "@/lib/types";
import { UploadCloud, File, X, Loader2 } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FileUploadFieldProps {
  question: Question;
  onFileChange: (questionId: string, file: File | null) => void;
}

export function FileUploadField({ question, onFileChange }: FileUploadFieldProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (selectedFile: File | null) => {
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        const errorMessage = "Invalid file type. Please upload a PDF.";
        setError(errorMessage);
        toast({ title: "Upload Error", description: errorMessage, variant: "destructive" });
        setFile(null);
        onFileChange(question.id, null);
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        const errorMessage = `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`;
        setError(errorMessage);
        toast({ title: "Upload Error", description: errorMessage, variant: "destructive" });
        setFile(null);
        onFileChange(question.id, null);
        return;
      }
      setError(null);
      setFile(selectedFile);
      onFileChange(question.id, selectedFile);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    onFileChange(question.id, null);
    if (inputRef.current) {
        inputRef.current.value = "";
    }
  };

  if (file) {
    return (
      <div className="w-full flex items-center justify-between p-3 rounded-md border bg-secondary">
        <div className="flex items-center gap-3">
          <File className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={removeFile}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary transition-colors",
        isDragging ? "border-primary bg-primary/10" : "border-input",
        error ? "border-destructive" : ""
      )}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center space-y-2">
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">PDF only, max 10MB</p>
      </div>
      <Input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)}
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

"use client";

import { Question } from "@/lib/types";
import { TextField } from "./fields/text-field";
import { ParagraphField } from "./fields/paragraph-field";
import { MultipleChoiceField } from "./fields/multiple-choice-field";
import { CheckboxField } from "./fields/checkbox-field";
import { FileUploadField } from "./fields/file-upload-field";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { useFormContext } from "react-hook-form";

interface QuestionRendererProps {
  question: Question;
  onFileChange: (questionId: string, file: File | null) => void;
}

export function QuestionRenderer({ question, onFileChange }: QuestionRendererProps) {
  const { control } = useFormContext();

  const renderField = (field: any) => {
    switch (question.type) {
      case "TEXT":
        return <TextField field={field} question={question} />;
      case "PARAGRAPH":
        return <ParagraphField field={field} question={question} />;
      case "MULTIPLE_CHOICE":
        return <MultipleChoiceField field={field} question={question} />;
      case "CHECKBOX":
        return <CheckboxField field={field} question={question} />;
      case "FILE_UPLOAD":
        return <FileUploadField question={question} onFileChange={onFileChange} />;
      default:
        return null;
    }
  };

  return (
    <FormField
      control={control}
      name={question.id}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-base font-semibold">
            {question.title}
            {question.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>{renderField(field)}</FormControl>
          <FormDescription>
            {/* You can add descriptions to your question schema if needed */}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

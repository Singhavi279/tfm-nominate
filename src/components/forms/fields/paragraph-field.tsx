"use client";

import { Textarea } from "@/components/ui/textarea";
import { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { getAIAssistance } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

interface ParagraphFieldProps {
  field: any;
  question: Question;
}

export function ParagraphField({ field, question }: ParagraphFieldProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { setValue } = useFormContext();
  const { toast } = useToast();

  const handleAiAction = async (action: 'suggest_phrasing' | 'expand_bullet_points' | 'summarize') => {
    setIsAiLoading(true);
    const result = await getAIAssistance({
      text: field.value,
      action: action,
      context: `The user is answering the following question in an award nomination: "${question.title}"`
    });

    if (result.suggestedText) {
      setValue(question.id, result.suggestedText, { shouldDirty: true });
    } else {
      toast({
        title: "AI Assistant Error",
        description: result.error || "Could not process text.",
        variant: "destructive"
      });
    }
    setIsAiLoading(false);
  };

  return (
    <div className="relative">
      <Textarea
        {...field}
        placeholder="Provide a detailed answer..."
        className="min-h-[150px] pr-12"
      />
      <div className="absolute top-2 right-2">
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isAiLoading || !field.value}>
                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    <span className="sr-only">AI Assistant</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleAiAction('suggest_phrasing')}>Improve Phrasing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAiAction('expand_bullet_points')}>Expand Bullet Points</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAiAction('summarize')}>Summarize</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

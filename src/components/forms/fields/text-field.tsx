"use client";

import { Input } from "@/components/ui/input";
import { Question } from "@/lib/types";

interface TextFieldProps {
  field: any;
  question: Question;
}

export function TextField({ field, question }: TextFieldProps) {
  return <Input {...field} placeholder={`Your answer for "${question.title}"`} />;
}

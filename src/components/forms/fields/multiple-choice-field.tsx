"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Question } from "@/lib/types";
import { FormControl } from "@/components/ui/form";

interface MultipleChoiceFieldProps {
  field: any;
  question: Question;
}

export function MultipleChoiceField({ field, question }: MultipleChoiceFieldProps) {
  return (
    <RadioGroup
      onValueChange={field.onChange}
      defaultValue={field.value}
      className="flex flex-col space-y-2"
    >
      {question.options?.map((option) => (
        <div key={option} className="flex items-center space-x-3">
          <FormControl>
            <RadioGroupItem value={option} />
          </FormControl>
          <Label className="font-normal">{option}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}

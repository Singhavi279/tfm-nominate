"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Question } from "@/lib/types";
import { FormControl } from "@/components/ui/form";

interface CheckboxFieldProps {
  field: any;
  question: Question;
}

export function CheckboxField({ field, question }: CheckboxFieldProps) {
    const value = field.value || [];
    return (
        <div className="space-y-2">
            {question.options?.map((option) => (
                <div key={option} className="flex items-center space-x-3">
                    <FormControl>
                        <Checkbox
                            checked={value.includes(option)}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    field.onChange([...value, option]);
                                } else {
                                    field.onChange(value.filter((v: string) => v !== option));
                                }
                            }}
                        />
                    </FormControl>
                    <Label className="font-normal">{option}</Label>
                </div>
            ))}
        </div>
    );
}

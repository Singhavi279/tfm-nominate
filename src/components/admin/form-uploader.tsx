"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FormConfig, FormConfigSchema } from "@/lib/types";
import { Loader2, Save } from "lucide-react";
import { SEGMENT_ORDER, CATEGORY_ORDER } from "@/lib/award-categories";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";

const formSchema = z.object({
  segmentName: z.string({ required_error: "Please select a segment." }),
  categoryName: z.string({ required_error: "Please select a category." }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  sectionsJson: z.string().refine((val) => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed);
      } catch (e) {
        return false;
      }
    }, { message: "Please provide a valid JSON array for sections." }),
});

export function FormUploader() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      sectionsJson: "[]",
    },
  });

  const selectedSegment = form.watch("segmentName");

  async function onSave(values: z.infer<typeof formSchema>) {
    setSaving(true);
    
    let sections;
    try {
        sections = JSON.parse(values.sectionsJson);
    } catch(e) {
        toast({
            title: "Invalid JSON",
            description: "The sections field contains invalid JSON.",
            variant: "destructive"
        });
        setSaving(false);
        return;
    }

    const slug = values.categoryName.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]+/g, "");

    const newConfig: FormConfig = {
      id: slug,
      segmentName: values.segmentName,
      categoryName: values.categoryName,
      description: values.description,
      sections: sections,
    };

    let validatedConfig;
    try {
        validatedConfig = FormConfigSchema.parse(newConfig);
    } catch (e: any) {
        toast({
            title: "Validation Error",
            description: e.message || "Invalid form configuration data.",
            variant: "destructive",
        });
        setSaving(false);
        return;
    }

    const docRef = doc(firestore, "form_configurations", validatedConfig.id);
    
    // Using .then().catch() to handle client-side write
    setDoc(docRef, validatedConfig)
        .then(() => {
            toast({
                title: "Success!",
                description: `Form configuration "${validatedConfig.id}" has been saved.`,
            });
            form.reset({ description: "", sectionsJson: "[]", segmentName: undefined, categoryName: undefined });
        })
        .catch((error: any) => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'write',
                requestResourceData: validatedConfig
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setSaving(false);
        });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Form Uploader</CardTitle>
        <CardDescription>Select a category and provide the JSON for its form sections.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSave)}>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="segmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEGMENT_ORDER.map(segment => (
                          <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSegment}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </Trigger>
                      </FormControl>
                      <SelectContent>
                        {selectedSegment && CATEGORY_ORDER[selectedSegment]?.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Description</FormLabel>
                  <FormControl>
                    <Input placeholder="A brief description for the award category." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sectionsJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sections JSON</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the sections array as JSON..."
                      className="min-h-[300px] text-base font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Configuration
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

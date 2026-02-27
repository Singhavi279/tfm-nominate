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
import { useToast } from "@/hooks/use-toast";
import { generateFormConfigAction, saveFormConfig } from "@/lib/actions";
import { FormConfig } from "@/lib/types";
import { Loader2, Wand2, FileJson, Save } from "lucide-react";

const formSchema = z.object({
  description: z.string().min(50, {
    message: "Description must be at least 50 characters long.",
  }),
});

export function FormUploader() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<FormConfig | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  });

  async function onGenerate(values: z.infer<typeof formSchema>) {
    setGenerating(true);
    setGeneratedConfig(null);
    try {
      const result = await generateFormConfigAction(values);
      if (result.error) {
        throw new Error(result.error);
      }
      setGeneratedConfig(result.config as FormConfig);
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate form configuration.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function onSave() {
    if (!generatedConfig) return;
    setSaving(true);
    try {
      const result = await saveFormConfig(generatedConfig);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: "Success!",
        description: `Form configuration "${result.id}" has been saved.`,
      });
      setGeneratedConfig(null);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save the form configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>1. Describe Your Form</CardTitle>
          <CardDescription>Provide a detailed description of the award, its sections, and questions.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onGenerate)}>
            <CardContent>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Award Category Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., An award for Transformational Leaders in Maternity Healthcare. The form should have a section for nominee details (name, title, organization) and a section for accomplishments with a few essay questions."
                        className="min-h-[300px] text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Generate Config
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>2. Review & Save</CardTitle>
          <CardDescription>Verify the generated JSON schema before saving it to Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
          {generating && (
             <div className="flex justify-center items-center h-[300px] rounded-md bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          )}
          {generatedConfig && (
            <pre className="mt-2 w-full max-h-[300px] overflow-auto rounded-md bg-secondary p-4 text-sm">
              <code>{JSON.stringify(generatedConfig, null, 2)}</code>
            </pre>
          )}
           {!generating && !generatedConfig && (
            <div className="flex flex-col text-center justify-center items-center h-[300px] rounded-md bg-secondary/50 border-dashed border text-muted-foreground">
                <FileJson className="h-12 w-12 mb-4" />
                <p className="font-medium">Generated JSON will appear here.</p>
            </div>
           )}
        </CardContent>
        <CardFooter>
          <Button onClick={onSave} disabled={!generatedConfig || saving || generating}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save to Firestore
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

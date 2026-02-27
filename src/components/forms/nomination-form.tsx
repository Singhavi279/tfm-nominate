"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDebounce } from "@/hooks/use-debounce";
import { useUser } from "@/firebase";
import { getDraft, saveDraft, submitNomination } from "@/lib/actions";
import { FormConfig, Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionRenderer } from "./question-renderer";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { useRouter } from "next/navigation";

interface NominationFormProps {
  formConfig: FormConfig;
}

type FileStore = { [key: string]: File };

export function NominationForm({ formConfig }: NominationFormProps) {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [files, setFiles] = useState<FileStore>({});
  const [declaration, setDeclaration] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  const validationSchema = z.object(
    formConfig.sections.reduce((acc, section) => {
      section.questions.forEach((q) => {
        if (q.type === 'FILE_UPLOAD') {
            // File validation is handled separately
        } else if (q.required) {
          if (q.type === 'CHECKBOX') {
            acc[q.id] = z.array(z.string()).nonempty({ message: "Please select at least one option." });
          } else {
            acc[q.id] = z.string().nonempty({ message: "This field is required." });
          }
        }
      });
      return acc;
    }, {} as Record<string, z.ZodTypeAny>)
  );

  const methods = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: {},
  });

  // Fetch draft when user is available
  useEffect(() => {
    async function fetchDraft() {
      if (user) {
        setIsLoadingDraft(true);
        const draft = await getDraft(user.uid, formConfig.id);
        if (draft) {
          methods.reset(draft.responses);
          setLastSaved(draft.updatedAt);
        }
        setIsLoadingDraft(false);
      }
    }
    if (!isUserLoading) {
        fetchDraft();
    }
  }, [user, isUserLoading, formConfig.id, methods]);


  const watchedValues = methods.watch();
  const debouncedValues = useDebounce(watchedValues, 1500);

  useEffect(() => {
    if (!user || !methods.formState.isDirty || isPending || isLoadingDraft) return;

    const responsesToSave = { ...debouncedValues };

    startTransition(async () => {
      const result = await saveDraft(user.uid, formConfig.id, responsesToSave);
      if (result.success && result.updatedAt) {
        setLastSaved(result.updatedAt);
        methods.formState.isDirty = false;
      }
    });
  }, [debouncedValues, user, formConfig.id, methods.formState, isPending, isLoadingDraft]);

  const handleFileChange = (questionId: string, file: File | null) => {
    setFiles(prev => {
        const newFiles = {...prev};
        if (file) {
            newFiles[questionId] = file;
        } else {
            delete newFiles[questionId];
        }
        return newFiles;
    })
  }

  const onSubmit = async (data: any) => {
    if (!user) return;
    setIsSubmitting(true);

    let allRequiredFilesUploaded = true;
    formConfig.sections.forEach(section => {
        section.questions.forEach(q => {
            if (q.type === 'FILE_UPLOAD' && q.required && !files[q.id]) {
                allRequiredFilesUploaded = false;
                toast({
                    title: "Missing required file",
                    description: `Please upload a file for "${q.title}".`,
                    variant: "destructive"
                });
            }
        })
    });

    if (!allRequiredFilesUploaded) {
      setIsSubmitting(false);
      return;
    }

    if (!declaration) {
      toast({
        title: "Declaration Required",
        description: "You must agree to the declaration before submitting.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    // Convert files to a format that can be passed to server action
    const formData = new FormData();
    Object.entries(files).forEach(([key, file]) => {
        formData.append(key, file);
    });

    try {
        const result = await submitNomination(user.uid, formConfig.id, data, files);
        if (result.error) {
            throw new Error(result.error);
        }
        toast({
            title: "Submission Successful!",
            description: "Your nomination has been submitted.",
        });
        router.push(`/nominate/${formConfig.id}/success`);
    } catch (error: any) {
        toast({
            title: "Submission Failed",
            description: error.message,
            variant: "destructive"
        })
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isUserLoading || isLoadingDraft) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        {formConfig.sections.map((section, index) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {section.questions.map((question) => (
                <QuestionRenderer key={question.id} question={question} onFileChange={handleFileChange} />
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
            <CardHeader>
                <CardTitle>Declaration</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-start space-x-3">
                    <Checkbox id="declaration" checked={declaration} onCheckedChange={(checked) => setDeclaration(!!checked)} className="mt-1" />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="declaration" className="font-bold">
                        I hereby declare that the information provided in this nomination is true, complete, and accurate to the best of my knowledge.
                        </Label>
                        <p className="text-sm text-muted-foreground">
                        By checking this box, you confirm your agreement to the terms and conditions of the TFM 2026 Awards.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>


        <div className="flex items-center justify-between sticky bottom-0 -mx-4 p-4 bg-background/80 backdrop-blur-sm border-t">
          <div className="text-sm text-muted-foreground flex items-center">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : lastSaved ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Last saved {formatDistanceToNow(new Date(lastSaved), { addSuffix: true })}
              </>
            ) : (
                "Your changes will be saved automatically."
            )}
          </div>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Nomination
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

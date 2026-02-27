"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDebounce } from "@/hooks/use-debounce";
import { useUser, useDoc, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter } from "@/firebase";
import { doc, setDoc, serverTimestamp, writeBatch, collection, deleteDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

import { FormConfig, Question, Draft } from "@/lib/types";
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
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [files, setFiles] = useState<FileStore>({});
  const [declaration, setDeclaration] = useState(false);

  const draftRef = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return doc(firestore, 'users', user.uid, 'drafts', formConfig.id);
  }, [user, firestore, formConfig.id]);

  const { data: draft, isLoading: isLoadingDraft } = useDoc<Draft>(draftRef);

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

  // Load draft data into form when it's fetched
  useEffect(() => {
    if (draft && !methods.formState.isDirty) { // Only reset if form is not dirty
      let responses = {};
      try {
        if (draft.formData) {
            responses = JSON.parse(draft.formData);
        }
      } catch (e) {
        console.error("Failed to parse draft formData:", e);
      }
      methods.reset(responses);
      if (draft.lastSavedAt) {
          // The `useDoc` hook returns a Firestore Timestamp. Convert it to ISO string for display.
          setLastSaved((draft.lastSavedAt as any).toDate().toISOString());
      }
    }
  }, [draft, methods]);


  const watchedValues = methods.watch();
  const debouncedValues = useDebounce(watchedValues, 1500);

  useEffect(() => {
    if (!user || !firestore || !methods.formState.isDirty || isPending || isLoadingDraft) return;

    const responsesToSave = { ...debouncedValues };

    startTransition(() => {
        const docRef = doc(firestore, "users", user.uid, "drafts", formConfig.id);
        const draftData = {
          userId: user.uid,
          formConfigurationId: formConfig.id,
          formData: JSON.stringify(responsesToSave),
          lastSavedAt: serverTimestamp(),
        };

        setDoc(docRef, draftData, { merge: true })
          .then(() => {
              setLastSaved(new Date().toISOString());
              methods.formState.isDirty = false;
          })
          .catch((error) => {
              const permissionError = new FirestorePermissionError({
                  path: docRef.path,
                  operation: 'write',
                  requestResourceData: draftData,
              });
              errorEmitter.emit('permission-error', permissionError);
          });
    });
  }, [debouncedValues, user, formConfig.id, methods, isPending, isLoadingDraft, firestore]);

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
    if (!user || !firestore) return;
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
    
    try {
        const attachmentUrls: { [key: string]: string } = {};
        const storage = getStorage();

        // 1. Upload files to Cloud Storage
        for (const questionId in files) {
          const file = files[questionId];
          if (file) {
            const sRef = storageRef(storage, `submissions/${user.uid}/${formConfig.id}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(sRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            attachmentUrls[questionId] = downloadURL;
          }
        }

        const batch = writeBatch(firestore);

        const submissionData = {
          userId: user.uid,
          formConfigurationId: formConfig.id,
          submittedAt: serverTimestamp(),
          responses: JSON.stringify(data),
          attachments: JSON.stringify(attachmentUrls),
        };

        // 2. Create submission document
        const submissionRef = doc(collection(firestore, "users", user.uid, "submissions"));
        batch.set(submissionRef, submissionData);
        
        // 3. Delete draft document
        const draftRef = doc(firestore, "users", user.uid, "drafts", formConfig.id);
        batch.delete(draftRef);

        // 4. Commit batch write
        await batch.commit();

        toast({
            title: "Submission Successful!",
            description: "Your nomination has been submitted.",
        });
        router.push(`/nominate/${formConfig.id}/success`);

    } catch (error: any) {
        if (error.code && error.code.startsWith('storage/')) {
            toast({
                title: "File Upload Failed",
                description: error.message,
                variant: "destructive"
            });
        } else {
            const permissionError = new FirestorePermissionError({
                path: `users/${user.uid}/submissions`,
                operation: 'create',
                requestResourceData: "Batch Write on Nomination Submission"
            });
            errorEmitter.emit('permission-error', permissionError);
        }
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
          <Button type="submit" size="lg" disabled={isSubmitting || isPending}>
            {(isSubmitting || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Nomination
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

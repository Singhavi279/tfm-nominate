import { getFormConfig, getDraft } from "@/lib/actions";
import { NominationForm } from "@/components/forms/nomination-form";
import { notFound } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function NominatePage({ params }: { params: { categoryId: string } }) {
  const { categoryId } = params;
  const user = auth.currentUser;

  const formConfig = await getFormConfig(categoryId);

  if (!formConfig) {
    notFound();
  }
  
  // This check is primarily for server-side rendering. The client-side form will have the definitive user object.
  if (!user) {
    return (
        <div className="container py-8">
            <Card className="max-w-lg mx-auto mt-10 text-center">
                <CardHeader>
                    <CardTitle>Authentication Required</CardTitle>
                    <CardDescription>You must be logged in to start a nomination.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href={`/login?redirect=/nominate/${categoryId}`}>Log In</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  const draft = await getDraft(user.uid, categoryId);

  return (
    <div className="container max-w-4xl mx-auto py-8">
       <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">{formConfig.categoryName}</h1>
        <p className="text-muted-foreground">{formConfig.description}</p>
      </div>
      <NominationForm formConfig={formConfig} initialDraft={draft} />
    </div>
  );
}

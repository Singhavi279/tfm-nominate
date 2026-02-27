import { getFormConfig } from "@/lib/actions";
import { NominationForm } from "@/components/forms/nomination-form";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function NominatePage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;

  const formConfig = await getFormConfig(categoryId);

  if (!formConfig) {
    notFound();
  }

  // The protected layout handles auth check.
  // The NominationForm will handle fetching draft for the logged-in user.

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">{formConfig.categoryName}</h1>
        <p className="text-muted-foreground">{formConfig.description}</p>
      </div>
      <NominationForm formConfig={formConfig} />
    </div>
  );
}

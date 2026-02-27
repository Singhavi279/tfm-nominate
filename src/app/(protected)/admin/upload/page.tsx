import { FormUploader } from "@/components/admin/form-uploader";
import { getFormConfigs } from "@/lib/actions";
import { ConfigStatusList } from "@/components/admin/config-status-list";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const revalidate = 0; // Don't cache this page

export default async function AdminUploadPage() {
  const formConfigs = await getFormConfigs();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Manual Form Uploader</h1>
        <p className="text-muted-foreground">
          Manually upload JSON configurations for award nomination forms.
        </p>
      </div>
      <FormUploader />
      <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <ConfigStatusList configs={formConfigs} />
      </Suspense>
    </div>
  );
}

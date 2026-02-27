import { FormUploader } from "@/components/admin/form-uploader";
import { ConfigStatusList } from "@/components/admin/config-status-list";

export const revalidate = 0; // Don't cache this page

export default function AdminUploadPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Manual Form Uploader</h1>
        <p className="text-muted-foreground">
          Manually upload JSON configurations for award nomination forms.
        </p>
      </div>
      <FormUploader />
      <ConfigStatusList />
    </div>
  );
}

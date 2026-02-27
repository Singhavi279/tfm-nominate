import { FormUploader } from "@/components/admin/form-uploader";

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
    </div>
  );
}

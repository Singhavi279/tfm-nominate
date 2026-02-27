import { FormUploader } from "@/components/admin/form-uploader";

export default function AdminUploadPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Form Configuration Uploader</h1>
        <p className="text-muted-foreground">
          Generate and upload new award nomination forms using a natural language description.
        </p>
      </div>
      <FormUploader />
    </div>
  );
}

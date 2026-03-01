"use client";

import { FormUploader } from "@/components/admin/form-uploader";
import { ConfigStatusList } from "@/components/admin/config-status-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, LayoutList } from "lucide-react";

export default function AdminUploadPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage form configurations and view nomination responses.
        </p>
      </div>
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Config
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <LayoutList className="h-4 w-4" />
            Form Status
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <FormUploader />
        </TabsContent>
        <TabsContent value="status">
          <ConfigStatusList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

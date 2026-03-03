"use client";

import { FormUploader } from "@/components/admin/form-uploader";
import { ConfigStatusList } from "@/components/admin/config-status-list";
import { UserManagement } from "@/components/admin/user-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, LayoutList, Users } from "lucide-react";

export default function AdminUploadPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage form configurations, view nomination responses, and assign roles.
        </p>
      </div>
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Config
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <LayoutList className="h-4 w-4" />
            Form Status
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <FormUploader />
        </TabsContent>
        <TabsContent value="status">
          <ConfigStatusList />
        </TabsContent>
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

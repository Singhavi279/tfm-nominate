import { CategoryList } from "@/components/dashboard/category-list";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const revalidate = 60; // Revalidate every minute

export default function DashboardPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Award Nominations</h1>
        <p className="text-muted-foreground">Select a segment and category to start a new nomination.</p>
      </div>
       <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <CategoryList />
      </Suspense>
    </div>
  );
}

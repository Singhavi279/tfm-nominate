"use client";

import { ConfigStatusList } from "@/components/admin/config-status-list";
import { useState } from "react";
import { SubmissionsViewer } from "@/components/admin/submissions-viewer";

export default function JuryPage() {
    const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null);

    if (viewing) {
        return (
            <div className="container py-8">
                <SubmissionsViewer
                    categoryId={viewing.id}
                    categoryName={viewing.name}
                    onBack={() => setViewing(null)}
                    statusFilters={["approved", "issues"]}
                    showAuditInfo={false}
                />
            </div>
        );
    }

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Jury Panel</h1>
                <p className="text-muted-foreground">
                    Review approved and shortlisted nominations.
                </p>
            </div>
            <ConfigStatusList onViewCategory={(id, name) => setViewing({ id, name })} statusFilters={["approved", "issues"]} />
        </div>
    );
}

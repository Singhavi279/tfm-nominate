"use client";

import { ConfigStatusList } from "@/components/admin/config-status-list";
import { useState } from "react";
import { SubmissionsViewer } from "@/components/admin/submissions-viewer";

export default function EvaluatorPage() {
    const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null);

    if (viewing) {
        return (
            <div className="container py-8">
                <SubmissionsViewer
                    categoryId={viewing.id}
                    categoryName={viewing.name}
                    onBack={() => setViewing(null)}
                    showAuditInfo={false}
                />
            </div>
        );
    }

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Evaluator Panel</h1>
                <p className="text-muted-foreground">
                    Review all submissions and update their status.
                </p>
            </div>
            <ConfigStatusList onViewCategory={(id, name) => setViewing({ id, name })} />
        </div>
    );
}

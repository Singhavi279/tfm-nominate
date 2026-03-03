"use client";

import { ConfigStatusList } from "@/components/admin/config-status-list";
import { useState, useEffect } from "react";
import { SubmissionsViewer } from "@/components/admin/submissions-viewer";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function JuryPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null);
    const [assignedCategories, setAssignedCategories] = useState<string[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;
        async function fetchAssignment() {
            try {
                const roleDoc = await getDoc(doc(firestore, "user_roles", user!.email!));
                if (roleDoc.exists()) {
                    setAssignedCategories(roleDoc.data().assignedCategories || []);
                } else {
                    setAssignedCategories([]);
                }
            } catch {
                setAssignedCategories([]);
            } finally {
                setLoading(false);
            }
        }
        fetchAssignment();
    }, [user?.email, firestore]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (viewing) {
        return (
            <div className="container py-8">
                <SubmissionsViewer
                    categoryId={viewing.id}
                    categoryName={viewing.name}
                    onBack={() => setViewing(null)}
                    statusFilters={["approved", "issues"]}
                    showAuditInfo={false}
                    useJuryModal
                />
            </div>
        );
    }

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Jury Panel</h1>
                <p className="text-muted-foreground">
                    Review approved and shortlisted nominations. Score each submission based on evaluation parameters.
                </p>
            </div>
            <ConfigStatusList
                onViewCategory={(id, name) => setViewing({ id, name })}
                statusFilters={["approved", "issues"]}
                assignedCategories={assignedCategories ?? []}
            />
        </div>
    );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    ArrowRight,
    Clock,
    FileText,
    Pencil,
    Eye,
} from "lucide-react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, orderBy, query } from "firebase/firestore";
import { FormConfig, Draft, Submission } from "@/lib/types";
import { SubmissionDetailModal } from "@/components/admin/submission-detail-modal";
import { ParsedSubmission } from "@/lib/actions";

type RawSubmission = Submission & { id: string };
type ModalSubmission = ParsedSubmission & { status?: "pending" | "approved" | "issues" | "rejected" };

// ── Illustrations ────────────────────────────────────────────────────────────

function SubmissionsEmptyIllustration() {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="mb-4 opacity-70">
                <circle cx="48" cy="48" r="44" fill="hsl(var(--muted))" />
                <rect x="28" y="29" width="40" height="46" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
                <rect x="34" y="38" width="28" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.4" />
                <rect x="34" y="45" width="20" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.4" />
                <rect x="34" y="52" width="24" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.4" />
                <circle cx="68" cy="68" r="12" fill="hsl(var(--primary))" opacity="0.15" />
                <path d="M64 68l3 3 6-6" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-medium text-sm">No submissions yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                Once you submit your nominations, they will appear here.
            </p>
        </div>
    );
}

function DraftsEmptyIllustration() {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="mb-4 opacity-70">
                <circle cx="48" cy="48" r="44" fill="hsl(var(--muted))" />
                <rect x="28" y="29" width="40" height="46" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
                <rect x="34" y="38" width="28" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.4" />
                <rect x="34" y="45" width="18" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.4" />
                <circle cx="66" cy="66" r="12" fill="hsl(var(--accent))" opacity="0.2" />
                <path d="M62.5 70l1-4 7-7-3-3-7 7-1 4 3 3z" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
            <p className="font-medium text-sm">No drafts saved</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                Your saved drafts will appear here.
            </p>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function UserActivityPanel() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedSub, setSelectedSub] = useState<{ submission: ModalSubmission; config: FormConfig | null } | null>(null);

    // Form configs (to resolve names & get full config for modal)
    const formConfigsQuery = useMemoFirebase(() => collection(firestore, "form_configurations"), [firestore]);
    const { data: configs } = useCollection<FormConfig>(formConfigsQuery);

    const configMap = useMemo<Record<string, FormConfig>>(() => {
        if (!configs) return {};
        return configs.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
    }, [configs]);

    // Submissions
    const submissionsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, "users", user.uid, "submissions"),
            orderBy("submittedAt", "desc")
        );
    }, [firestore, user]);
    const { data: submissions, isLoading: subsLoading } = useCollection<RawSubmission>(submissionsQuery);

    // Drafts
    const draftsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(
            collection(firestore, "users", user.uid, "drafts"),
            orderBy("lastSavedAt", "desc")
        );
    }, [firestore, user]);
    const { data: drafts, isLoading: draftsLoading } = useCollection<Draft & { id: string }>(draftsQuery);

    if (!user) return null;

    function openSubmission(raw: RawSubmission) {
        let responses: Record<string, any> = {};
        let attachments: Record<string, string> = {};
        try { responses = JSON.parse(raw.responses || "{}"); } catch { }
        try { attachments = JSON.parse(raw.attachments || "{}"); } catch { }

        const parsed: ModalSubmission = {
            id: raw.id,
            userId: raw.userId,
            formConfigurationId: raw.formConfigurationId,
            submittedAt: raw.submittedAt?.toDate?.()?.toISOString?.() ?? "",
            responses,
            attachments,
        };
        setSelectedSub({ submission: parsed, config: configMap[raw.formConfigurationId] ?? null });
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Left: Submitted Nominations */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            My Submitted Nominations
                        </CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="p-0 flex-1">
                        {subsLoading ? (
                            <div className="flex justify-center py-8">
                                <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : !submissions || submissions.length === 0 ? (
                            <SubmissionsEmptyIllustration />
                        ) : (
                            <ul className="divide-y max-h-[300px] overflow-y-auto">
                                {submissions.map((sub) => {
                                    const categoryName = configMap[sub.formConfigurationId]?.categoryName ?? sub.formConfigurationId;
                                    const date = sub.submittedAt?.toDate?.()?.toLocaleDateString("en-IN", {
                                        day: "2-digit", month: "short", year: "numeric",
                                    });
                                    return (
                                        <li key={sub.id} className="flex items-center justify-between px-4 py-3 gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{categoryName}</p>
                                                <p className="text-xs text-muted-foreground">{date}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="shrink-0 gap-1"
                                                onClick={() => openSubmission(sub)}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Saved Drafts */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Pencil className="h-4 w-4 text-primary" />
                            My Saved Drafts
                        </CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="p-0 flex-1">
                        {draftsLoading ? (
                            <div className="flex justify-center py-8">
                                <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : !drafts || drafts.length === 0 ? (
                            <DraftsEmptyIllustration />
                        ) : (
                            <ul className="divide-y max-h-[300px] overflow-y-auto">
                                {drafts.map((draft) => {
                                    const categoryName = configMap[draft.formConfigurationId]?.categoryName ?? draft.formConfigurationId;
                                    const date = draft.lastSavedAt?.toDate?.()?.toLocaleDateString("en-IN", {
                                        day: "2-digit", month: "short", year: "numeric",
                                    });
                                    return (
                                        <li key={draft.id} className="flex items-center justify-between px-4 py-3 gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{categoryName}</p>
                                                <p className="text-xs text-muted-foreground">Last saved {date}</p>
                                            </div>
                                            <Button asChild size="sm" variant="outline" className="shrink-0 gap-1">
                                                <Link href={`/nominate/${draft.formConfigurationId}`}>
                                                    Continue <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Read-only submission detail modal */}
            {selectedSub && (
                <SubmissionDetailModal
                    submission={selectedSub.submission}
                    formConfig={selectedSub.config}
                    open={!!selectedSub}
                    onClose={() => setSelectedSub(null)}
                    onStatusChange={() => { }} // no-op in readOnly mode
                    readOnly
                />
            )}
        </>
    );
}

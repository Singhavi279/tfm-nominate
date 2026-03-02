"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, FileText, Eye, Clock, CheckCircle2, XCircle } from "lucide-react";
import { getFormConfig, ParsedSubmission } from "@/lib/actions";
import { FormConfig } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { collectionGroup, query, where, getDocs } from "firebase/firestore";
import { SubmissionDetailModal, SubmissionStatus } from "./submission-detail-modal";
import { cn } from "@/lib/utils";

type EnrichedSubmission = ParsedSubmission & { status: SubmissionStatus };

interface SubmissionsViewerProps {
    categoryId: string;
    categoryName: string;
    onBack: () => void;
}

const STATUS_BADGE: Record<SubmissionStatus, { label: string; icon: React.ReactNode; className: string }> = {
    pending: {
        label: "Pending",
        icon: <Clock className="h-3 w-3" />,
        className: "text-yellow-700 border-yellow-400 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400",
    },
    approved: {
        label: "Approved",
        icon: <CheckCircle2 className="h-3 w-3" />,
        className: "text-green-700 border-green-500 bg-green-50 dark:bg-green-950 dark:text-green-400",
    },
    rejected: {
        label: "Rejected",
        icon: <XCircle className="h-3 w-3" />,
        className: "text-red-700 border-red-500 bg-red-50 dark:bg-red-950 dark:text-red-400",
    },
};

export function SubmissionsViewer({ categoryId, categoryName, onBack }: SubmissionsViewerProps) {
    const firestore = useFirestore();
    const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
    const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<EnrichedSubmission | null>(null);

    useEffect(() => {
        if (!firestore) return;

        async function fetchData() {
            setLoading(true);
            try {
                const config = await getFormConfig(categoryId);
                setFormConfig(config);

                const submissionsQuery = query(
                    collectionGroup(firestore, "submissions"),
                    where("formConfigurationId", "==", categoryId)
                );
                const snapshot = await getDocs(submissionsQuery);

                const subs: EnrichedSubmission[] = snapshot.docs.map((d) => {
                    const data = d.data();
                    let responses: Record<string, any> = {};
                    let attachments: Record<string, string> = {};
                    try { responses = JSON.parse(data.responses || "{}"); } catch { }
                    try { attachments = JSON.parse(data.attachments || "{}"); } catch { }
                    return {
                        id: d.id,
                        userId: data.userId,
                        formConfigurationId: data.formConfigurationId,
                        submittedAt: data.submittedAt?.toDate?.()?.toISOString?.() || "",
                        responses,
                        attachments,
                        status: (data.status as SubmissionStatus) ?? "pending",
                    };
                });
                setSubmissions(subs);
            } catch (error) {
                console.error("Error fetching submissions:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [categoryId, firestore]);

    const handleStatusChange = (id: string, status: SubmissionStatus) => {
        setSubmissions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, status } : s))
        );
        // Also update the selected submission so modal reflects the change immediately
        setSelectedSubmission((prev) => (prev?.id === id ? { ...prev, status } : prev));
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Status
                </Button>
                <div>
                    <h2 className="text-xl font-bold font-headline">{categoryName}</h2>
                    <p className="text-sm text-muted-foreground">
                        {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            {submissions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No submissions yet</p>
                        <p className="text-sm">Submissions for this category will appear here.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px]">#</TableHead>
                                        <TableHead className="w-[100px]">View</TableHead>
                                        <TableHead>Submitted At</TableHead>
                                        <TableHead className="w-[120px]">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.map((sub, idx) => {
                                        const statusCfg = STATUS_BADGE[sub.status];
                                        return (
                                            <TableRow key={sub.id}>
                                                <TableCell className="font-mono text-muted-foreground">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5"
                                                        onClick={() => setSelectedSubmission(sub)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {sub.submittedAt
                                                        ? new Date(sub.submittedAt).toLocaleDateString("en-IN", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("flex items-center gap-1 w-fit text-xs", statusCfg.className)}
                                                    >
                                                        {statusCfg.icon}
                                                        {statusCfg.label}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detail modal */}
            {selectedSubmission && (
                <SubmissionDetailModal
                    submission={selectedSubmission}
                    formConfig={formConfig}
                    open={!!selectedSubmission}
                    onClose={() => setSelectedSubmission(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}

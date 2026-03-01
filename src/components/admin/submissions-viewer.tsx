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
import { ArrowLeft, Loader2, ExternalLink, FileText } from "lucide-react";
import { getFormConfig, ParsedSubmission } from "@/lib/actions";
import { FormConfig } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { collectionGroup, query, where, getDocs } from "firebase/firestore";

interface SubmissionsViewerProps {
    categoryId: string;
    categoryName: string;
    onBack: () => void;
}

export function SubmissionsViewer({ categoryId, categoryName, onBack }: SubmissionsViewerProps) {
    const firestore = useFirestore();
    const [submissions, setSubmissions] = useState<ParsedSubmission[]>([]);
    const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
    const [loading, setLoading] = useState(true);

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

                const subs = snapshot.docs.map((d) => {
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

    // Build question keys and titles from form config
    const responseKeys: string[] = [];
    const attachmentKeys: string[] = [];
    const questionTitles: Record<string, string> = {};
    if (formConfig) {
        formConfig.sections.forEach((section) => {
            section.questions.forEach((q) => {
                questionTitles[q.id] = q.title;
                if (q.type === "FILE_UPLOAD") {
                    attachmentKeys.push(q.id);
                } else {
                    responseKeys.push(q.id);
                }
            });
        });
    }

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
                        <div className="border rounded-md overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[60px]">#</TableHead>
                                        <TableHead className="min-w-[120px]">Submitted At</TableHead>
                                        {responseKeys.map((key) => (
                                            <TableHead key={key} className="min-w-[180px]">
                                                {questionTitles[key] || key}
                                            </TableHead>
                                        ))}
                                        {attachmentKeys.map((key) => (
                                            <TableHead key={key} className="min-w-[120px]">
                                                {questionTitles[key] || key}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.map((sub, idx) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
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
                                            {responseKeys.map((key) => {
                                                const val = sub.responses[key];
                                                return (
                                                    <TableCell key={key} className="text-sm max-w-[300px]">
                                                        <div className="line-clamp-3">
                                                            {Array.isArray(val) ? val.join(", ") : val || "—"}
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                            {attachmentKeys.map((key) => {
                                                const url = sub.attachments[key];
                                                return (
                                                    <TableCell key={key}>
                                                        {url ? (
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center text-sm text-primary hover:underline"
                                                            >
                                                                <ExternalLink className="mr-1 h-3 w-3" />
                                                                View
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

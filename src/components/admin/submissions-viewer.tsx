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
import { ArrowLeft, Loader2, ExternalLink, FileText } from "lucide-react";
import { getSubmissionsForCategory, ParsedSubmission, getFormConfig } from "@/lib/actions";
import { FormConfig } from "@/lib/types";

interface SubmissionsViewerProps {
    categoryId: string;
    categoryName: string;
    onBack: () => void;
}

export function SubmissionsViewer({ categoryId, categoryName, onBack }: SubmissionsViewerProps) {
    const [submissions, setSubmissions] = useState<ParsedSubmission[]>([]);
    const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const [subs, config] = await Promise.all([
                getSubmissionsForCategory(categoryId),
                getFormConfig(categoryId),
            ]);
            setSubmissions(subs);
            setFormConfig(config);
            setLoading(false);
        }
        fetchData();
    }, [categoryId]);

    // Extract all unique response keys from submissions to build dynamic columns
    const responseKeys = (() => {
        if (!formConfig) return [];
        const keys: string[] = [];
        formConfig.sections.forEach((section) => {
            section.questions.forEach((q) => {
                if (q.type !== "FILE_UPLOAD") {
                    keys.push(q.id);
                }
            });
        });
        return keys;
    })();

    // Build a mapping from question id to title for column headers
    const questionTitles: Record<string, string> = {};
    if (formConfig) {
        formConfig.sections.forEach((section) => {
            section.questions.forEach((q) => {
                questionTitles[q.id] = q.title;
            });
        });
    }

    // Collect attachment keys
    const attachmentKeys = (() => {
        if (!formConfig) return [];
        const keys: string[] = [];
        formConfig.sections.forEach((section) => {
            section.questions.forEach((q) => {
                if (q.type === "FILE_UPLOAD") {
                    keys.push(q.id);
                }
            });
        });
        return keys;
    })();

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

"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, CheckCircle2, Clock, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { FormConfig } from "@/lib/types";
import { ParsedSubmission } from "@/lib/actions";
import { useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type SubmissionStatus = "pending" | "approved" | "issues" | "rejected";

interface SubmissionDetailModalProps {
    submission: ParsedSubmission & { status?: SubmissionStatus; statusUpdatedAt?: string; statusUpdatedBy?: string };
    formConfig: FormConfig | null;
    open: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: SubmissionStatus) => void;
    readOnly?: boolean;
    showAuditInfo?: boolean;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
    pending: {
        label: "Pending",
        icon: <Clock className="h-3.5 w-3.5" />,
        color: "text-slate-700 dark:text-slate-400",
        bg: "bg-slate-100 dark:bg-slate-900",
        border: "border-slate-300 dark:border-slate-700",
    },
    approved: {
        label: "Approved",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: "text-green-700 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-950",
        border: "border-green-500",
    },
    issues: {
        label: "Ok, With Issues",
        icon: <AlertTriangle className="h-3.5 w-3.5" />, // Or another icon like AlertCircle
        color: "text-yellow-700 dark:text-yellow-400",
        bg: "bg-yellow-50 dark:bg-yellow-950",
        border: "border-yellow-400",
    },
    rejected: {
        label: "Rejected",
        icon: <XCircle className="h-3.5 w-3.5" />,
        color: "text-red-700 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950",
        border: "border-red-500",
    },
};

export function SubmissionDetailModal({
    submission,
    formConfig,
    open,
    onClose,
    onStatusChange,
    readOnly = false,
    showAuditInfo = false,
}: SubmissionDetailModalProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const [updating, setUpdating] = useState(false);
    const currentStatus = submission.status ?? "pending";

    const handleStatusUpdate = async (newStatus: SubmissionStatus) => {
        if (!firestore || newStatus === currentStatus) return;
        setUpdating(true);
        try {
            const submissionRef = doc(
                firestore,
                "users",
                submission.userId,
                "submissions",
                submission.id
            );
            await updateDoc(submissionRef, {
                status: newStatus,
                statusUpdatedAt: serverTimestamp(),
                statusUpdatedBy: user?.email ?? "unknown",
            });
            onStatusChange(submission.id, newStatus);
        } catch (err) {
            console.error("Failed to update status:", err);
        } finally {
            setUpdating(false);
        }
    };

    const formattedDate = submission.submittedAt
        ? new Date(submission.submittedAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "Unknown";

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <div className="flex items-start justify-between gap-4 pr-6">
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                {formConfig?.categoryName ?? "Submission"} — #{submission.id.slice(-6).toUpperCase()}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Submitted on {formattedDate}
                            </p>
                        </div>
                        {/* Current status badge — hidden in readOnly mode */}
                        {!readOnly && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold shrink-0",
                                    STATUS_CONFIG[currentStatus].color,
                                    STATUS_CONFIG[currentStatus].bg,
                                    STATUS_CONFIG[currentStatus].border
                                )}
                            >
                                {STATUS_CONFIG[currentStatus].icon}
                                {STATUS_CONFIG[currentStatus].label}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                {/* Scrollable Q&A body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {formConfig ? (
                        formConfig.sections.map((section) => (
                            <div key={section.id}>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                    {section.title}
                                </h3>
                                <div className="space-y-4">
                                    {section.questions.map((q) => {
                                        const isFile = q.type === "FILE_UPLOAD";
                                        const value = isFile
                                            ? submission.attachments[q.id]
                                            : submission.responses[q.id];
                                        const display = Array.isArray(value) ? value.join(", ") : value;

                                        return (
                                            <div key={q.id} className="rounded-lg border bg-muted/30 px-4 py-3">
                                                <p className="text-xs text-muted-foreground mb-1">{q.title}</p>
                                                {isFile ? (
                                                    display ? (
                                                        <a
                                                            href={display}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            View Attachment
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">No file uploaded</p>
                                                    )
                                                ) : (
                                                    <p className="text-sm font-medium whitespace-pre-wrap">
                                                        {display || <span className="text-muted-foreground italic">No answer</span>}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <Separator className="mt-6" />
                            </div>
                        ))
                    ) : (
                        <p className="text-muted-foreground text-sm">Form configuration not available.</p>
                    )}
                </div>

                {/* Footer: status controls — hidden in readOnly mode */}
                {!readOnly && (
                    <div className="shrink-0 border-t px-6 py-4 flex items-center justify-between gap-3 bg-background">
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-muted-foreground font-medium">Mark status:</p>
                            {updating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </div>

                        <Select
                            value={currentStatus}
                            onValueChange={(val) => handleStatusUpdate(val as SubmissionStatus)}
                            disabled={updating}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {(["pending", "approved", "issues", "rejected"] as SubmissionStatus[]).map((s) => (
                                    <SelectItem key={s} value={s}>
                                        <div className="flex items-center gap-2">
                                            {STATUS_CONFIG[s].icon}
                                            {STATUS_CONFIG[s].label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Audit trail — visible to Super Admin only */}
                        {showAuditInfo && submission.statusUpdatedBy && (
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                Updated by <span className="font-medium">{submission.statusUpdatedBy}</span>
                                {submission.statusUpdatedAt && ` on ${new Date(submission.statusUpdatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

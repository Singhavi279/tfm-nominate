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
import { ExternalLink, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { FormConfig } from "@/lib/types";
import { ParsedSubmission } from "@/lib/actions";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";

export type SubmissionStatus = "pending" | "approved" | "rejected";

interface SubmissionDetailModalProps {
    submission: ParsedSubmission & { status?: SubmissionStatus };
    formConfig: FormConfig | null;
    open: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: SubmissionStatus) => void;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
    pending: {
        label: "Pending",
        icon: <Clock className="h-3.5 w-3.5" />,
        color: "text-yellow-700 dark:text-yellow-400",
        bg: "bg-yellow-50 dark:bg-yellow-950",
        border: "border-yellow-400",
    },
    approved: {
        label: "Approved",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        color: "text-green-700 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-950",
        border: "border-green-500",
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
}: SubmissionDetailModalProps) {
    const firestore = useFirestore();
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
            await updateDoc(submissionRef, { status: newStatus });
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
                        {/* Current status badge */}
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

                {/* Footer: status controls */}
                <div className="shrink-0 border-t px-6 py-4 flex items-center justify-between gap-3 bg-background">
                    <p className="text-sm text-muted-foreground font-medium">Mark status:</p>
                    <div className="flex items-center gap-2">
                        {updating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {(["pending", "approved", "rejected"] as SubmissionStatus[]).map((s) => (
                            <Button
                                key={s}
                                size="sm"
                                variant={currentStatus === s ? "default" : "outline"}
                                disabled={updating}
                                className={cn(
                                    "gap-1.5",
                                    currentStatus === s && s === "approved" && "bg-green-600 hover:bg-green-700",
                                    currentStatus === s && s === "rejected" && "bg-red-600 hover:bg-red-700",
                                    currentStatus === s && s === "pending" && "bg-yellow-500 hover:bg-yellow-600",
                                )}
                                onClick={() => handleStatusUpdate(s)}
                            >
                                {STATUS_CONFIG[s].icon}
                                {STATUS_CONFIG[s].label}
                            </Button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

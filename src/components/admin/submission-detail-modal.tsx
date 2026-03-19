"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, CheckCircle2, Clock, XCircle, Loader2, AlertTriangle, Eye, EyeOff, RotateCcw } from "lucide-react";
import { FormConfig } from "@/lib/types";
import { ParsedSubmission } from "@/lib/actions";
import { useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, serverTimestamp, writeBatch, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export type SubmissionStatus = "pending" | "approved" | "issues" | "rejected";

interface SubmissionDetailModalProps {
    submission: ParsedSubmission & { status?: SubmissionStatus; statusUpdatedAt?: string; statusUpdatedBy?: string };
    formConfig: FormConfig | null;
    open: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: SubmissionStatus) => void;
    onSubmissionUpdated?: (updated: ParsedSubmission) => void;
    onSubmissionRemoved?: (id: string) => void;
    readOnly?: boolean;
    showAuditInfo?: boolean;
}
const MASKED_PLACEHOLDER = "Prefer not to disclose";

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
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
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
    onSubmissionUpdated,
    onSubmissionRemoved,
    readOnly = false,
    showAuditInfo = false,
}: SubmissionDetailModalProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [updating, setUpdating] = useState(false);
    const [maskingField, setMaskingField] = useState<string | null>(null);
    const [maskedData, setMaskedData] = useState<{ responses: Record<string, any>, attachments: Record<string, string> }>({ responses: {}, attachments: {} });
    const currentStatus = submission.status ?? "pending";

    // Request Changes state
    const [showRequestChanges, setShowRequestChanges] = useState(false);
    const [requestChangesNote, setRequestChangesNote] = useState("");
    const [requestingChanges, setRequestingChanges] = useState(false);

    // Fetch the private_data/masking subcollection document when opened as Super Admin
    useEffect(() => {
        if (!open || !showAuditInfo || !firestore) return;

        let isMounted = true;
        async function fetchPrivateData() {
            try {
                const maskDocRef = doc(firestore, "users", submission.userId, "submissions", submission.id, "private_data", "masking");
                const snap = await getDoc(maskDocRef);
                if (snap.exists() && isMounted) {
                    const data = snap.data();
                    let fetchedResponses = {};
                    let fetchedAttachments = {};
                    try { if (data.responses) fetchedResponses = JSON.parse(data.responses); } catch { }
                    try { if (data.attachments) fetchedAttachments = JSON.parse(data.attachments); } catch { }
                    setMaskedData({ responses: fetchedResponses, attachments: fetchedAttachments });
                } else if (isMounted) {
                    setMaskedData({ responses: {}, attachments: {} });
                }
            } catch (err) {
                console.error("Failed to fetch private masking data:", err);
            }
        }
        fetchPrivateData();
        return () => { isMounted = false; };
    }, [open, showAuditInfo, firestore, submission.id, submission.userId]);

    // Reset request changes UI when modal closes/opens
    useEffect(() => {
        if (!open) {
            setShowRequestChanges(false);
            setRequestChangesNote("");
        }
    }, [open]);

    const handleToggleMask = async (qId: string, isFile: boolean, currentlyMasked: boolean, currentValue: any) => {
        if (!firestore) return;
        setMaskingField(qId);
        
        try {
            const submissionRef = doc(firestore, "users", submission.userId, "submissions", submission.id);
            const maskDocRef = doc(firestore, "users", submission.userId, "submissions", submission.id, "private_data", "masking");
            
            const batch = writeBatch(firestore);

            // Clone current public state to update
            const newPublicResponses = { ...submission.responses };
            const newPublicAttachments = { ...submission.attachments };

            // Clone current private state to update
            const newPrivateResponses = { ...maskedData.responses };
            const newPrivateAttachments = { ...maskedData.attachments };

            if (currentlyMasked) {
                // UNMASK: Move value from private_data back to public submission doc
                const realValue = isFile ? newPrivateAttachments[qId] : newPrivateResponses[qId];
                
                if (isFile) {
                    newPublicAttachments[qId] = realValue;
                    delete newPrivateAttachments[qId];
                } else {
                    newPublicResponses[qId] = realValue;
                    delete newPrivateResponses[qId];
                }
            } else {
                // MASK: Move value into private_data, put placeholder in public doc
                if (isFile) {
                    newPrivateAttachments[qId] = currentValue;
                    newPublicAttachments[qId] = MASKED_PLACEHOLDER;
                } else {
                    newPrivateResponses[qId] = currentValue;
                    newPublicResponses[qId] = MASKED_PLACEHOLDER;
                }
            }

            // Write to batch
            batch.update(submissionRef, {
                responses: JSON.stringify(newPublicResponses),
                attachments: JSON.stringify(newPublicAttachments)
            });
            batch.set(maskDocRef, {
                responses: JSON.stringify(newPrivateResponses),
                attachments: JSON.stringify(newPrivateAttachments)
            }, { merge: true });

            await batch.commit();

            // Update local React state instantly
            setMaskedData({ responses: newPrivateResponses, attachments: newPrivateAttachments });
            onSubmissionUpdated?.({
                ...submission,
                responses: newPublicResponses,
                attachments: newPublicAttachments
            });

        } catch (err) {
            console.error("Failed to toggle field mask:", err);
        } finally {
            setMaskingField(null);
        }
    };

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

    const handleRequestChanges = async () => {
        if (!firestore) return;
        if (!requestChangesNote.trim()) {
            toast({
                title: "Note required",
                description: "Please provide a note explaining what changes are needed.",
                variant: "destructive",
            });
            return;
        }

        setRequestingChanges(true);
        try {
            const batch = writeBatch(firestore);
            const draftRef = doc(firestore, "users", submission.userId, "drafts", submission.formConfigurationId);
            const submissionRef = doc(firestore, "users", submission.userId, "submissions", submission.id);

            const draftData = {
                userId: submission.userId,
                formConfigurationId: submission.formConfigurationId,
                formData: JSON.stringify(submission.responses),
                lastSavedAt: serverTimestamp(),
                changesRequestedNote: requestChangesNote.trim(),
                changesRequestedAt: serverTimestamp(),
                changesRequestedBy: user?.email ?? "unknown",
                returnedAttachments: JSON.stringify(submission.attachments),
            };

            batch.set(draftRef, draftData, { merge: true });
            batch.delete(submissionRef);
            await batch.commit();

            toast({
                title: "Changes Requested",
                description: "The nomination has been returned to the user as a draft with your note.",
            });
            onSubmissionRemoved?.(submission.id);
            onClose();

        } catch (err: any) {
            console.error("Failed to request changes:", err);
            toast({
                title: "Failed to request changes",
                description: err.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setRequestingChanges(false);
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
                                        const rawPublicValue = isFile
                                            ? submission.attachments[q.id]
                                            : submission.responses[q.id];
                                        
                                        const isMasked = rawPublicValue === MASKED_PLACEHOLDER;
                                        
                                        // Super Admin views the *real* value if masked, otherwise the public value
                                        let finalValue = rawPublicValue;
                                        if (isMasked && showAuditInfo) {
                                            finalValue = isFile ? maskedData.attachments[q.id] : maskedData.responses[q.id];
                                        }

                                        const display = Array.isArray(finalValue) ? finalValue.join(", ") : finalValue;

                                        return (
                                            <div key={q.id} className={cn(
                                                "rounded-lg border bg-muted/30 px-4 py-3 relative group",
                                                isMasked && showAuditInfo && "ring-1 ring-amber-400/50"
                                            )}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs text-muted-foreground">{q.title}</p>
                                                        {isMasked && showAuditInfo && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-amber-700 border-amber-400 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700">
                                                                <EyeOff className="h-2.5 w-2.5" />
                                                                Masked
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Mask Toggle Button for Super Admin */}
                                                    {showAuditInfo && !readOnly && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "h-6 w-6 rounded-full absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity",
                                                                isMasked && "opacity-100 text-amber-600 hover:text-amber-700 bg-amber-100/50 hover:bg-amber-100",
                                                                maskingField === q.id && "opacity-100"
                                                            )}
                                                            title={isMasked ? "Unmask field" : "Mask field"}
                                                            disabled={maskingField === q.id}
                                                            onClick={() => handleToggleMask(q.id, isFile, isMasked, rawPublicValue)}
                                                        >
                                                            {maskingField === q.id ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : isMasked ? (
                                                                <Eye className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>

                                                {isFile ? (
                                                    display ? (
                                                        <a
                                                            href={display}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn(
                                                                "inline-flex items-center gap-1 text-sm font-medium hover:underline",
                                                                isMasked && !showAuditInfo ? "text-muted-foreground italic pointer-events-none" : "text-primary"
                                                            )}
                                                        >
                                                            {isMasked && !showAuditInfo ? null : <ExternalLink className="h-3.5 w-3.5" />}
                                                            {isMasked && !showAuditInfo ? MASKED_PLACEHOLDER : "View Attachment"}
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">No file uploaded</p>
                                                    )
                                                ) : (
                                                    <p className={cn(
                                                        "text-sm whitespace-pre-wrap",
                                                        isMasked && !showAuditInfo ? "text-muted-foreground italic" : "font-medium"
                                                    )}>
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
                    <div className="shrink-0 border-t px-6 py-4 bg-background space-y-3">
                        {/* Request Changes UI for Super Admin */}
                        {showAuditInfo && showRequestChanges && (
                            <div className="space-y-3 p-4 rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Request Changes</p>
                                </div>
                                <p className="text-xs text-orange-700/80 dark:text-orange-400/70">
                                    This will return the nomination to the user as a draft. They will see your note and can re-submit after making changes.
                                </p>
                                <Textarea
                                    placeholder="Describe what changes are needed..."
                                    value={requestChangesNote}
                                    onChange={(e) => setRequestChangesNote(e.target.value)}
                                    className="min-h-[80px] bg-white dark:bg-background border-orange-200 dark:border-orange-800 focus-visible:ring-orange-400"
                                    disabled={requestingChanges}
                                />
                                <div className="flex items-center gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowRequestChanges(false);
                                            setRequestChangesNote("");
                                        }}
                                        disabled={requestingChanges}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                                        onClick={handleRequestChanges}
                                        disabled={requestingChanges || !requestChangesNote.trim()}
                                    >
                                        {requestingChanges && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                                        Confirm & Return to User
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-muted-foreground font-medium">Mark status:</p>
                                {updating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Request Changes button — Super Admin only */}
                                {showAuditInfo && !showRequestChanges && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                                        onClick={() => setShowRequestChanges(true)}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Request Changes
                                    </Button>
                                )}

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
                            </div>
                        </div>
                        {/* Audit trail — visible to Super Admin only */}
                        {showAuditInfo && submission.statusUpdatedBy && (
                            <p className="text-xs text-muted-foreground text-right">
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

"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Loader2, CheckCircle2, Star } from "lucide-react";
import { FormConfig } from "@/lib/types";
import { ParsedSubmission } from "@/lib/actions";
import { useFirestore, useUser } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { SCORING_PARAMETERS, getSegmentForCategory, ScoringParameter } from "@/lib/scoring-parameters";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface JuryScoringModalProps {
    submission: ParsedSubmission & { status?: string };
    formConfig: FormConfig | null;
    open: boolean;
    onClose: () => void;
    onScoreSubmitted?: (score: any) => void;
}

export function JuryScoringModal({
    submission,
    formConfig,
    open,
    onClose,
    onScoreSubmitted,
}: JuryScoringModalProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const segmentName = formConfig ? getSegmentForCategory(formConfig.categoryName) : "Organization";
    const parameters = SCORING_PARAMETERS[segmentName] || [];

    const [scores, setScores] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);
    const [loadingScores, setLoadingScores] = useState(true);
    const [alreadyScored, setAlreadyScored] = useState(false);

    const docId = `${submission.id}__${user?.email ?? "unknown"}`;

    // Load existing scores if any
    useEffect(() => {
        if (!open || !user?.email) return;
        setLoadingScores(true);
        getDoc(doc(firestore, "jury_scores", docId))
            .then((snap) => {
                if (snap.exists()) {
                    setScores(snap.data().scores || {});
                    setAlreadyScored(true);
                } else {
                    // Initialize all scores to 0
                    const initial: Record<string, number> = {};
                    parameters.forEach((p) => { initial[p.name] = 0; });
                    setScores(initial);
                    setAlreadyScored(false);
                }
            })
            .catch(() => {
                const initial: Record<string, number> = {};
                parameters.forEach((p) => { initial[p.name] = 0; });
                setScores(initial);
            })
            .finally(() => setLoadingScores(false));
    }, [open, user?.email, docId]);

    function updateScore(paramName: string, value: string, maxScore: number) {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
            setScores((prev) => ({ ...prev, [paramName]: 0 }));
        } else {
            setScores((prev) => ({ ...prev, [paramName]: Math.min(Math.max(0, num), maxScore) }));
        }
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const maxTotal = parameters.reduce((a, p) => a + p.maxScore, 0);

    async function handleSubmit() {
        if (!user?.email) return;
        setSaving(true);
        try {
            const scorePayload = {
                submissionId: submission.id,
                juryEmail: user.email,
                formConfigurationId: submission.formConfigurationId,
                segmentName,
                scores,
                totalScore,
            };
            await setDoc(doc(firestore, "jury_scores", docId), {
                ...scorePayload,
                scoredAt: serverTimestamp(),
            });
            toast({
                title: alreadyScored ? "Scores updated" : "Scores submitted",
                description: `Total: ${totalScore}/${maxTotal}`,
            });
            setAlreadyScored(true);
            onScoreSubmitted?.(scorePayload);
        } catch (err: any) {
            toast({ title: "Error saving scores", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    }

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
            <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col overflow-hidden p-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <div className="flex items-start justify-between gap-4 pr-6">
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                {formConfig?.categoryName ?? "Submission"} — #{submission.id.slice(-6).toUpperCase()}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Submitted on {formattedDate} · <span className="font-medium">{segmentName}</span> Segment
                            </p>
                        </div>
                        {alreadyScored && (
                            <Badge variant="outline" className="text-green-700 border-green-500 bg-green-50 dark:bg-green-950 dark:text-green-400 gap-1.5 shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Scored
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                {/* Body: 70/30 split */}
                <div className="flex-1 flex overflow-hidden min-h-0">
                    {/* LHS: Submission responses (70%) */}
                    <div className="w-[70%] overflow-y-auto px-6 py-5 space-y-6 border-r">
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

                    {/* RHS: Scoring panel (30%) */}
                    <div className="w-[30%] overflow-y-auto px-5 py-5 flex flex-col bg-muted/20">
                        <div className="flex items-center gap-2 mb-5">
                            <Star className="h-5 w-5 text-primary" />
                            <h3 className="text-base font-bold">Evaluation Score</h3>
                        </div>

                        {loadingScores ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4 flex-1">
                                    {parameters.map((param) => (
                                        <div key={param.name}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-sm font-medium leading-tight">{param.name}</label>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    max {param.maxScore}
                                                </span>
                                            </div>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={param.maxScore}
                                                value={scores[param.name] ?? 0}
                                                onChange={(e) => updateScore(param.name, e.target.value, param.maxScore)}
                                                className="h-9 text-center font-mono font-semibold"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <Separator className="my-4" />

                                {/* Total */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-bold">Total Score</span>
                                    <span className={cn(
                                        "text-2xl font-bold font-mono",
                                        totalScore > 0 ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {totalScore}<span className="text-sm text-muted-foreground">/{maxTotal}</span>
                                    </span>
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    disabled={saving || totalScore === 0}
                                    className="w-full gap-2"
                                    size="lg"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {alreadyScored ? "Update Scores" : "Submit Scores"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

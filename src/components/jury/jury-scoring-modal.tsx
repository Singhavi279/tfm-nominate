"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ColorSlider } from "@/components/ui/color-slider";
import { ExternalLink, Loader2, CheckCircle2, Star, AlertTriangle, Lock } from "lucide-react";
import { FormConfig } from "@/lib/types";
import { ParsedSubmission } from "@/lib/actions";
import { useFirestore, useUser } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { SCORING_PARAMETERS, getSegmentForCategory } from "@/lib/scoring-parameters";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MASKED_PLACEHOLDER = "Prefer not to disclose";
const MIN_SCORE = 1;
const DISPLAY_MAX = 10;

/** Returns an HSL color string: red (1) → yellow (5) → green (10). */
function scoreColor(value: number): string {
    const ratio = Math.max(0, Math.min((value - 1) / 9, 1));
    const hue = ratio * 130;
    return `hsl(${hue}, 80%, 42%)`;
}

function scoreBg(value: number): string {
    const ratio = Math.max(0, Math.min((value - 1) / 9, 1));
    const hue = ratio * 130;
    return `hsl(${hue}, 75%, 94%)`;
}

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
    const [showConfirm, setShowConfirm] = useState(false);

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
                    const initial: Record<string, number> = {};
                    parameters.forEach((p) => { initial[p.name] = MIN_SCORE; });
                    setScores(initial);
                    setAlreadyScored(false);
                }
            })
            .catch(() => {
                const initial: Record<string, number> = {};
                parameters.forEach((p) => { initial[p.name] = MIN_SCORE; });
                setScores(initial);
            })
            .finally(() => setLoadingScores(false));
    }, [open, user?.email, docId]);

    function updateScore(paramName: string, value: number) {
        if (alreadyScored) return; // Locked after submission
        setScores((prev) => ({ ...prev, [paramName]: Math.min(Math.max(MIN_SCORE, value), 10) }));
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const maxTotal = parameters.reduce((a, p) => a + p.maxScore, 0); // 40
    const displayedTotal = maxTotal > 0 ? (totalScore / maxTotal) * DISPLAY_MAX : 0;

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
                displayedTotal: parseFloat(displayedTotal.toFixed(1)),
            };
            await setDoc(doc(firestore, "jury_scores", docId), {
                ...scorePayload,
                scoredAt: serverTimestamp(),
            });
            toast({
                title: "Scores submitted",
                description: `Total: ${displayedTotal.toFixed(1)}/${DISPLAY_MAX}`,
            });
            setAlreadyScored(true);
            setShowConfirm(false);
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
                                            const rawValue = isFile
                                                ? submission.attachments[q.id]
                                                : submission.responses[q.id];
                                            const display = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue;
                                            const isMasked = rawValue === MASKED_PLACEHOLDER;

                                            return (
                                                <div key={q.id} className="rounded-lg border bg-muted/30 px-4 py-3">
                                                    <p className="text-xs text-muted-foreground mb-1">{q.title}</p>
                                                    {isFile ? (
                                                        display && !isMasked ? (
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
                                                            <p className="text-sm text-muted-foreground italic">
                                                                {isMasked ? MASKED_PLACEHOLDER : "No file uploaded"}
                                                            </p>
                                                        )
                                                    ) : (
                                                        <p className={cn(
                                                            "text-sm whitespace-pre-wrap",
                                                            isMasked ? "text-muted-foreground italic" : "font-medium"
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
                                <div className="space-y-5 flex-1">
                                    {parameters.map((param) => {
                                        const val = scores[param.name] ?? MIN_SCORE;
                                        const color = scoreColor(val);
                                        const bg = scoreBg(val);

                                        return (
                                            <div key={param.name}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-medium leading-tight">{param.name}</label>
                                                    <span
                                                        className="text-sm font-bold font-mono rounded-md px-2.5 py-0.5 min-w-[2.5rem] text-center transition-all duration-200"
                                                        style={{ color, backgroundColor: bg }}
                                                    >
                                                        {val}
                                                    </span>
                                                </div>
                                                <ColorSlider
                                                    min={MIN_SCORE}
                                                    max={param.maxScore}
                                                    step={1}
                                                    value={[val]}
                                                    onValueChange={([v]) => updateScore(param.name, v)}
                                                    trackColor={color}
                                                    thumbColor={color}
                                                    disabled={alreadyScored}
                                                />
                                                <div className="flex justify-between mt-1">
                                                    <span className="text-[10px] text-muted-foreground">{MIN_SCORE}</span>
                                                    <span className="text-[10px] text-muted-foreground">{param.maxScore}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Separator className="my-4" />

                                {/* Total — displayed out of 10 */}
                                <div
                                    className="rounded-xl p-4 mb-4 text-center transition-all duration-300"
                                    style={{ backgroundColor: scoreBg(Math.round(displayedTotal) || 1) }}
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Score</p>
                                    <span
                                        className="text-4xl font-black font-mono transition-colors duration-300"
                                        style={{ color: scoreColor(Math.round(displayedTotal) || 1) }}
                                    >
                                        {displayedTotal.toFixed(1)}
                                    </span>
                                    <span className="text-lg text-muted-foreground font-medium">/{DISPLAY_MAX}</span>
                                </div>

                                {alreadyScored ? (
                                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-muted text-muted-foreground">
                                        <Lock className="h-4 w-4" />
                                        <span className="text-sm font-medium">Scores Submitted & Locked</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start gap-2 mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-800 dark:text-amber-300">
                                                Scores are <strong>final</strong> and cannot be changed once submitted. Please review carefully.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setShowConfirm(true)}
                                            disabled={saving}
                                            className="w-full gap-2"
                                            size="lg"
                                        >
                                            Submit Scores
                                        </Button>
                                    </>
                                )}

                                {/* Confirmation dialog */}
                                <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                                Confirm Score Submission
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                You are about to submit a total score of <strong className="text-foreground">{displayedTotal.toFixed(1)}/{DISPLAY_MAX}</strong>. This action is <strong className="text-destructive">irreversible</strong> — you will not be able to edit or update your scores after submission.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleSubmit}
                                                disabled={saving}
                                                className="gap-2 bg-primary"
                                            >
                                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                                Confirm & Submit
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

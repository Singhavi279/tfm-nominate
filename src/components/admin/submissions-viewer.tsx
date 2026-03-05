"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, FileText, Eye, Clock, CheckCircle2, XCircle, AlertTriangle, Trophy, Star, TrendingUp } from "lucide-react";
import { getFormConfig, ParsedSubmission } from "@/lib/actions";
import { FormConfig } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { collectionGroup, collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { SubmissionDetailModal, SubmissionStatus } from "./submission-detail-modal";
import { JuryScoringModal } from "@/components/jury/jury-scoring-modal";
import { cn } from "@/lib/utils";
import { SCORING_PARAMETERS, getSegmentForCategory, ScoringParameter } from "@/lib/scoring-parameters";

type EnrichedSubmission = ParsedSubmission & { status: SubmissionStatus };

type JuryScore = {
    submissionId: string;
    juryEmail: string;
    scores: Record<string, number>;
    totalScore: number;
    segmentName: string;
};

interface SubmissionsViewerProps {
    categoryId: string;
    categoryName: string;
    onBack: () => void;
    showAuditInfo?: boolean;
    statusFilters?: SubmissionStatus[];
    useJuryModal?: boolean;
}

const STATUS_BADGE: Record<SubmissionStatus, { label: string; icon: React.ReactNode; className: string }> = {
    pending: {
        label: "Pending",
        icon: <Clock className="h-3 w-3" />,
        className: "text-slate-700 border-slate-300 bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400",
    },
    approved: {
        label: "Approved",
        icon: <CheckCircle2 className="h-3 w-3" />,
        className: "text-green-700 border-green-500 bg-green-50 dark:bg-green-950 dark:text-green-400",
    },
    issues: {
        label: "Ok, With Issues",
        icon: <AlertTriangle className="h-3 w-3" />,
        className: "text-yellow-700 border-yellow-400 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400",
    },
    rejected: {
        label: "Rejected",
        icon: <XCircle className="h-3 w-3" />,
        className: "text-red-700 border-red-500 bg-red-50 dark:bg-red-950 dark:text-red-400",
    },
};

// ── Score Breakdown Popover ──────────────────────────────────────────────────

function ScoreBreakdownPopover({
    score,
    juryEmail,
    displayName,
    parameters,
}: {
    score: JuryScore;
    juryEmail: string;
    displayName: string;
    parameters: ScoringParameter[];
}) {
    const maxTotal = parameters.reduce((a, p) => a + p.maxScore, 0);
    const pct = maxTotal > 0 ? Math.round((score.totalScore / maxTotal) * 100) : 0;

    // Color coding based on percentage
    const pillColor = pct >= 75
        ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700"
        : pct >= 50
            ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700"
            : "bg-red-100 text-red-800 border-red-300 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-700";

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold font-mono cursor-pointer transition-colors",
                        pillColor
                    )}
                >
                    {score.totalScore}
                    <span className="text-[10px] opacity-60">/{maxTotal}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="center" side="bottom">
                <div className="px-4 py-3 border-b bg-muted/30">
                    <p className="text-xs text-muted-foreground">Score Breakdown</p>
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                    {parameters.map((param) => {
                        const val = score.scores[param.name] ?? 0;
                        const barPct = param.maxScore > 0 ? (val / param.maxScore) * 100 : 0;
                        return (
                            <div key={param.name}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground truncate mr-2">{param.name}</span>
                                    <span className="font-mono font-semibold shrink-0">
                                        {val}<span className="text-muted-foreground">/{param.maxScore}</span>
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            barPct >= 75 ? "bg-emerald-500" : barPct >= 50 ? "bg-amber-500" : "bg-red-500"
                                        )}
                                        style={{ width: `${barPct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Separator />
                <div className="px-4 py-2.5 flex items-center justify-between bg-muted/30">
                    <span className="text-xs font-medium">Total</span>
                    <span className="text-sm font-bold font-mono">
                        {score.totalScore}<span className="text-xs text-muted-foreground">/{maxTotal}</span>
                    </span>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ── Rank Badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700">
                <Trophy className="h-3 w-3" />
                1st
            </span>
        );
    }
    if (rank === 2) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700">
                2nd
            </span>
        );
    }
    if (rank === 3) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 text-xs font-bold dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700">
                3rd
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border text-xs font-medium">
            #{rank}
        </span>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SubmissionsViewer({ categoryId, categoryName, onBack, showAuditInfo = false, statusFilters, useJuryModal = false }: SubmissionsViewerProps) {
    const firestore = useFirestore();
    const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
    const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<EnrichedSubmission | null>(null);

    // Jury scores state (only fetched when showAuditInfo is true = Super Admin)
    const [juryScores, setJuryScores] = useState<JuryScore[]>([]);
    const [juryNames, setJuryNames] = useState<string[]>([]);
    const [juryDisplayNames, setJuryDisplayNames] = useState<Record<string, string>>({});

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
                        statusUpdatedAt: data.statusUpdatedAt?.toDate?.()?.toISOString?.() || undefined,
                        statusUpdatedBy: data.statusUpdatedBy || undefined,
                    };
                });
                const filtered = statusFilters ? subs.filter((s) => statusFilters.includes(s.status)) : subs;
                setSubmissions(filtered);

                // Fetch jury scores if super admin view
                if (showAuditInfo && filtered.length > 0) {
                    const scoresQuery = query(
                        collection(firestore, "jury_scores"),
                        where("formConfigurationId", "==", categoryId)
                    );
                    const scoresSnap = await getDocs(scoresQuery);
                    const allScores: JuryScore[] = scoresSnap.docs.map((d) => ({
                        submissionId: d.data().submissionId,
                        juryEmail: d.data().juryEmail,
                        scores: d.data().scores || {},
                        totalScore: d.data().totalScore || 0,
                        segmentName: d.data().segmentName || "",
                    }));
                    setJuryScores(allScores);

                    // Get unique jury names and fetch display names
                    const uniqueJury = [...new Set(allScores.map((s) => s.juryEmail))].sort();
                    setJuryNames(uniqueJury);

                    // Fetch displayName from user_roles for each jury member
                    const nameMap: Record<string, string> = {};
                    await Promise.all(
                        uniqueJury.map(async (email) => {
                            try {
                                const roleSnap = await getDoc(doc(firestore, "user_roles", email));
                                if (roleSnap.exists() && roleSnap.data().displayName) {
                                    nameMap[email] = roleSnap.data().displayName;
                                } else {
                                    nameMap[email] = email.split("@")[0];
                                }
                            } catch {
                                nameMap[email] = email.split("@")[0];
                            }
                        })
                    );
                    setJuryDisplayNames(nameMap);
                }
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
        setSelectedSubmission((prev) => (prev?.id === id ? { ...prev, status } : prev));
    };

    // Compute averages and ranks
    const segment = formConfig ? getSegmentForCategory(formConfig.categoryName) : "Organization";
    const parameters = SCORING_PARAMETERS[segment] || [];
    const maxTotal = parameters.reduce((a, p) => a + p.maxScore, 0);

    const submissionStats = useMemo(() => {
        if (!showAuditInfo || juryNames.length === 0) return {};

        const stats: Record<string, { avg: number; rank: number }> = {};

        // Compute average for each submission
        const avgEntries: { id: string; avg: number }[] = [];
        submissions.forEach((sub) => {
            const subScores = juryScores.filter((s) => s.submissionId === sub.id);
            if (subScores.length > 0) {
                const avg = Math.round(subScores.reduce((a, s) => a + s.totalScore, 0) / subScores.length * 10) / 10;
                avgEntries.push({ id: sub.id, avg });
            } else {
                avgEntries.push({ id: sub.id, avg: 0 });
            }
        });

        // Sort by avg descending for rank
        const sorted = [...avgEntries].sort((a, b) => b.avg - a.avg);
        sorted.forEach((entry, idx) => {
            // Handle ties: same rank for same score
            const rank = idx === 0 ? 1 : (entry.avg === sorted[idx - 1].avg ? stats[sorted[idx - 1].id].rank : idx + 1);
            stats[entry.id] = { avg: entry.avg, rank: entry.avg > 0 ? rank : 0 };
        });

        return stats;
    }, [submissions, juryScores, juryNames, showAuditInfo]);

    const hasJuryData = showAuditInfo && juryNames.length > 0;

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
                        {hasJuryData && ` · ${juryNames.length} jury member${juryNames.length !== 1 ? "s" : ""}`}
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
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Submissions</CardTitle>
                            {hasJuryData && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Star className="h-3.5 w-3.5" />
                                    Click score to see breakdown
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead className="w-[80px]">View</TableHead>
                                        <TableHead className="w-[170px]">Submitted At</TableHead>
                                        <TableHead className="w-[130px]">Status</TableHead>
                                        {hasJuryData && juryNames.map((email) => (
                                            <TableHead key={email} className="text-center min-w-[100px]">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-xs font-medium truncate max-w-[100px]" title={email}>
                                                        {juryDisplayNames[email] || email.split("@")[0]}
                                                    </span>
                                                </div>
                                            </TableHead>
                                        ))}
                                        {hasJuryData && (
                                            <TableHead className="text-center min-w-[80px]">
                                                <div className="flex items-center justify-center gap-1">
                                                    <TrendingUp className="h-3 w-3" />
                                                    Avg
                                                </div>
                                            </TableHead>
                                        )}
                                        {hasJuryData && (
                                            <TableHead className="text-center min-w-[70px]">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Trophy className="h-3 w-3" />
                                                    Rank
                                                </div>
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.map((sub, idx) => {
                                        const statusCfg = STATUS_BADGE[sub.status];
                                        const stats = submissionStats[sub.id];
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
                                                {hasJuryData && juryNames.map((email) => {
                                                    const score = juryScores.find(
                                                        (s) => s.submissionId === sub.id && s.juryEmail === email
                                                    );
                                                    return (
                                                        <TableCell key={email} className="text-center">
                                                            {score ? (
                                                                <ScoreBreakdownPopover
                                                                    score={score}
                                                                    juryEmail={email}
                                                                    displayName={juryDisplayNames[email] || email.split("@")[0]}
                                                                    parameters={parameters}
                                                                />
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                                {hasJuryData && (
                                                    <TableCell className="text-center">
                                                        {stats && stats.avg > 0 ? (
                                                            <span className="font-mono font-bold text-sm">
                                                                {stats.avg}
                                                                <span className="text-[10px] text-muted-foreground">/{maxTotal}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {hasJuryData && (
                                                    <TableCell className="text-center">
                                                        {stats && stats.rank > 0 ? (
                                                            <RankBadge rank={stats.rank} />
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                )}
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
            {selectedSubmission && !useJuryModal && (
                <SubmissionDetailModal
                    submission={selectedSubmission}
                    formConfig={formConfig}
                    open={!!selectedSubmission}
                    onClose={() => setSelectedSubmission(null)}
                    onStatusChange={handleStatusChange}
                    showAuditInfo={showAuditInfo}
                />
            )}
            {selectedSubmission && useJuryModal && (
                <JuryScoringModal
                    submission={selectedSubmission}
                    formConfig={formConfig}
                    open={!!selectedSubmission}
                    onClose={() => setSelectedSubmission(null)}
                />
            )}
        </div>
    );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, UserPlus, Trash2, Users, ShieldCheck, Settings2 } from "lucide-react";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { FormConfig } from "@/lib/types";
import { SEGMENT_ORDER, CATEGORY_ORDER } from "@/lib/award-categories";

type RoleEntry = {
    email: string;
    role: "evaluator" | "jury";
    addedAt?: string;
    addedBy?: string;
    assignedCategories?: string[];
};

// ── Evaluator Section (unchanged simple add/remove) ──────────────────────────

function EvaluatorSection({
    members,
    onAdd,
    onRemove,
    loading,
}: {
    members: RoleEntry[];
    onAdd: (email: string) => Promise<void>;
    onRemove: (email: string) => Promise<void>;
    loading: boolean;
}) {
    const [email, setEmail] = useState("");
    const [adding, setAdding] = useState(false);

    async function handleAdd() {
        if (!email.trim()) return;
        setAdding(true);
        await onAdd(email.trim().toLowerCase());
        setEmail("");
        setAdding(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Evaluators
                </CardTitle>
                <CardDescription>Evaluators can view all submissions and update their status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        disabled={adding}
                    />
                    <Button onClick={handleAdd} disabled={adding || !email.trim()} className="gap-1.5 shrink-0">
                        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        Add
                    </Button>
                </div>
                <Separator />
                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No evaluators assigned yet.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead className="w-[80px] text-right">Remove</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((m) => (
                                <TableRow key={m.email}>
                                    <TableCell className="font-mono text-sm">{m.email}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onRemove(m.email)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// ── Category Assignment Dialog ───────────────────────────────────────────────

function CategoryAssignmentDialog({
    open,
    onClose,
    juryEmail,
    currentCategories,
    allConfigs,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    juryEmail: string;
    currentCategories: string[];
    allConfigs: FormConfig[];
    onSave: (email: string, categories: string[]) => Promise<void>;
}) {
    const [selected, setSelected] = useState<Set<string>>(new Set(currentCategories));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSelected(new Set(currentCategories));
    }, [currentCategories, open]);

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleSegment(segmentName: string) {
        const cats = (CATEGORY_ORDER[segmentName] || []);
        const configIds = allConfigs
            .filter((c) => cats.includes(c.categoryName))
            .map((c) => c.id);
        const allSelected = configIds.every((id) => selected.has(id));
        setSelected((prev) => {
            const next = new Set(prev);
            configIds.forEach((id) => allSelected ? next.delete(id) : next.add(id));
            return next;
        });
    }

    async function handleSave() {
        setSaving(true);
        await onSave(juryEmail, Array.from(selected));
        setSaving(false);
        onClose();
    }

    // Group configs by segment for display
    const configMap = useMemo(() => {
        const map: Record<string, FormConfig> = {};
        allConfigs.forEach((c) => { map[c.categoryName] = c; });
        return map;
    }, [allConfigs]);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Assign Categories — {juryEmail}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-6 py-2">
                    {SEGMENT_ORDER.map((segmentName) => {
                        const categories = CATEGORY_ORDER[segmentName] || [];
                        const configIds = categories
                            .map((name) => configMap[name]?.id)
                            .filter(Boolean) as string[];
                        const allSel = configIds.length > 0 && configIds.every((id) => selected.has(id));
                        const someSel = configIds.some((id) => selected.has(id));

                        return (
                            <div key={segmentName}>
                                <div
                                    className="flex items-center gap-2 mb-3 cursor-pointer"
                                    onClick={() => toggleSegment(segmentName)}
                                >
                                    <Checkbox
                                        checked={allSel ? true : someSel ? "indeterminate" : false}
                                        onCheckedChange={() => toggleSegment(segmentName)}
                                    />
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        {segmentName} Segment
                                    </h3>
                                    <Badge variant="secondary" className="text-xs">
                                        {configIds.filter((id) => selected.has(id)).length}/{configIds.length}
                                    </Badge>
                                </div>
                                <div className="space-y-1.5 ml-6">
                                    {categories.map((catName) => {
                                        const cfg = configMap[catName];
                                        if (!cfg) return null;
                                        return (
                                            <label
                                                key={cfg.id}
                                                className="flex items-center gap-2 cursor-pointer py-1 hover:bg-muted/50 rounded px-2 -mx-2"
                                            >
                                                <Checkbox
                                                    checked={selected.has(cfg.id)}
                                                    onCheckedChange={() => toggle(cfg.id)}
                                                />
                                                <span className="text-sm">{catName}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <Separator className="mt-4" />
                            </div>
                        );
                    })}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save ({selected.size} categories)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Jury Section with category assignment ────────────────────────────────────

function JurySection({
    members,
    onAdd,
    onRemove,
    onSaveCategories,
    loading,
    allConfigs,
}: {
    members: RoleEntry[];
    onAdd: (email: string) => Promise<void>;
    onRemove: (email: string) => Promise<void>;
    onSaveCategories: (email: string, categories: string[]) => Promise<void>;
    loading: boolean;
    allConfigs: FormConfig[];
}) {
    const [email, setEmail] = useState("");
    const [adding, setAdding] = useState(false);
    const [editingMember, setEditingMember] = useState<RoleEntry | null>(null);

    async function handleAdd() {
        if (!email.trim()) return;
        setAdding(true);
        await onAdd(email.trim().toLowerCase());
        setEmail("");
        setAdding(false);
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Jury Members
                    </CardTitle>
                    <CardDescription>Jury can view Approved / Ok-With-Issues submissions and score them. Assign specific categories per jury member.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            disabled={adding}
                        />
                        <Button onClick={handleAdd} disabled={adding || !email.trim()} className="gap-1.5 shrink-0">
                            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            Add
                        </Button>
                    </div>
                    <Separator />
                    {loading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : members.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No jury members assigned yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="w-[120px] text-center">Categories</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((m) => (
                                    <TableRow key={m.email}>
                                        <TableCell className="font-mono text-sm">{m.email}</TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                                onClick={() => setEditingMember(m)}
                                            >
                                                <Settings2 className="h-3.5 w-3.5" />
                                                {m.assignedCategories?.length || 0}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onRemove(m.email)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {editingMember && (
                <CategoryAssignmentDialog
                    open={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    juryEmail={editingMember.email}
                    currentCategories={editingMember.assignedCategories || []}
                    allConfigs={allConfigs}
                    onSave={onSaveCategories}
                />
            )}
        </>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function UserManagement() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [members, setMembers] = useState<RoleEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch form configs for category assignment
    const formConfigsQuery = useMemoFirebase(() => collection(firestore, "form_configurations"), [firestore]);
    const { data: allConfigs } = useCollection<FormConfig>(formConfigsQuery);

    async function fetchMembers() {
        setLoading(true);
        try {
            const snap = await getDocs(collection(firestore, "user_roles"));
            setMembers(snap.docs.map((d) => ({
                email: d.id,
                role: d.data().role,
                addedAt: d.data().addedAt?.toDate?.()?.toLocaleDateString("en-IN"),
                addedBy: d.data().addedBy,
                assignedCategories: d.data().assignedCategories || [],
            })));
        } catch (err) {
            console.error("Failed to fetch user_roles:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchMembers(); }, [firestore]);

    async function handleAddEvaluator(email: string) {
        try {
            await setDoc(doc(firestore, "user_roles", email), {
                role: "evaluator",
                addedAt: serverTimestamp(),
                addedBy: user?.email ?? "unknown",
            });
            toast({ title: "Role assigned", description: `${email} is now an evaluator.` });
            await fetchMembers();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    }

    async function handleAddJury(email: string) {
        try {
            await setDoc(doc(firestore, "user_roles", email), {
                role: "jury",
                assignedCategories: [],
                addedAt: serverTimestamp(),
                addedBy: user?.email ?? "unknown",
            });
            toast({ title: "Role assigned", description: `${email} is now a jury member. Assign categories next.` });
            await fetchMembers();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    }

    async function handleRemove(email: string) {
        try {
            await deleteDoc(doc(firestore, "user_roles", email));
            toast({ title: "Role removed", description: `${email}'s role has been revoked.` });
            setMembers((prev) => prev.filter((m) => m.email !== email));
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    }

    async function handleSaveCategories(email: string, categories: string[]) {
        try {
            await updateDoc(doc(firestore, "user_roles", email), {
                assignedCategories: categories,
            });
            toast({ title: "Categories updated", description: `${email} now has ${categories.length} assigned categories.` });
            setMembers((prev) =>
                prev.map((m) => m.email === email ? { ...m, assignedCategories: categories } : m)
            );
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    }

    const evaluators = members.filter((m) => m.role === "evaluator");
    const jury = members.filter((m) => m.role === "jury");

    return (
        <div className="space-y-6">
            <EvaluatorSection
                members={evaluators}
                onAdd={handleAddEvaluator}
                onRemove={handleRemove}
                loading={loading}
            />
            <JurySection
                members={jury}
                onAdd={handleAddJury}
                onRemove={handleRemove}
                onSaveCategories={handleSaveCategories}
                loading={loading}
                allConfigs={allConfigs || []}
            />
        </div>
    );
}

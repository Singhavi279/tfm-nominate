"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, UserPlus, Trash2, Users, ShieldCheck } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

type RoleEntry = { email: string; role: "evaluator" | "jury"; addedAt?: string; addedBy?: string };

function RoleSection({
    title,
    description,
    icon,
    role,
    members,
    onAdd,
    onRemove,
    loading,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    role: "evaluator" | "jury";
    members: RoleEntry[];
    onAdd: (email: string, role: "evaluator" | "jury") => Promise<void>;
    onRemove: (email: string) => Promise<void>;
    loading: boolean;
}) {
    const [email, setEmail] = useState("");
    const [adding, setAdding] = useState(false);

    async function handleAdd() {
        if (!email.trim()) return;
        setAdding(true);
        await onAdd(email.trim().toLowerCase(), role);
        setEmail("");
        setAdding(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add member */}
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

                {/* Members list */}
                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No {title.toLowerCase()} assigned yet.</p>
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => onRemove(m.email)}
                                        >
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

export function UserManagement() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [members, setMembers] = useState<RoleEntry[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchMembers() {
        setLoading(true);
        try {
            const snap = await getDocs(collection(firestore, "user_roles"));
            setMembers(snap.docs.map((d) => ({
                email: d.id,
                role: d.data().role,
                addedAt: d.data().addedAt?.toDate?.()?.toLocaleDateString("en-IN"),
                addedBy: d.data().addedBy,
            })));
        } catch (err) {
            console.error("Failed to fetch user_roles:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchMembers(); }, [firestore]);

    async function handleAdd(email: string, role: "evaluator" | "jury") {
        try {
            await setDoc(doc(firestore, "user_roles", email), {
                role,
                addedAt: serverTimestamp(),
                addedBy: user?.email ?? "unknown",
            });
            toast({ title: "Role assigned", description: `${email} is now a ${role}.` });
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

    const evaluators = members.filter((m) => m.role === "evaluator");
    const jury = members.filter((m) => m.role === "jury");

    return (
        <div className="space-y-6">
            <RoleSection
                title="Evaluators"
                description="Evaluators can view all submissions and update their status."
                icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                role="evaluator"
                members={evaluators}
                onAdd={handleAdd}
                onRemove={handleRemove}
                loading={loading}
            />
            <RoleSection
                title="Jury Members"
                description="Jury can view Approved and Ok-With-Issues submissions (read-only)."
                icon={<Users className="h-4 w-4 text-primary" />}
                role="jury"
                members={jury}
                onAdd={handleAdd}
                onRemove={handleRemove}
                loading={loading}
            />
        </div>
    );
}

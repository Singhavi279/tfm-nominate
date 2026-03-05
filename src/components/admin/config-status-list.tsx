"use client";

import { useState, useEffect, useMemo } from "react";
import { FormConfig } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, Eye } from "lucide-react";
import { SEGMENT_ORDER, CATEGORY_ORDER } from "@/lib/award-categories";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, getDocs, collectionGroup } from "firebase/firestore";
import { SubmissionsViewer } from "./submissions-viewer";

export function ConfigStatusList({
  onViewCategory,
  statusFilters,
  assignedCategories,
}: {
  onViewCategory?: (id: string, name: string) => void;
  statusFilters?: string[];
  assignedCategories?: string[];
} = {}) {
  const firestore = useFirestore();

  const formConfigsQuery = useMemoFirebase(() => {
    return collection(firestore, 'form_configurations');
  }, [firestore]);

  const { data: allConfigs, isLoading } = useCollection<FormConfig>(formConfigsQuery);

  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [evaluatedCounts, setEvaluatedCounts] = useState<Record<string, number>>({});
  const [juryAssignedSet, setJuryAssignedSet] = useState<Set<string>>(new Set());
  const [juryScoredCounts, setJuryScoredCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [viewingCategory, setViewingCategory] = useState<{ id: string; name: string } | null>(null);

  // Whether the caller is Super Admin (no onViewCategory = internal viewer = Super Admin)
  const isSuperAdmin = !onViewCategory;

  function handleView(id: string, name: string) {
    if (onViewCategory) {
      onViewCategory(id, name);
    } else {
      setViewingCategory({ id, name });
    }
  }

  useEffect(() => {
    if (!firestore) return;

    async function fetchCounts() {
      setCountsLoading(true);
      try {
        // 1. Fetch all submissions — count total + evaluator-screened per category
        const snapshot = await getDocs(collectionGroup(firestore, "submissions"));
        const counts: Record<string, number> = {};
        const evCounts: Record<string, number> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const catId = data?.formConfigurationId;
          if (catId) {
            counts[catId] = (counts[catId] || 0) + 1;
            if (data.status && data.status !== "pending") {
              evCounts[catId] = (evCounts[catId] || 0) + 1;
            }
          }
        });
        setSubmissionCounts(counts);
        setEvaluatedCounts(evCounts);

        // 2. Fetch jury assignments — which category IDs are assigned to any jury member
        const rolesSnap = await getDocs(collection(firestore, "user_roles"));
        const assignedSet = new Set<string>();
        rolesSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.role === "jury" && Array.isArray(data.assignedCategories)) {
            data.assignedCategories.forEach((catId: string) => assignedSet.add(catId));
          }
        });
        setJuryAssignedSet(assignedSet);

        // 3. Fetch jury scores — count unique submissions scored per category
        const scoresSnap = await getDocs(collection(firestore, "jury_scores"));
        const scoredSubs: Record<string, Set<string>> = {};
        scoresSnap.docs.forEach((d) => {
          const data = d.data();
          const catId = data.formConfigurationId;
          const subId = data.submissionId;
          if (catId && subId) {
            if (!scoredSubs[catId]) scoredSubs[catId] = new Set();
            scoredSubs[catId].add(subId);
          }
        });
        const scoredCounts: Record<string, number> = {};
        Object.entries(scoredSubs).forEach(([catId, subs]) => {
          scoredCounts[catId] = subs.size;
        });
        setJuryScoredCounts(scoredCounts);
      } catch (error) {
        console.error("Error fetching submission counts:", error);
      } finally {
        setCountsLoading(false);
      }
    }
    fetchCounts();
  }, [firestore]);

  const configs = useMemo(() => {
    if (!allConfigs) return [];

    const configsByCategoryName: Record<string, FormConfig> = {};
    allConfigs.forEach(c => {
      configsByCategoryName[c.categoryName] = c;
    });

    const result: FormConfig[] = [];
    SEGMENT_ORDER.forEach(segmentName => {
      const categoryOrder = CATEGORY_ORDER[segmentName] || [];
      categoryOrder.forEach(categoryName => {
        if (configsByCategoryName[categoryName]) {
          result.push(configsByCategoryName[categoryName]);
          delete configsByCategoryName[categoryName];
        } else {
          result.push({
            id: categoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, ''),
            categoryName: categoryName,
            segmentName: segmentName,
            description: "",
            sections: [],
          });
        }
      });
    });

    Object.values(configsByCategoryName).forEach(config => {
      result.push(config);
    });

    // If assignedCategories is provided, only show those categories
    if (assignedCategories) {
      return result.filter(c => assignedCategories.includes(c.id));
    }

    return result;
  }, [allConfigs, assignedCategories]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (viewingCategory && !onViewCategory) {
    return (
      <SubmissionsViewer
        categoryId={viewingCategory.id}
        categoryName={viewingCategory.name}
        onBack={() => setViewingCategory(null)}
        showAuditInfo={!onViewCategory} // Super Admin gets audit info
        statusFilters={statusFilters as any}
      />
    );
  }

  if (!allConfigs || configs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Configuration Status</CardTitle>
        <CardDescription>
          Overview of all award categories — their form config status and submission counts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Segment</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[110px] text-center">JSON Status</TableHead>
                <TableHead className="w-[80px] text-center">Entries</TableHead>
                {isSuperAdmin && (
                  <>
                    <TableHead className="w-[110px] text-center">EY Evaluated</TableHead>
                    <TableHead className="w-[110px] text-center">Jury Assigned</TableHead>
                    <TableHead className="w-[110px] text-center">Jury Evaluated</TableHead>
                  </>
                )}
                <TableHead className="w-[130px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => {
                const hasData = config.sections && Array.isArray(config.sections) && config.sections.length > 0;
                const entries = submissionCounts[config.id] || 0;
                const eyEval = evaluatedCounts[config.id] || 0;
                const isJuryAssigned = juryAssignedSet.has(config.id);
                const juryScored = juryScoredCounts[config.id] || 0;

                return (
                  <TableRow key={config.id}>
                    <TableCell className="text-muted-foreground">{config.segmentName}</TableCell>
                    <TableCell className="font-medium">{config.categoryName}</TableCell>
                    <TableCell className="text-center">
                      {hasData ? (
                        <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Added
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive bg-red-50 dark:bg-red-950">
                          <XCircle className="mr-1 h-3 w-3" />
                          Empty
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {countsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <Badge variant="secondary">{entries}</Badge>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <>
                        <TableCell className="text-center">
                          {countsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : (
                            <Badge variant={eyEval > 0 ? "default" : "secondary"}>
                              {eyEval}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {countsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : isJuryAssigned ? (
                            <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950">
                              {entries}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {countsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : (
                            <Badge variant={juryScored > 0 ? "default" : "secondary"}>
                              {juryScored}
                            </Badge>
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(config.id, config.categoryName)}
                        disabled={entries === 0}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View Responses
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

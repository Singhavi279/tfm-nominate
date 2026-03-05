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
import { useTableControls } from "@/hooks/use-table-controls";
import { TableToolbar } from "@/components/ui/table-toolbar";

// Enriched row type for the table
interface ConfigRow {
  id: string;
  categoryName: string;
  segmentName: string;
  hasData: boolean;
  entries: number;
  eyEvaluated: number;
  isJuryAssigned: boolean;
  juryScored: number;
}

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

        const rolesSnap = await getDocs(collection(firestore, "user_roles"));
        const assignedSet = new Set<string>();
        rolesSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.role === "jury" && Array.isArray(data.assignedCategories)) {
            data.assignedCategories.forEach((catId: string) => assignedSet.add(catId));
          }
        });
        setJuryAssignedSet(assignedSet);

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

    if (assignedCategories) {
      return result.filter(c => assignedCategories.includes(c.id));
    }

    return result;
  }, [allConfigs, assignedCategories]);

  // Build enriched rows for table controls
  const rows: ConfigRow[] = useMemo(() => {
    return configs.map((config) => ({
      id: config.id,
      categoryName: config.categoryName,
      segmentName: config.segmentName,
      hasData: !!(config.sections && Array.isArray(config.sections) && config.sections.length > 0),
      entries: submissionCounts[config.id] || 0,
      eyEvaluated: evaluatedCounts[config.id] || 0,
      isJuryAssigned: juryAssignedSet.has(config.id),
      juryScored: juryScoredCounts[config.id] || 0,
    }));
  }, [configs, submissionCounts, evaluatedCounts, juryAssignedSet, juryScoredCounts]);

  // Unique segment names for filter dropdown
  const segmentOptions = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.segmentName))].filter(Boolean).sort();
    return unique.map((s) => ({ value: s, label: s }));
  }, [rows]);

  const tableControls = useTableControls(rows, {
    searchFields: ["categoryName", "segmentName"],
    getSortValue: (item, key) => {
      if (key === "entries") return item.entries;
      if (key === "categoryName") return item.categoryName;
      return (item as any)[key] ?? "";
    },
  });

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
        showAuditInfo={!onViewCategory}
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
        <TableToolbar
          search={tableControls.search}
          onSearchChange={tableControls.setSearch}
          searchPlaceholder="Search categories..."
          totalCount={tableControls.totalCount}
          filteredCount={tableControls.filteredCount}
          filterOptions={[{ key: "segmentName", label: "Segment", options: segmentOptions }]}
          filters={tableControls.filters}
          onFilterChange={tableControls.setFilter}
          sortOptions={[
            { key: "categoryName", label: "Name" },
            { key: "entries", label: "Entries" },
          ]}
          sort={tableControls.sort}
          onSortToggle={tableControls.toggleSort}
        />
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
              {tableControls.filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">{row.segmentName}</TableCell>
                  <TableCell className="font-medium">{row.categoryName}</TableCell>
                  <TableCell className="text-center">
                    {row.hasData ? (
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
                      <Badge variant="secondary">{row.entries}</Badge>
                    )}
                  </TableCell>
                  {isSuperAdmin && (
                    <>
                      <TableCell className="text-center">
                        {countsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : (
                          <Badge variant={row.eyEvaluated > 0 ? "default" : "secondary"}>
                            {row.eyEvaluated}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {countsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : row.isJuryAssigned ? (
                          <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950">
                            {row.entries}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {countsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : (
                          <Badge variant={row.juryScored > 0 ? "default" : "secondary"}>
                            {row.juryScored}
                          </Badge>
                        )}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(row.id, row.categoryName)}
                      disabled={row.entries === 0}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View Responses
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {tableControls.filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 5} className="text-center py-8 text-muted-foreground">
                    No categories match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

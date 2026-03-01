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
import { collection } from "firebase/firestore";
import { getSubmissionCounts } from "@/lib/actions";
import { SubmissionsViewer } from "./submissions-viewer";

export function ConfigStatusList() {
  const firestore = useFirestore();

  const formConfigsQuery = useMemoFirebase(() => {
    return collection(firestore, 'form_configurations');
  }, [firestore]);

  const { data: allConfigs, isLoading } = useCollection<FormConfig>(formConfigsQuery);

  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [viewingCategory, setViewingCategory] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function fetchCounts() {
      setCountsLoading(true);
      const counts = await getSubmissionCounts();
      setSubmissionCounts(counts);
      setCountsLoading(false);
    }
    fetchCounts();
  }, []);

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

    return result;
  }, [allConfigs]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If viewing a specific category's submissions, show that view
  if (viewingCategory) {
    return (
      <SubmissionsViewer
        categoryId={viewingCategory.id}
        categoryName={viewingCategory.name}
        onBack={() => setViewingCategory(null)}
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
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Segment</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[120px] text-center">JSON Status</TableHead>
                <TableHead className="w-[100px] text-center">Responses</TableHead>
                <TableHead className="w-[140px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => {
                const hasData = config.sections && Array.isArray(config.sections) && config.sections.length > 0;
                const count = submissionCounts[config.id] || 0;
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
                        <Badge variant="secondary">{count}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingCategory({ id: config.id, name: config.categoryName })}
                        disabled={count === 0}
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

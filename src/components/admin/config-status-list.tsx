"use client";

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
import { CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";
import { SEGMENT_ORDER, CATEGORY_ORDER } from "@/lib/award-categories";


interface ConfigStatusListProps {
  configs: FormConfig[];
}

export function ConfigStatusList({ configs: allConfigs }: ConfigStatusListProps) {

  const configs = useMemo(() => {
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
          // Add a placeholder for missing configs so the admin knows it needs to be added
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

    // Add any remaining configs that weren't in the ordered list (should be none if lists are synced)
    Object.values(configsByCategoryName).forEach(config => {
      result.push(config);
    });

    return result;

  }, [allConfigs]);

  if (configs.length === 0) {
    return null;
  }

  return (
    <Card className="mt-12">
      <CardHeader>
        <CardTitle>Configuration Status</CardTitle>
        <CardDescription>
          Check which award categories have form data uploaded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Segment</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => {
                const hasData = config.sections && Array.isArray(config.sections) && config.sections.length > 0;
                return (
                  <TableRow key={config.id}>
                    <TableCell className="text-muted-foreground">{config.segmentName}</TableCell>
                    <TableCell className="font-medium">{config.categoryName}</TableCell>
                    <TableCell className="text-center">
                      {hasData ? (
                        <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950">
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Added
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive bg-red-50 dark:bg-red-950">
                           <XCircle className="mr-2 h-4 w-4" />
                          Empty
                        </Badge>
                      )}
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

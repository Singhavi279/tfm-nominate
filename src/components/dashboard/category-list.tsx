"use client";

import { FormConfig } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, FileText } from "lucide-react";

interface CategoryListProps {
  configs: FormConfig[];
}

export function CategoryList({ configs }: CategoryListProps) {
  const segments = useMemo(() => {
    return configs.reduce((acc, config) => {
      const segment = config.segmentName || "Uncategorized";
      if (!acc[segment]) {
        acc[segment] = [];
      }
      acc[segment].push(config);
      return acc;
    }, {} as Record<string, FormConfig[]>);
  }, [configs]);

  if (configs.length === 0) {
    return (
      <Card className="text-center py-12 bg-secondary/50 border-dashed">
        <CardHeader>
          <div className="mx-auto bg-card rounded-full p-3 w-fit">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">No Award Categories Found</CardTitle>
          <CardDescription>An administrator needs to add nomination categories first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/upload">Go to Admin Uploader</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      {Object.entries(segments).map(([segmentName, segmentConfigs]) => (
        <section key={segmentName}>
          <h2 className="text-2xl font-bold font-headline mb-4">{segmentName}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {segmentConfigs.map((config) => (
              <Card key={config.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{config.categoryName}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground line-clamp-3">{config.description}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/nominate/${config.id}`}>
                      Start Nomination <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

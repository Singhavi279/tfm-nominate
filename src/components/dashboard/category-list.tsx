"use client";

import { FormConfig } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, FileText } from "lucide-react";

interface CategoryListProps {
  configs: FormConfig[];
}

const SEGMENT_ORDER = ["Organization", "Initiatives", "Individual"];

const CATEGORY_ORDER: Record<string, string[]> = {
    "Organization": [
        "Comprehensive Maternity Hospital of the Year (National)",
        "Comprehensive Maternity Hospital of the Year (Regional)",
        "High-Risk Pregnancy & Maternal Critical Care Centre of the Year",
        "Centre of Excellence in Fetal Medicine",
        "Neonatal Intensive Care Unit (NICU) of the Year",
        "Excellence in Labour, Delivery & Birthing Infrastructure",
        "Fertility & Reproductive Medicine Centre of the Year",
        "Rural & Underserved Area Maternity Care Excellence",
        "Sustainable & Green Maternity Facility of the Year",
        "Tele-Maternity & Remote Monitoring Solution of the Year",
        "Medical Device Innovation for Labour & NICU",
        "Maternal Health Data & Analytics Solution of the Year",
        "Emerging Maternal Health Start-up of the Year",
        "Maternal Nutrition Brand of the Year",
        "Baby Care Brand of the Year",
        "Mother & Baby Retail Platform of the Year",
        "Innovation in Baby Gear & Infant Safety",
        "Maternity Wear & Comfort Solutions Brand of the Year",
        "Breastfeeding & Lactation Product Innovation Award",
        "Organic & Clean Label Baby Products Brand of the Year"
    ],
    "Initiatives": [
        "Digital Innovation in Maternal Health",
        "AI Innovation in Obstetrics & Neonatal Care",
        "Maternal Health Awareness & CSR Initiative of the Year",
        "Community Outreach for Safe Motherhood",
        "Maternal Mental Health Initiative of the Year",
        "Postpartum Recovery & Rehabilitation Program of the Year",
        "Lactation Support & Breastfeeding Promotion Initiative",
        "Newborn Screening & Preventive Care Initiative",
        "Maternal Health Policy, Advocacy & Systems Impact Award",
        "Breakthrough IVF Advancement Award"
    ],
    "Individual": [
        "Obstetrician of the Year",
        "Neonatologist of the Year",
        "Fertility Specialist of the Year",
        "Fetal Medicine Specialist of the Year",
        "Midwife / Maternity Nurse Leader of the Year",
        "Transformational Leader in Maternity Healthcare"
    ]
};

export function CategoryList({ configs }: CategoryListProps) {
  const segments = useMemo(() => {
    const groupedBySegment = configs.reduce((acc, config) => {
      const segment = config.segmentName || "Uncategorized";
      if (!acc[segment]) {
        acc[segment] = [];
      }
      acc[segment].push(config);
      return acc;
    }, {} as Record<string, FormConfig[]>);

    const orderedSegments: { name: string, configs: FormConfig[] }[] = [];

    SEGMENT_ORDER.forEach(segmentName => {
      if (groupedBySegment[segmentName]) {
        const categoryOrder = CATEGORY_ORDER[segmentName] || [];
        const sortedConfigs = [...groupedBySegment[segmentName]].sort((a, b) => {
          const indexA = categoryOrder.indexOf(a.categoryName);
          const indexB = categoryOrder.indexOf(b.categoryName);
          if (indexA === -1 && indexB === -1) return a.categoryName.localeCompare(b.categoryName);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        orderedSegments.push({ name: segmentName, configs: sortedConfigs });
      }
    });

    // Add any segments from data that are not in SEGMENT_ORDER (e.g. "Uncategorized")
    Object.keys(groupedBySegment).forEach(segmentName => {
      if (!SEGMENT_ORDER.includes(segmentName)) {
        orderedSegments.push({ name: segmentName, configs: groupedBySegment[segmentName] });
      }
    });

    return orderedSegments;
  }, [configs]);

  if (configs.length === 0) {
    return (
      <Card className="text-center py-12 bg-secondary/50 border-dashed">
        <CardHeader>
          <div className="mx-auto bg-card rounded-full p-3 w-fit">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="mt-4">No Award Categories Found</CardTitle>
          <CardContent className="text-muted-foreground">An administrator needs to add nomination categories first.</CardContent>
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
      {segments.map(({ name: segmentName, configs: segmentConfigs }) => (
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

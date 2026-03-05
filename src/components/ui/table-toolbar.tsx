"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { SortConfig } from "@/hooks/use-table-controls";
import { cn } from "@/lib/utils";

export interface FilterOption {
    key: string;
    label: string;
    options: { value: string; label: string }[];
}

export interface SortOption {
    key: string;
    label: string;
}

interface TableToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    totalCount: number;
    filteredCount: number;
    filterOptions?: FilterOption[];
    filters: Record<string, string>;
    onFilterChange: (key: string, value: string) => void;
    sortOptions?: SortOption[];
    sort: SortConfig | null;
    onSortToggle: (key: string) => void;
}

export function TableToolbar({
    search,
    onSearchChange,
    searchPlaceholder = "Search...",
    totalCount,
    filteredCount,
    filterOptions = [],
    filters,
    onFilterChange,
    sortOptions = [],
    sort,
    onSortToggle,
}: TableToolbarProps) {
    const hasActiveFilters = search.trim() || Object.values(filters).some(Boolean);

    function clearAll() {
        onSearchChange("");
        filterOptions.forEach((f) => onFilterChange(f.key, ""));
    }

    return (
        <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>

                {/* Filters */}
                {filterOptions.map((filterOpt) => (
                    <Select
                        key={filterOpt.key}
                        value={filters[filterOpt.key] || "all"}
                        onValueChange={(v) => onFilterChange(filterOpt.key, v === "all" ? "" : v)}
                    >
                        <SelectTrigger className="w-[150px] h-9">
                            <SelectValue placeholder={filterOpt.label} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All {filterOpt.label}</SelectItem>
                            {filterOpt.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ))}

                {/* Sort buttons */}
                {sortOptions.map((sortOpt) => {
                    const isActive = sort?.key === sortOpt.key;
                    return (
                        <Button
                            key={sortOpt.key}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className="h-9 gap-1.5"
                            onClick={() => onSortToggle(sortOpt.key)}
                        >
                            {isActive ? (
                                sort?.direction === "asc" ? (
                                    <ArrowUp className="h-3.5 w-3.5" />
                                ) : (
                                    <ArrowDown className="h-3.5 w-3.5" />
                                )
                            ) : (
                                <ArrowUpDown className="h-3.5 w-3.5" />
                            )}
                            {sortOpt.label}
                        </Button>
                    );
                })}

                {/* Clear all */}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={clearAll}>
                        <X className="h-3.5 w-3.5" />
                        Clear
                    </Button>
                )}
            </div>

            {/* Results count */}
            {hasActiveFilters && (
                <div className="text-xs text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{filteredCount}</span> of{" "}
                    <span className="font-medium text-foreground">{totalCount}</span> results
                </div>
            )}
        </div>
    );
}

/**
 * Sortable table header helper — renders a clickable header cell.
 */
export function SortableHeader({
    label,
    sortKey,
    sort,
    onToggle,
    className,
}: {
    label: string;
    sortKey: string;
    sort: SortConfig | null;
    onToggle: (key: string) => void;
    className?: string;
}) {
    const isActive = sort?.key === sortKey;

    return (
        <button
            className={cn("inline-flex items-center gap-1 hover:text-foreground transition-colors", className)}
            onClick={() => onToggle(sortKey)}
        >
            {label}
            {isActive ? (
                sort?.direction === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                ) : (
                    <ArrowDown className="h-3 w-3" />
                )
            ) : (
                <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
        </button>
    );
}

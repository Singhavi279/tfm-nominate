"use client";

import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
    key: string;
    direction: SortDirection;
}

export interface FilterConfig {
    key: string;
    value: string;
}

export interface TableControlsOptions<T> {
    /** Array of field keys used for text search */
    searchFields: (keyof T)[];
    /** Default sort column */
    defaultSortKey?: string;
    /** Default sort direction */
    defaultSortDirection?: SortDirection;
    /** Custom sort value extractor — return a sortable value for a given item and key */
    getSortValue?: (item: T, key: string) => string | number;
}

export function useTableControls<T extends Record<string, any>>(
    data: T[],
    options: TableControlsOptions<T>
) {
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortConfig | null>(
        options.defaultSortKey
            ? { key: options.defaultSortKey, direction: options.defaultSortDirection ?? "asc" }
            : null
    );
    const [filters, setFilters] = useState<Record<string, string>>({});

    function setFilter(key: string, value: string) {
        setFilters((prev) => {
            if (!value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: value };
        });
    }

    function toggleSort(key: string) {
        setSort((prev) => {
            if (prev?.key === key) {
                return prev.direction === "asc"
                    ? { key, direction: "desc" }
                    : null; // third click clears sort
            }
            return { key, direction: "asc" };
        });
    }

    const filtered = useMemo(() => {
        let result = [...data];

        // 1. Text search
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter((item) =>
                options.searchFields.some((field) => {
                    const val = item[field];
                    if (val == null) return false;
                    return String(val).toLowerCase().includes(q);
                })
            );
        }

        // 2. Filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                result = result.filter((item) => String(item[key as keyof T]) === value);
            }
        });

        // 3. Sort
        if (sort) {
            result.sort((a, b) => {
                const av = options.getSortValue
                    ? options.getSortValue(a, sort.key)
                    : (a as any)[sort.key] ?? "";
                const bv = options.getSortValue
                    ? options.getSortValue(b, sort.key)
                    : (b as any)[sort.key] ?? "";

                if (typeof av === "number" && typeof bv === "number") {
                    return sort.direction === "asc" ? av - bv : bv - av;
                }
                const sa = String(av).toLowerCase();
                const sb = String(bv).toLowerCase();
                return sort.direction === "asc"
                    ? sa.localeCompare(sb)
                    : sb.localeCompare(sa);
            });
        }

        return result;
    }, [data, search, sort, filters, options.searchFields]);

    return {
        filtered,
        search,
        setSearch,
        sort,
        toggleSort,
        filters,
        setFilter,
        totalCount: data.length,
        filteredCount: filtered.length,
    };
}

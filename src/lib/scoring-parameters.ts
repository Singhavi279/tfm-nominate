import { CATEGORY_ORDER, SEGMENT_ORDER } from "./award-categories";

export type ScoringParameter = {
    name: string;
    maxScore: number;
};

/**
 * Scoring parameters keyed by segment name.
 * Each segment has 4 criteria scored 1–10 (max total = 40).
 */
export const SCORING_PARAMETERS: Record<string, ScoringParameter[]> = {
    Organization: [
        { name: "Impact on Maternal & Neonatal Care", maxScore: 10 },
        { name: "Innovation & Differentiation", maxScore: 10 },
        { name: "Adoption & Operational Effectiveness", maxScore: 10 },
        { name: "Sustainability & Long-term Viability", maxScore: 10 },
    ],
    Initiatives: [
        { name: "Problem Relevance & Design Strength", maxScore: 10 },
        { name: "Implementation Effectiveness", maxScore: 10 },
        { name: "Measurable Impact & Outcomes", maxScore: 10 },
        { name: "Scalability & Replicability", maxScore: 10 },
    ],
    Individual: [
        { name: "Impact on Patients & Field", maxScore: 10 },
        { name: "Professional Expertise", maxScore: 10 },
        { name: "Experience & Achievements", maxScore: 10 },
        { name: "Leadership Contribution", maxScore: 10 },
    ],
};

/**
 * Given a categoryName, return the segment it belongs to.
 * Falls back to "Organization" if not found.
 */
export function getSegmentForCategory(categoryName: string): string {
    for (const segment of SEGMENT_ORDER) {
        const categories = CATEGORY_ORDER[segment] ?? [];
        if (categories.includes(categoryName)) {
            return segment;
        }
    }
    return "Organization";
}

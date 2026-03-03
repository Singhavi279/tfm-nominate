import { CATEGORY_ORDER, SEGMENT_ORDER } from "./award-categories";

export type ScoringParameter = {
    name: string;
    maxScore: number;
};

/**
 * Scoring parameters keyed by segment name.
 * Each segment has a unique set of evaluation criteria with max scores totaling 100.
 */
export const SCORING_PARAMETERS: Record<string, ScoringParameter[]> = {
    Organization: [
        { name: "Impact on Maternal & Neonatal Care", maxScore: 30 },
        { name: "Innovation & Differentiation", maxScore: 25 },
        { name: "Adoption & Operational Effectiveness", maxScore: 25 },
        { name: "Sustainability & Long-term Viability", maxScore: 20 },
    ],
    Initiatives: [
        { name: "Problem Relevance & Design Strength", maxScore: 30 },
        { name: "Implementation Effectiveness", maxScore: 25 },
        { name: "Measurable Impact & Outcomes", maxScore: 30 },
        { name: "Scalability & Replicability", maxScore: 15 },
    ],
    Individual: [
        { name: "Impact on Patients & Field", maxScore: 40 },
        { name: "Professional Expertise", maxScore: 25 },
        { name: "Experience & Achievements", maxScore: 20 },
        { name: "Leadership Contribution", maxScore: 15 },
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

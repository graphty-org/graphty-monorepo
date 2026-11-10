import type { JoinRegion } from "@graphty/graphty-element/session";

/** Each region's color. */
export const REGION_COLORS: Readonly<Record<JoinRegion, string>> = {
    "only-onto": "#e8590c",
    both: "#7048e8",
    "only-from": "#1c7ed6",
};

/** The regions in drawing order, left to right. */
export const REGIONS: readonly JoinRegion[] = ["only-onto", "both", "only-from"];

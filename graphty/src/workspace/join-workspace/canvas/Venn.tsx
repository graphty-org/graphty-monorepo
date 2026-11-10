import type { JoinRegion } from "@graphty/graphty-element/session";
import React from "react";

import { REGION_COLORS, REGIONS } from "./regions";

/** The three regions' outlines: two circles of radius 8, centers 10 apart (left 12, right 22). */
const REGION_PATHS: Readonly<Record<JoinRegion, string>> = {
    "only-onto": "M17 3.755A8 8 0 1 0 17 16.245A8 8 0 0 1 17 3.755Z",
    both: "M17 3.755A8 8 0 0 1 17 16.245A8 8 0 0 1 17 3.755Z",
    "only-from": "M17 3.755A8 8 0 1 1 17 16.245A8 8 0 0 0 17 3.755Z",
};

/**
 * A compare's Venn: the graph on the left, the table on the right, each region a button that picks
 * its nodes out (pressed again, it lets them go).
 * @param props - Component props
 * @param props.labels - each region's accessible name.
 * @param props.picked - the region picked out, if any.
 * @param props.onPick - picks a region, or null to let it go.
 * @returns the Venn.
 */
export function Venn({
    labels,
    picked,
    onPick,
}: Readonly<{
    labels: Readonly<Record<JoinRegion, string>>;
    picked: JoinRegion | null;
    onPick: (region: JoinRegion | null) => void;
}>): React.JSX.Element {
    return (
        <svg className="jwc-venn" viewBox="0 0 34 20" width={34} height={20} role="group" aria-label="Regions">
            {REGIONS.map((region) => (
                <path
                    key={region}
                    d={REGION_PATHS[region]}
                    role="button"
                    tabIndex={0}
                    aria-label={labels[region]}
                    aria-pressed={picked === region}
                    fill={REGION_COLORS[region]}
                    fillOpacity={picked === null || picked === region ? 0.85 : 0.2}
                    stroke="#fff"
                    strokeWidth={0.6}
                    onPointerDown={(event) => {
                        event.stopPropagation();
                    }}
                    onClick={(event) => {
                        event.stopPropagation();
                        onPick(picked === region ? null : region);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onPick(picked === region ? null : region);
                        }
                    }}
                />
            ))}
        </svg>
    );
}

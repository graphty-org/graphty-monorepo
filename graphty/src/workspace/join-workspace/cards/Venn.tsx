import {
    JOIN_REGIONS as REGIONS,
    type JoinRegion,
    type JoinReport,
    type JoinStepEntry,
} from "@graphty/graphty-element/session";
import { Badge, Group, Text } from "@mantine/core";
import React from "react";

import { useJoinWorkspace } from "../context";
import { inputName } from "./outcomes";

/** Each region's color when kept. */
const REGION_COLORS: Readonly<Record<JoinRegion, string>> = {
    "only-onto": "#0d99ff",
    both: "#9747ff",
    "only-from": "#f24822",
};

/** The two circles' crossing points, top and bottom. */
const TOP = "84 14.08";
const BOTTOM = "84 65.92";

/** Each region's outline: the left lens, the middle, the right lens. */
const REGION_PATHS: Readonly<Record<JoinRegion, string>> = {
    "only-onto": `M${TOP} A34 34 0 1 0 ${BOTTOM} A34 34 0 0 1 ${TOP}Z`,
    both: `M${TOP} A34 34 0 0 1 ${BOTTOM} A34 34 0 0 1 ${TOP}Z`,
    "only-from": `M${TOP} A34 34 0 1 1 ${BOTTOM} A34 34 0 0 0 ${TOP}Z`,
};

/** Where each region's count is drawn. */
const REGION_X: Readonly<Record<JoinRegion, number>> = { "only-onto": 44, both: 84, "only-from": 124 };

/**
 * The name of the set the kept regions make.
 * @param keep - the kept regions.
 * @returns the name.
 */
function setName(keep: readonly JoinRegion[]): string {
    const has = (region: JoinRegion): boolean => keep.includes(region);
    const key = REGIONS.map((region) => (has(region) ? "1" : "0")).join("");
    const names: Readonly<Record<string, string>> = {
        "111": "union",
        "010": "intersection",
        "100": "graph only",
        "001": "table only",
        "110": "all graph",
        "011": "all table",
        "101": "not both",
        "000": "none",
    };
    return names[key] ?? "custom";
}

/**
 * A compare step's Venn: the graph (A) and the table read as a second graph (B), each region's
 * node count from the step's report (`regions.nodes`). A press on a region keeps or hides it:
 * Done keeps only the kept regions, with a filter on the membership column.
 * @param props - Component props
 * @param props.step - the step.
 * @param props.report - its report, or undefined when it cannot run.
 * @param props.from - the table's name.
 * @returns the Venn.
 */
export function Venn({
    step,
    report,
    from,
}: Readonly<{ step: JoinStepEntry; report: JoinReport | undefined; from: string }>): React.JSX.Element {
    const api = useJoinWorkspace();
    // A: the loads the graph holds, by name; B: the card's table.
    const loads = api.draft.inputs.filter((each) => !each.held && each.key !== step.from);
    const onto = loads.length === 1 ? inputName(api.draft.inputs, loads[0].key) : "graph";
    const keep = api.keeps.get(step.id) ?? REGIONS;
    const counts = report?.regions?.nodes;
    const toggle = (region: JoinRegion): void => {
        const next = keep.includes(region) ? keep.filter((each) => each !== region) : [...keep, region];
        const ordered = REGIONS.filter((each) => next.includes(each));
        api.setKeep(step.id, ordered.length === REGIONS.length ? null : ordered);
    };
    const words: Readonly<Record<JoinRegion, string>> = {
        "only-onto": `only ${onto}`,
        both: "both",
        "only-from": `only ${from}`,
    };
    return (
        <div className="jr-venn">
            <svg viewBox="0 0 168 80" role="group" aria-label="Regions">
                {REGIONS.map((region) => (
                    <path
                        key={region}
                        className="jr-venn-region"
                        role="button"
                        tabIndex={0}
                        aria-label={`${words[region]}, ${String(counts?.[region] ?? 0)} nodes`}
                        aria-pressed={keep.includes(region)}
                        d={REGION_PATHS[region]}
                        fill={keep.includes(region) ? REGION_COLORS[region] : "var(--cm-border, #e6e6e6)"}
                        fillOpacity={0.6}
                        onClick={() => {
                            toggle(region);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggle(region);
                            }
                        }}
                    />
                ))}
                <circle cx="62" cy="40" r="34" fill="none" stroke="#0000004d" pointerEvents="none" />
                <circle cx="106" cy="40" r="34" fill="none" stroke="#0000004d" pointerEvents="none" />
                {REGIONS.map((region) => (
                    <text
                        key={region}
                        x={REGION_X[region]}
                        y="44"
                        textAnchor="middle"
                        className="jr-venn-count"
                        pointerEvents="none"
                    >
                        {counts?.[region] ?? 0}
                    </text>
                ))}
            </svg>
            <div className="jr-venn-side" role="group" aria-label="Region counts">
                {REGIONS.map((region) => (
                    <Group key={region} gap={4} wrap="nowrap" data-region={region}>
                        <span className="jr-dot" style={{ background: REGION_COLORS[region] }} />
                        <Text size="sm" truncate>
                            <b>{counts?.[region] ?? 0}</b> {words[region]}
                        </Text>
                    </Group>
                ))}
                <Badge size="sm" variant="light" color="violet" className="jr-venn-set">
                    {setName(keep)}
                </Badge>
            </div>
        </div>
    );
}

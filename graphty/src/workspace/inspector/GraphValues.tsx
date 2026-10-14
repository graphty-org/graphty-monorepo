import { ControlSection, DataRow, HistogramRow, InfoCircle, SegmentedControl } from "@graphty/compact-mantine";
import type { GraphStatistics, Histogram, ScopeInput } from "@graphty/graphty-element/session";
import { Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { weightName } from "../analyze/words";
import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import { useWorkspace } from "../state/WorkspaceContext";
import { DistributionRows } from "./Distribution";
import { settingsNotInEffect } from "./settingsInEffect";
import { count, directionNote, directionWords, formatNumber, measurementGloss, measurementWord } from "./words";

/** Which degree the Degree section shows on a directed graph. */
type DegreeKind = "all" | "in" | "out";

const DEGREE_NOTE =
    "A node's degree is how many edges touch it. On a directed graph, in-degree counts the edges that arrive and out-degree the edges that leave.";

/**
 * The graph's Degree section: the element's degree histogram (its bins chosen within a budget, so a
 * large graph never draws thousands of bars), then Lowest, Median, Mean and Highest, one per row.
 * A directed graph offers All, In and Out. Transitivity follows when the element measured it.
 * @param props - Component props
 * @param props.statistics - the element's statistics
 * @returns The section
 */
function DegreeSection({ statistics }: Readonly<{ statistics: GraphStatistics }>): React.JSX.Element {
    const [kind, setKind] = useState<DegreeKind>("all");
    const directed = statistics.inDegreeHistogram !== undefined && statistics.outDegreeHistogram !== undefined;
    const histograms: Record<DegreeKind, Histogram | undefined> = {
        all: statistics.degreeHistogram,
        in: statistics.inDegreeHistogram,
        out: statistics.outDegreeHistogram,
    };
    const shown = directed ? kind : "all";
    const histogram = histograms[shown];
    const [low, high] = statistics.degreeRange;
    const figures =
        shown === "all"
            ? { min: low, median: histogram?.median, mean: statistics.meanDegree, max: high }
            : { min: histogram?.min, median: histogram?.median, max: histogram?.max };
    const name = { all: "Degree", in: "In-degree", out: "Out-degree" }[shown];
    return (
        <ControlSection label="Degree" collapsible={false} headingLevel={3} info={DEGREE_NOTE}>
            {directed && (
                <SegmentedControl
                    fullWidth
                    aria-label="Which degree"
                    value={kind}
                    data={[
                        { value: "all", label: "All" },
                        { value: "in", label: "In" },
                        { value: "out", label: "Out" },
                    ]}
                    onChange={(picked) => {
                        setKind(picked as DegreeKind);
                    }}
                />
            )}
            {histogram !== undefined && histogram.bins.length > 0 && (
                <HistogramRow
                    label={name}
                    bins={histogram.bins.map((bin) => ({
                        label: `${formatNumber(bin.from)} to ${formatNumber(bin.to)}: ${String(bin.count)}`,
                        count: bin.count,
                    }))}
                    minLabel={formatNumber(histogram.bins[0].from)}
                    maxLabel={formatNumber(histogram.bins[histogram.bins.length - 1].to)}
                />
            )}
            <DistributionRows figures={figures} />
            {statistics.transitivity !== undefined && (
                <DataRow stat name="Transitivity" value={formatNumber(statistics.transitivity)} />
            )}
        </ControlSection>
    );
}

/**
 * "19 of 20", exact counts.
 * @param part - how many are showing.
 * @param whole - how many the graph holds.
 * @returns the words.
 */
function ofWords(part: number, whole: number): string {
    return `${part.toLocaleString()} of ${whole.toLocaleString()}`;
}

/**
 * The graph's Values tab, the Overview (tier1-design.md section 2.7, task T6): every count the
 * element publishes about the graph's shape, each that can be selected a link that selects it.
 * While a filter step is on, the Overview holds only the element's visible counts, and the rest go
 * in a section of their own, "Full graph" (the key's word for the same scope), so a reader does
 * not take them for what is showing.
 * @returns The Overview
 */
export function Overview(): React.JSX.Element | null {
    const { session } = useWorkspace();
    useVisibilityVersion(session);
    if (session === null) {
        return null;
    }
    const statistics = session.data.statistics();
    if (statistics.nodeCount === 0) {
        return (
            <Text size="xs" c="dimmed" p="md">
                No nodes to draw
            </Text>
        );
    }
    const select = (scope: ScopeInput) => () => {
        void session.selection.apply({ scope });
    };
    const weight = session.data.loadedWeight();
    const filtered = session.visibility.steps.some((step) => step.on);
    const showing = session.visibility.summary;

    const whole = (
        <>
            <DataRow stat name="Nodes" value={statistics.nodeCount} />
            <DataRow stat name="Edges" value={statistics.edgeCount} />
            <DataRow
                stat
                name="Direction"
                value={directionWords(statistics)}
                trailing={<InfoCircle label="Direction">{directionNote(statistics)}</InfoCircle>}
            />
            {weight !== null && (
                <DataRow stat name="Loaded weight" value={weightName(weight.attribute, weight.meaning)} />
            )}
            <DataRow stat name="Density" value={formatNumber(statistics.density)} />
            <DataRow stat name="Components" value={statistics.components.count} />
            {statistics.components.count > 1 && (
                <DataRow
                    name="Largest component"
                    value={count(statistics.components.largestSize, "node")}
                    onClick={select("largest-component")}
                />
            )}
            {/* Text, not links, until graphty-element can select the isolated nodes it counts
                (#931) and the self-loops and repeated edges (#899). */}
            {statistics.components.isolatedCount > 0 && (
                <DataRow name={`${count(statistics.components.isolatedCount, "node")} joined to no other node`} />
            )}
            {statistics.selfLoopCount > 0 && (
                <DataRow name={`${count(statistics.selfLoopCount, "edge")} from a node to itself`} />
            )}
            {statistics.repeatedEdgeCount > 0 && (
                <DataRow name={count(statistics.repeatedEdgeCount, "repeated edge")} />
            )}
        </>
    );

    const otherView = settingsNotInEffect(session).length;
    const tail = (
        <>
            <DegreeSection statistics={statistics} />
            {otherView > 0 && (
                <Text size="xs" c="dimmed" px="md" data-testid="settings-other-view">
                    {`${count(otherView, "graph setting")} ${otherView === 1 ? "applies" : "apply"} only in another view`}
                </Text>
            )}
        </>
    );
    if (!filtered) {
        return (
            <>
                <ControlSection label="Overview" collapsible={false} headingLevel={3}>
                    {whole}
                </ControlSection>
                {tail}
            </>
        );
    }
    return (
        <>
            <ControlSection label="Overview" collapsible={false} headingLevel={3}>
                <DataRow stat name="Nodes showing" value={ofWords(showing.visibleNodes, showing.totalNodes)} />
                <DataRow stat name="Edges showing" value={ofWords(showing.visibleEdges, showing.totalEdges)} />
            </ControlSection>
            <ControlSection label="Full graph" collapsible={false} headingLevel={3}>
                {whole}
            </ControlSection>
            {tail}
        </>
    );
}

/**
 * The Everything row's Values tab (tier1-design.md section 2.7): what the row covers, which is
 * every node and every edge.
 * @returns The Summary
 */
export function EverythingValues(): React.JSX.Element | null {
    const { session } = useWorkspace();
    if (session === null) {
        return null;
    }
    const { nodes, edges } = session.status.counts;
    return (
        <ControlSection label="Summary" collapsible={false} headingLevel={3}>
            <Text size="xs" px="md">
                {`Covers every node and edge: ${count(nodes, "node")}, ${count(edges, "edge")}.`}
            </Text>
        </ControlSection>
    );
}

const ORIGIN_WORDS = { imported: "From the file", joined: "Joined", computed: "Computed", result: "Result" } as const;

/**
 * An attribute's inspector (tier1-design.md section 2.7, picked in Data > Attributes): Summary
 * (its table, its kind and origin as plain rows, how complete it is). Its values histogram waits for
 * graphty-element to publish a column's distribution (#897).
 * @param props - Component props
 * @param props.path - The attribute's path, such as `data.age`
 * @returns The Summary, or nothing when the graph has no such attribute
 */
export function AttributeValues({ path }: Readonly<{ path: string }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const column = session?.data.attributes().find((candidate) => candidate.path === path);
    if (column === undefined) {
        return null;
    }
    const measurement = column.measurement === undefined ? undefined : measurementWord(column.measurement);
    return (
        <ControlSection label="Summary" collapsible={false} headingLevel={3}>
            <DataRow stat name="Table" value={column.kind === "node" ? "Nodes" : "Edges"} />
            {/* Facts, not controls: plain rows on the rows' own grid. The kind's word is short, so
                what it means rides in a tooltip on the word, reachable by Tab too. */}
            {measurement !== undefined && (
                <DataRow
                    stat
                    name="Kind"
                    value={
                        <Tooltip label={measurementGloss(column.measurement)} multiline w={220}>
                            <span
                                tabIndex={0} // NOSONAR(S6845): focusable so a keyboard reader can open the tooltip that explains the measurement
                            >
                                {measurement}
                            </span>
                        </Tooltip>
                    }
                />
            )}
            <DataRow stat name="Origin" value={ORIGIN_WORDS[column.origin]} />
            <DataRow stat name="Has a value" value={`${formatNumber(column.completeness * 100)}%`} />
            {column.uniqueCount !== undefined && <DataRow stat name="Distinct values" value={column.uniqueCount} />}
            <DistributionRows figures={{ min: column.min, max: column.max }} />
        </ControlSection>
    );
}

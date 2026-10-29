import {
    ActionRow,
    ControlSection,
    DataRow,
    DataRowHeader,
    HistogramRow,
    InfoCircle,
    SegmentedControl,
} from "@graphty/compact-mantine";
import type { GraphStatistics, Histogram, ScopeInput, ValueCounts } from "@graphty/graphty-element/session";
import { Button, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { weightName } from "../analyze/words";
import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import { TEXT_WORD, YES_NO_WORD } from "../data-place/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { designate } from "../time/timeActions";
import { DistributionRows } from "./Distribution";
import { settingsNotInEffect } from "./settingsInEffect";
import {
    count,
    directionNote,
    directionWords,
    formatNumber,
    measurementGloss,
    measurementWord,
    rangeWords,
    valueWord,
} from "./words";

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
    const last = histogram?.bins.at(-1);
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
            {histogram !== undefined && last !== undefined && (
                <HistogramRow
                    label={name}
                    bins={histogram.bins.map((bin) => ({
                        label: `${rangeWords(bin.from, bin.to)}: ${count(bin.count, "node")}`,
                        count: bin.count,
                    }))}
                    minLabel={formatNumber(histogram.bins[0].from)}
                    maxLabel={formatNumber(last.to)}
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
    const { session, store } = useWorkspace();
    useVisibilityVersion(session);
    if (session === null) {
        return null;
    }
    const statistics = session.data.statistics();
    // With no time field yet, the column the element reads as time is offered once: a door to its
    // home, Data > Fields, with the Time entry added and that column chosen.
    const found = session.time.field === null ? session.time.candidates().at(0) : undefined;
    const timeFound =
        found === undefined ? null : (
            <ActionRow
                state={`Time: ${found.column}`}
                reveal="always"
                actions={
                    <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            const source =
                                found.unit === undefined
                                    ? { start: found.column }
                                    : { start: found.column, unit: found.unit };
                            const side = found.kind === "edge" ? "edges" : "nodes";
                            designate(session, store, { [side]: source });
                            store.set({ page: "panels", place: "data", fieldsEntry: `${side}:time` });
                        }}
                    >
                        Set in Data
                    </Button>
                }
            />
        );
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
    // A time window limits what is showing exactly as a filter card does.
    const filtered =
        session.visibility.conditions.some((c) => c.on && c.effect !== "select") || session.visibility.window !== null;
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
                    stat
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
            {/* Over what is showing: its degrees are the legend's. */}
            <DegreeSection statistics={filtered ? session.data.statistics({ scope: "visible" }) : statistics} />
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
                    {timeFound}
                    {whole}
                </ControlSection>
                {tail}
            </>
        );
    }
    return (
        <>
            <ControlSection label="Overview" collapsible={false} headingLevel={3}>
                {timeFound}
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
    // A yes-or-no column is named as one; graphty-element measures it as categories too.
    const yesNo = column.type === "boolean";
    // A column of free text (the element reads it as text: too many values to be groups) is text.
    const text =
        !yesNo &&
        column.measurement === "categorical" &&
        session?.data.readableValues().find((value) => value.on === column.kind && value.path === path)?.kind ===
            "text";
    let measurement = column.measurement === undefined ? undefined : measurementWord(column.measurement);
    let gloss = measurementGloss(column.measurement);
    if (yesNo) {
        measurement = YES_NO_WORD;
        gloss = "Each value is yes or no.";
    } else if (text) {
        measurement = TEXT_WORD;
        gloss = "Each value is its own text, such as a name: too many different values to be groups.";
    }
    return (
        <ControlSection label="Summary" collapsible={false} headingLevel={3}>
            <DataRow stat name="Table" value={column.kind === "node" ? "Nodes" : "Edges"} />
            {/* Facts, not controls: plain rows on the rows' own grid. The kind's word is short, so
                what it means rides in a tooltip on the word, reachable by Tab too. */}
            {measurement !== undefined && (
                <DataRow
                    stat
                    name="Value type"
                    value={
                        <Tooltip label={gloss} multiline w={220}>
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
            {/* Groups and yes-or-no name their values, each with how many hold it; numbers have
                their figures above, and free text is a value per element. */}
            {session !== null && column.min === undefined && !text && (
                <ValueCountRows
                    counts={session.data.valueCounts(path, { kind: column.kind })}
                    type={column.type}
                    noun={column.kind}
                />
            )}
        </ControlSection>
    );
}

/** How many of a column's values the inspector lists before "N more values". */
const VALUES_LISTED = 20;

/**
 * A column's values, commonest first, each with how many elements hold it, under a caption.
 * @param props - Component props
 * @param props.counts - the element's `data.valueCounts` for the column.
 * @param props.type - the column's type, so a yes-or-no reads Yes or No.
 * @param props.noun - what holds the values: node or edge.
 * @returns The rows, or nothing for a column with no value
 */
function ValueCountRows({
    counts,
    type,
    noun,
}: Readonly<{ counts: ValueCounts; type: string | undefined; noun: string }>): React.JSX.Element | null {
    if (counts.values.length === 0) {
        return null;
    }
    const listed = counts.values.slice(0, VALUES_LISTED);
    return (
        <>
            <DataRowHeader label="Values" unit={`${noun}s`} />
            {listed.map((entry) => (
                <DataRow key={String(entry.value)} stat name={valueWord(entry.value, type)} value={entry.count} />
            ))}
            {counts.values.length > listed.length && (
                <Text size="sm" c="dimmed" px="md">
                    {count(counts.values.length - listed.length, "more value")}
                </Text>
            )}
        </>
    );
}

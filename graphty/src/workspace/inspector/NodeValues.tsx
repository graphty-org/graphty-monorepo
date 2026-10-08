import {
    ControlSection,
    DataRow,
    DataRowHeader,
    PANEL_GRID,
    SegmentedControl,
    UiGlyph,
} from "@graphty/compact-mantine";
import type {
    FilterStep,
    GraphSession,
    NodeId,
    SelectionAttributeStatistics,
    SelectionDirection,
} from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { newId, writeSteps } from "../data-place/filterSteps";
import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { useAsyncValue } from "./hooks";
import { groupKey, neighborhoodKey, nodeKey } from "./inspected";
import { finishedRuns, selectNode, takeNodeValuesFocus } from "./reads";
import { count, formatNumber, groupName, valueText } from "./words";

/** How many of a node's attributes show before "N more attributes". */
const ATTRIBUTES_SHOWN = 6;

/**
 * Set when Esc leaves a neighbor list, so the node's view that replaces it puts keyboard focus
 * back on Degree instead of dropping it to the page.
 */
let returnToDegree = false;

/**
 * One element's attributes from the file, the first few shown and the rest behind one link.
 * @param props - Component props
 * @param props.rows - The attributes as name and value
 * @returns The rows
 */
function AttributeRows({ rows }: Readonly<{ rows: readonly (readonly [string, unknown])[] }>): React.JSX.Element {
    const [all, setAll] = useState(false);
    const shown = all ? rows : rows.slice(0, ATTRIBUTES_SHOWN);
    return (
        <>
            {shown.map(([name, value]) => (
                <DataRow key={name} stat name={name} value={valueText(value)} />
            ))}
            {!all && rows.length > ATTRIBUTES_SHOWN && (
                <Button
                    variant="subtle"
                    size="compact-xs"
                    ml="md"
                    onClick={() => {
                        setAll(true);
                    }}
                >
                    {count(rows.length - ATTRIBUTES_SHOWN, "more attribute")}
                </Button>
            )}
        </>
    );
}

/**
 * The file's attributes an element carries, in the order graphty-element lists its columns.
 * @param session - the session.
 * @param kind - nodes or edges.
 * @param record - the element's record.
 * @returns name and value pairs, empty values left out.
 */
function fileAttributes(
    session: GraphSession,
    kind: "node" | "edge",
    record: Readonly<Record<string, unknown>> | undefined,
): [string, unknown][] {
    if (record === undefined) {
        return [];
    }
    return session.data
        .attributes()
        .filter(
            (column) =>
                column.kind === kind &&
                // The id, source and target columns are listed too, until graphty-element marks a
                // column's role (#893) and the inspector can leave out what the header shows.
                (column.origin === "imported" || column.origin === "joined"),
        )
        .flatMap((column): [string, unknown][] => {
            const value = record[column.name];
            return value === undefined || value === null || value === "" ? [] : [[column.plainName, value]];
        });
}

/**
 * One node's Values tab (tier1-design.md section 2.7 and task T12): Summary (the file's
 * attributes; Degree is a link that opens the neighbors), then Results (each with its rank),
 * then Memberships.
 * @param props - Component props
 * @param props.id - The node
 * @returns The tab
 */
export function NodeValues({ id }: Readonly<{ id: NodeId }>): React.JSX.Element | null {
    const { session, store, run: runCommand } = useWorkspace();
    const degree = useRef<HTMLDivElement>(null);
    const summary = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (returnToDegree) {
            returnToDegree = false;
            degree.current?.querySelector("button")?.focus();
        }
    }, []);
    // After every render, so a pick of the node already shown takes focus too.
    useEffect(() => {
        if (summary.current !== null && takeNodeValuesFocus()) {
            summary.current.focus();
        }
    });
    if (session === null) {
        return null;
    }
    const runs = finishedRuns(session);
    const ranked = runs.flatMap((run) => {
        const values = run.result.node(id);
        const value = values?.[run.field];
        const rank = values?.rank;
        return typeof value === "number" && typeof rank === "number" ? [{ run, value, rank }] : [];
    });
    const memberships = runs.flatMap((run) => {
        const group = run.result.node(id)?.[run.field];
        const { groups } = run.result.summary();
        if (groups === undefined || (typeof group !== "string" && typeof group !== "number")) {
            return [];
        }
        return [{ run, group, name: groupName(groups.find((g) => g.group === group) ?? { group, size: 0 }) }];
    });
    // The "connections" count is the neighbor list's total, so the two always agree (#784).
    const connections = session.data.neighbors(id, { limit: 0 }).total;

    return (
        <>
            <ControlSection label="Summary" defaultOpened>
                <div ref={summary} tabIndex={-1} role="group" aria-label="Summary values">
                    <AttributeRows rows={fileAttributes(session, "node", session.data.node(id))} />
                    <div ref={degree} style={{ display: "contents" }}>
                        <DataRow
                            name="Degree"
                            value={connections}
                            trailing={<UiGlyph name="chevronRight" size={PANEL_GRID.GLYPH} />}
                            onClick={() => {
                                runCommand("selection.neighborhood");
                            }}
                        />
                    </div>
                </div>
            </ControlSection>
            {/* A heading of its own, as Memberships has: a caption among the rows read as one more row. */}
            {ranked.length > 0 && (
                <ControlSection label="Results" defaultOpened>
                    {ranked.map(({ run, value, rank }) => (
                        <DataRow
                            key={run.id}
                            stat
                            name={run.label}
                            value={`${formatNumber(value)}, #${String(rank)} of ${formatNumber(run.result.measured.nodes)}`}
                        />
                    ))}
                </ControlSection>
            )}
            {memberships.length > 0 && (
                <ControlSection label="Memberships" defaultOpened>
                    {memberships.map(({ run, group, name }) => (
                        <DataRow
                            key={run.id}
                            name={run.label}
                            value={name}
                            onClick={() => {
                                store.set({ inspected: { kind: "group-row", id: groupKey(run.id, group) } });
                            }}
                        />
                    ))}
                </ControlSection>
            )}
        </>
    );
}

/** The Follow control's choices, shown only on a directed graph. */
const FOLLOW: readonly { value: SelectionDirection; label: string }[] = [
    { value: "out", label: "Out" },
    { value: "in", label: "In" },
    { value: "all", label: "All" },
];

/**
 * A neighborhood in words, one form at every reach: "6 nodes within 1 hop of Ava", "14 nodes
 * within 2 hops of Ava". The list's heading and the status line both say it.
 * @param around - how many nodes, the center left out.
 * @param hops - how many hops out.
 * @param center - the node at the center.
 * @returns the words.
 */
function neighborhoodWords(around: number, hops: number, center: NodeId): string {
    return `${count(around, "node")} within ${count(hops, "hop")} of ${String(center)}`;
}

/**
 * Selects a center's neighborhood, opens it in the inspector and puts its size on the status
 * line once: "14 nodes within 2 hops of Ava".
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param center - the node at the center.
 * @param hops - how many hops out.
 * @param direction - which way edges are followed.
 */
async function showNeighborhood(
    session: GraphSession,
    store: WorkspaceStore,
    center: NodeId,
    hops: 1 | 2 | 3,
    direction: SelectionDirection,
): Promise<void> {
    await session.selection.apply({ neighborsOf: [center], depth: hops, direction });
    const around = session.selection.nodes.filter((node) => node !== center).length;
    // The selection change closes the open row, so it is opened again on the new reach.
    store.set({
        inspected: { kind: "neighborhood", id: neighborhoodKey(center, hops, direction) },
        announcement: neighborhoodWords(around, hops, center),
    });
}

/**
 * A node's neighbors (tier1-design.md task T12; tier2-design.md section 6): "17 nodes within 1
 * hop of 1", each by name with its tie value, strongest first, read whole from
 * graphty-element's `data.neighbors()`. Each name selects that node; Back to the center, or Esc,
 * returns to the node at the center.
 *
 * Its header picks how far out (Hops 1 | 2 | 3) and, on a directed graph, which way edges are
 * followed (Follow: Out | In | All); a change reselects and relists. Past one hop it lists the
 * selected nodes other than the center, under the same heading form. Filter to neighbors adds
 * one filter step keeping the same neighborhood.
 *
 * The heading names the center by its id until graphty-element publishes a node's name (#895).
 * @param props - Component props
 * @param props.center - The node at the center
 * @param props.hops - How many hops out the neighborhood reaches
 * @param props.direction - Which way edges are followed
 * @returns The list
 */
export function NeighborList({
    center,
    hops = 1,
    direction = "all",
}: Readonly<{ center: NodeId; hops?: number; direction?: SelectionDirection }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    // The Filter to neighbors toggle reads the steps, so it follows each change to them.
    useVisibilityVersion(session);
    const heading = useRef<HTMLElement>(null);
    // The list takes focus as it opens, and Esc anywhere in it returns to the center node: a
    // shortcut on the region, so it is listened for on the region's own element. A Hops or
    // Follow change keeps focus on the control that made it.
    useEffect(() => {
        const region = heading.current;
        if (region === null || session === null) {
            return undefined;
        }
        if (!region.contains(document.activeElement)) {
            region.focus();
        }
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                event.preventDefault();
                returnToDegree = true;
                selectNode(session, center);
            }
        };
        region.addEventListener("keydown", onKeyDown);
        return () => {
            region.removeEventListener("keydown", onKeyDown);
        };
    }, [center, session]);
    if (session === null) {
        return null;
    }
    const reach = hops === 2 || hops === 3 ? hops : 1;
    const { directed } = session.status;
    const follow = directed ? direction : "all";

    let words: string;
    let rows: React.JSX.Element[];
    let tie: string | undefined;
    if (reach > 1) {
        const around = session.selection.nodes.filter((node) => node !== center);
        words = neighborhoodWords(around.length, reach, center);
        rows = around.map((node) => (
            <DataRow
                key={nodeKey(node)}
                name={String(node)}
                onClick={() => {
                    selectNode(session, node);
                }}
            />
        ));
    } else {
        let page;
        try {
            page = session.data.neighbors(center, { limit: Infinity, direction: follow });
        } catch {
            // E_UNKNOWN_ELEMENT: the node left the graph.
            return null;
        }
        tie = page.measuredBy?.attribute;
        words = neighborhoodWords(page.total, 1, center);
        rows = page.records.map((neighbor) => (
            <DataRow
                key={nodeKey(neighbor.node.id)}
                name={neighbor.name}
                value={tie === undefined ? undefined : neighbor.weight}
                onClick={() => {
                    selectNode(session, neighbor.node.id);
                }}
            />
        ));
    }
    // The step this neighborhood's Filter to neighbors added, if it is still there.
    const filtered = session.visibility.steps.find(
        (s) =>
            s.rule.kind === "neighborhood" &&
            s.rule.depth === reach &&
            s.rule.seeds.length === 1 &&
            s.rule.seeds[0] === center,
    );
    const hopsLabel = `neighbor-hops-${nodeKey(center)}`;
    const followLabel = `neighbor-follow-${nodeKey(center)}`;

    return (
        <section ref={heading} tabIndex={-1} aria-label={words}>
            {/* The way back to the node's own Values, for a pointer; Esc is the keyboard's. */}
            <Button
                variant="subtle"
                size="compact-xs"
                mx="md"
                mt={4}
                leftSection={<UiGlyph name="chevronLeft" size={PANEL_GRID.CHEVRON} />}
                onClick={() => {
                    returnToDegree = true;
                    selectNode(session, center);
                }}
            >
                {`Back to ${String(center)}`}
            </Button>
            {/* The heading is a section title, as Summary is on the node, never smaller than its rows. */}
            <ControlSection label={words} collapsible={false}>
                <Stack gap={4} px="md" py={6}>
                    <Group gap={8} wrap="nowrap">
                        <Text size="sm" id={hopsLabel} w={44}>
                            Hops
                        </Text>
                        <SegmentedControl
                            aria-labelledby={hopsLabel}
                            fullWidth
                            style={{ flex: 1 }}
                            value={String(reach)}
                            data={["1", "2", "3"]}
                            onChange={(picked) => {
                                void showNeighborhood(session, store, center, Number(picked) as 1 | 2 | 3, follow);
                            }}
                        />
                    </Group>
                    {directed && (
                        <Group gap={8} wrap="nowrap">
                            <Text size="sm" id={followLabel} w={44}>
                                Follow
                            </Text>
                            <SegmentedControl
                                aria-labelledby={followLabel}
                                fullWidth
                                style={{ flex: 1 }}
                                value={follow}
                                data={[...FOLLOW]}
                                onChange={(picked) => {
                                    const next = FOLLOW.find((choice) => choice.value === picked)?.value ?? "all";
                                    void showNeighborhood(session, store, center, reach, next);
                                }}
                            />
                        </Group>
                    )}
                    {follow === "all" && (
                        <Button
                            variant={filtered?.on === true ? "light" : "subtle"}
                            size="compact-xs"
                            aria-pressed={filtered?.on === true}
                            style={{ alignSelf: "flex-start" }}
                            onClick={() => {
                                const { steps } = session.visibility;
                                // Pressed again, the step it added goes; an off one is turned back on.
                                let next: FilterStep[];
                                if (filtered === undefined) {
                                    next = [
                                        ...steps,
                                        {
                                            id: newId(steps),
                                            on: true,
                                            rule: { kind: "neighborhood", seeds: [center], depth: reach },
                                        },
                                    ];
                                } else if (filtered.on) {
                                    next = steps.filter((s) => s.id !== filtered.id);
                                } else {
                                    next = steps.map((s) => (s.id === filtered.id ? { ...s, on: true } : s));
                                }
                                void writeSteps(session, store, next);
                            }}
                        >
                            Filter to neighbors
                        </Button>
                    )}
                </Stack>
                {tie !== undefined && <DataRowHeader label="Neighbor" unit={tie} />}
                {rows}
            </ControlSection>
        </section>
    );
}

/**
 * One edge's Values tab: its two ends, each a link that selects that node, and the file's
 * attributes, then Results: what each run measured on it. An edge is reached from the Edges table
 * (tier1-design.md task T12) or by a click on it on the canvas.
 * @param props - Component props
 * @param props.id - The edge
 * @returns The tab
 */
export function EdgeValues({ id }: Readonly<{ id: string }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const edge = session?.data.edge(id);
    if (session === null || edge === undefined) {
        return null;
    }
    // What each finished run measured on this edge (edge betweenness and the like).
    const results = finishedRuns(session).flatMap((run) => {
        const value = run.result.edge(id)?.[run.field];
        return typeof value === "number" ? [{ run, value }] : [];
    });
    return (
        <>
            <ControlSection label="Summary" defaultOpened>
                <DataRow
                    name="From"
                    value={String(edge.source)}
                    onClick={() => {
                        selectNode(session, edge.source);
                    }}
                />
                <DataRow
                    name="To"
                    value={String(edge.target)}
                    onClick={() => {
                        selectNode(session, edge.target);
                    }}
                />
                <AttributeRows rows={fileAttributes(session, "edge", edge)} />
            </ControlSection>
            {results.length > 0 && (
                <ControlSection label="Results" defaultOpened>
                    {results.map(({ run, value }) => (
                        <DataRow key={run.id} stat name={run.label} value={formatNumber(value)} />
                    ))}
                </ControlSection>
            )}
        </>
    );
}

/**
 * One attribute of a selection in a few words: its mean, or its commonest value and how many.
 * A commonest value held by one element says nothing about the selection, so it is left out.
 * @param attribute - the selection's statistics for the attribute.
 * @returns the words, or undefined when there is nothing to say.
 */
function attributeSummary(attribute: SelectionAttributeStatistics): string | undefined {
    if (attribute.mean !== undefined) {
        return `mean ${formatNumber(attribute.mean)}`;
    }
    const top = attribute.distribution?.[0];
    return top === undefined || top.count <= 1 ? undefined : `${top.value} (${formatNumber(top.count)})`;
}

/**
 * Several elements' Values (tier1-design.md section 2.7): what the selection adds up to, from
 * graphty-element's `selection.statistics()`.
 * @param props - Component props
 * @param props.version - Changes whenever the element reports a change
 * @returns The Summary
 */
export function SeveralValues({ version }: Readonly<{ version: number }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const statistics = useAsyncValue(() => session?.selection.statistics() ?? null, version);
    if (statistics === undefined) {
        return null;
    }
    return (
        <ControlSection label="Summary" defaultOpened>
            {statistics.nodes > 0 && <DataRow stat name="Nodes" value={statistics.nodes} />}
            {statistics.edges > 0 && <DataRow stat name="Edges" value={statistics.edges} />}
            {/* Edges that join two selected nodes, selected or not: only meaningful for two or more
                nodes, and named so it is not read as more selected edges. */}
            {statistics.nodes >= 2 && <DataRow stat name="Edges joining these nodes" value={statistics.inducedEdges} />}
            {statistics.attributes.map((attribute) => {
                const value = attributeSummary(attribute);
                return value === undefined ? null : (
                    <DataRow key={attribute.path} stat name={attribute.plainName} value={value} />
                );
            })}
        </ControlSection>
    );
}

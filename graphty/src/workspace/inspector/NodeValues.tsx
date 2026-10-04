import { ControlSection, DataRow, DataRowHeader } from "@graphty/compact-mantine";
import type { GraphSession, NodeId, SelectionAttributeStatistics } from "@graphty/graphty-element/session";
import { Button, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { useAsyncValue } from "./hooks";
import { groupKey, nodeKey } from "./inspected";
import { finishedRuns, selectNode } from "./reads";
import { count, formatNumber, valueText } from "./words";

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
 * attributes, then the results with rank, never mixed; Degree is a link that opens the
 * neighbors), then Memberships.
 * @param props - Component props
 * @param props.id - The node
 * @returns The tab
 */
export function NodeValues({ id }: Readonly<{ id: NodeId }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const degree = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (returnToDegree) {
            returnToDegree = false;
            degree.current?.querySelector("button")?.focus();
        }
    }, []);
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
        return [{ run, group, name: groups.find((g) => g.group === group)?.name ?? String(group) }];
    });
    // The "connections" count is the neighbor list's total, so the two always agree (#784).
    const connections = session.data.neighbors(id, { limit: 0 }).total;

    return (
        <>
            <ControlSection label="Summary" defaultOpened>
                <AttributeRows rows={fileAttributes(session, "node", session.data.node(id))} />
                {ranked.length > 0 && <DataRowHeader label="Results" />}
                {ranked.map(({ run, value, rank }) => (
                    <DataRow
                        key={run.id}
                        stat
                        name={run.label}
                        value={`${formatNumber(value)}, #${String(rank)} of ${formatNumber(run.result.measured.nodes)}`}
                    />
                ))}
                <div ref={degree} style={{ display: "contents" }}>
                    <DataRow
                        name="Degree"
                        value={connections}
                        onClick={() => {
                            void openNeighborhood(session, store, id);
                        }}
                    />
                </div>
            </ControlSection>
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

/**
 * Selects a node's neighborhood and lists it.
 * @param session - the session.
 * @param store - the workspace store.
 * @param id - the node at the center.
 */
async function openNeighborhood(
    session: GraphSession,
    store: ReturnType<typeof useWorkspace>["store"],
    id: NodeId,
): Promise<void> {
    await session.selection.apply({ neighborsOf: [id] });
    store.set({ inspected: { kind: "neighborhood", id: nodeKey(id) } });
}

/**
 * A node's neighbors (tier1-design.md task T12): "1's 17 connections", each by name with its
 * tie value, strongest first, read whole from graphty-element's `data.neighbors()`. Each name
 * selects that node; Esc returns to the node at the center.
 *
 * The heading names the center by its id until graphty-element publishes a node's name (#895).
 * @param props - Component props
 * @param props.center - The node at the center
 * @returns The list
 */
export function NeighborList({ center }: Readonly<{ center: NodeId }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const heading = useRef<HTMLElement>(null);
    // The list takes focus as it opens, and Esc anywhere in it returns to the center node: a
    // shortcut on the region, so it is listened for on the region's own element.
    useEffect(() => {
        const region = heading.current;
        if (region === null || session === null) {
            return undefined;
        }
        region.focus();
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
    let page;
    try {
        page = session.data.neighbors(center, { limit: Infinity });
    } catch {
        // E_UNKNOWN_ELEMENT: the node left the graph.
        return null;
    }
    const tie = page.measuredBy?.attribute;

    return (
        <section ref={heading} tabIndex={-1} aria-label={`${String(center)}'s ${count(page.total, "connection")}`}>
            <Text size="xs" fw={600} px="md" py={6}>
                {`${String(center)}'s ${count(page.total, "connection")}`}
            </Text>
            {tie !== undefined && <DataRowHeader label="Neighbor" unit={tie} />}
            {page.records.map((neighbor) => (
                <DataRow
                    key={nodeKey(neighbor.node.id)}
                    name={neighbor.name}
                    value={tie === undefined ? undefined : neighbor.weight}
                    onClick={() => {
                        selectNode(session, neighbor.node.id);
                    }}
                />
            ))}
        </section>
    );
}

/**
 * One edge's Values tab: its two ends, each a link that selects that node, and the file's
 * attributes. An edge is reached from the Edges table (tier1-design.md task T12).
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
    return (
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
    );
}

/**
 * One attribute of a selection in a few words: its mean, or its commonest value and how many.
 * @param attribute - the selection's statistics for the attribute.
 * @returns the words, or undefined when there is nothing to say.
 */
function attributeSummary(attribute: SelectionAttributeStatistics): string | undefined {
    if (attribute.mean !== undefined) {
        return `mean ${formatNumber(attribute.mean)}`;
    }
    const top = attribute.distribution?.[0];
    return top === undefined ? undefined : `${top.value} (${formatNumber(top.count)})`;
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
            <DataRow stat name="Nodes" value={statistics.nodes} />
            <DataRow stat name="Edges" value={statistics.edges} />
            <DataRow stat name="Edges among them" value={statistics.inducedEdges} />
            {statistics.attributes.map((attribute) => {
                const value = attributeSummary(attribute);
                return value === undefined ? null : (
                    <DataRow key={attribute.path} stat name={attribute.plainName} value={value} />
                );
            })}
        </ControlSection>
    );
}

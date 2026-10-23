import { ControlSection, DataRow, DataRowHeader, HistogramRow } from "@graphty/compact-mantine";
import type { Channel, GraphSession, Layer, NodeId, Path, Run, ScopeInput } from "@graphty/graphty-element/session";
import { Button, ColorSwatch, Text } from "@mantine/core";
import React, { useState } from "react";

import { findTreeRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import { everythingRow, sourceName, startingEverything } from "../style/row";
import { useStyleVersion } from "../style/useStyleVersion";
import { channelWord, groupRank, hexOf, valueName } from "../style/words";
import { DistributionRows } from "./Distribution";
import { useAsyncValue, useSessionVersion } from "./hooks";
import { nodeKey } from "./inspected";
import { focusValuesNext, selectNode } from "./reads";
import { PathValues } from "./RunValues";
import { count, formatNumber } from "./words";

/** How many members, groups or top entries show before "N more". */
const FIRST = 8;

/** A set larger than this is not listed member by member. */
const MEMBERS_MAX = 100;

/** A value a layer reads, with what answers it: a run's field, or a data column. */
interface ValueRead {
    readonly path: Path;
    readonly name: string;
    readonly run?: Run;
    readonly field?: string;
}

/**
 * What answers a path: the run and field publishing it, or nothing for a data column.
 * @param session - the session.
 * @param path - the path.
 * @returns the value read.
 */
function valueRead(session: GraphSession, path: Path): ValueRead {
    const name = sourceName(session, { by: path }) ?? path;
    for (const run of session.runs.list()) {
        const field = run.fields.find((f) => session.results.path(run.id, f.name) === path);
        if (field !== undefined) {
            return { path, name, run, field: field.name };
        }
    }
    return { path, name };
}

/**
 * A run's state, as the Values read row says it.
 * @param run - the run, or undefined for a data column.
 * @returns the words.
 */
function stateWords(run: Run | undefined): string {
    if (run === undefined) {
        return "Data";
    }
    if (run.status === "succeeded") {
        if (run.stale === null) {
            return "Current";
        }
        return run.stale.reason === "window-moved" ? "Out of date: window moved" : "Out of date";
    }
    const words: Readonly<Record<Exclude<Run["status"], "succeeded">, string>> = {
        queued: "Queued",
        running: "Running",
        failed: "Failed",
        canceled: "Canceled",
        removed: "Removed",
    };
    return words[run.status];
}

/**
 * A layer's elements whose value at `path` is `value`, as a scope.
 * @param layer - the layer.
 * @param path - the value's path.
 * @param value - the value.
 * @returns the scope.
 */
function valueScope(layer: Layer, path: Path, value: unknown): ScopeInput {
    return {
        define: {
            kind: "rule",
            where: {
                kind: "categories",
                attribute: path,
                values: [String(value)],
                ...(layer.target === "edge" ? { nodes: "ends" as const } : {}),
            },
            reading: "clipped",
        },
    };
}

/**
 * Rows, the first eight, then "N more" that lists the rest.
 * @param props - Component props
 * @param props.rows - the rows
 * @returns the rows
 */
function FirstRows({ rows }: Readonly<{ rows: readonly React.ReactNode[] }>): React.JSX.Element {
    const [all, setAll] = useState(false);
    const shown = all ? rows : rows.slice(0, FIRST);
    return (
        <>
            {shown}
            {rows.length > shown.length && (
                <Button
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => {
                        setAll(true);
                    }}
                >
                    {`${String(rows.length - shown.length)} more`}
                </Button>
            )}
        </>
    );
}

/**
 * A number value: its histogram, its minimum, median and maximum, and the steps a layer draws it
 * in when it draws it in steps.
 * @param props - Component props
 * @param props.session - the session
 * @param props.read - the value
 * @param props.layers - the row's layers that read it
 * @returns the section, or null when the value is not a number
 */
function NumberValues({
    session,
    read,
    layers,
}: Readonly<{ session: GraphSession; read: ValueRead; layers: readonly Layer[] }>): React.JSX.Element | null {
    const histogram = histogramOf(session, read, layers[0]);
    if (histogram === null || histogram.bins.length === 0) {
        return null;
    }
    const { min, median, max } = histogram;
    const previews = layers.flatMap((layer) =>
        Object.entries(layer.encode ?? {}).flatMap(([channel, binding]) => {
            if (binding === undefined || !("by" in binding) || binding.by !== read.path) {
                return [];
            }
            try {
                return [
                    {
                        channel: channel as Channel,
                        preview: session.styles.preview(binding, { channel: channel as Channel }),
                    },
                ];
            } catch {
                return [];
            }
        }),
    );
    const stepped = previews.filter(({ preview }) => preview.stepCounts.length > 0);
    // Drawn in the colors a color binding paints, bar for bar, as the ramp popover draws it.
    const ramp = previews.find(({ preview }) => preview.bins.some((bin) => hexOf(bin.paints) !== null))?.preview;
    const bins: readonly { from: number; to: number; count: number; paint?: string }[] =
        ramp === undefined
            ? histogram.bins
            : ramp.bins.map((bin) => ({
                  from: bin.from ?? 0,
                  to: bin.to ?? 0,
                  count: bin.count,
                  paint: hexOf(bin.paints) ?? undefined,
              }));
    const measured = histogram.bins.reduce((sum, bin) => sum + bin.count, 0);
    return (
        <ControlSection label={read.name} collapsible={false} headingLevel={3}>
            <HistogramRow
                label={read.name}
                bins={bins.map((bin) => ({
                    label: `${formatNumber(bin.from)} to ${formatNumber(bin.to)}: ${String(bin.count)}`,
                    count: bin.count,
                    paint: bin.paint,
                }))}
                minLabel={formatNumber(bins[0].from)}
                maxLabel={formatNumber(bins.at(-1)?.to ?? 0)}
            />
            <DistributionRows figures={{ count: measured, min, median, max }} />
            {stepped.map(({ channel, preview }) => (
                <React.Fragment key={channel}>
                    <DataRowHeader label={`${channelWord(channel)} steps`} />
                    {preview.stepCounts.map((n, i) => {
                        const from = i === 0 ? preview.domain?.[0] : preview.steps[i - 1];
                        const to = i === preview.steps.length ? preview.domain?.[1] : preview.steps[i];
                        return (
                            <DataRow
                                key={i} // NOSONAR(S6479): a step's place is its identity; the steps never reorder
                                stat
                                name={`${formatNumber(from ?? 0)} to ${formatNumber(to ?? 0)}`}
                                value={n}
                            />
                        );
                    })}
                </React.Fragment>
            ))}
        </ControlSection>
    );
}

/**
 * The histogram of a value: a run field's, or a data column's.
 * @param session - the session.
 * @param read - the value.
 * @param layer - a layer reading it, for the column's kind.
 * @returns the histogram, or null when the value is not a number.
 */
function histogramOf(
    session: GraphSession,
    read: ValueRead,
    layer: Layer | undefined,
): ReturnType<NonNullable<Run["result"]>["histogram"]> | null {
    if (read.run !== undefined && read.field !== undefined) {
        const field = read.run.fields.find((f) => f.name === read.field);
        // A community's number names a group; its spread measures nothing.
        const numeric = field?.type === "number" || field?.type === "integer";
        if (!numeric || field?.measurement === "categorical" || read.run.result === undefined) {
            return null;
        }
        return read.run.result.histogram(read.field);
    }
    const column = session.data
        .attributes()
        .find((a) => a.path === read.path && (layer === undefined || a.kind === layer.target));
    if (column?.measurement !== "quantitative") {
        return null;
    }
    const histogram = session.data.histogram(column);
    return histogram.kind === "numeric" ? histogram : null;
}

/**
 * A category value: its groups, largest first, each with its chit and size; a click selects the
 * group's elements. Then what the last re-run could not match.
 * @param props - Component props
 * @param props.session - the session
 * @param props.read - the value
 * @param props.layers - the row's layers that read it
 * @returns the section, or null when no layer paints the value by category
 */
function CategoryValues({
    session,
    read,
    layers,
}: Readonly<{ session: GraphSession; read: ValueRead; layers: readonly Layer[] }>): React.JSX.Element | null {
    const found = layers.flatMap((layer) =>
        Object.entries(layer.encode ?? {}).flatMap(([channel, binding]) =>
            binding !== undefined && "by" in binding && binding.by === read.path
                ? [{ layer, channel: channel as Channel }]
                : [],
        ),
    );
    const first = found.find(({ layer, channel }) => session.styles.categories(layer.id, channel).length > 0);
    if (first === undefined) {
        return null;
    }
    const { layer, channel } = first;
    const swatches = session.styles.legendOf(layer.id).find((block) => block.channel === channel)?.swatches ?? [];
    const unmatched = layers.flatMap((l) => l.unmatched ?? []).filter((u) => u.params.path === read.path);
    // Ordered and named as the key lists them: a run's groups by rank ("Group 1" first).
    const rankOf = (value: unknown): number => groupRank(session, read.path, value) ?? Number.POSITIVE_INFINITY;
    const ordered = [...session.styles.categories(layer.id, channel)].sort((a, b) => rankOf(a.value) - rankOf(b.value));
    return (
        <ControlSection label={read.name} collapsible={false} headingLevel={3}>
            <DataRowHeader label="Groups, largest first" />
            <FirstRows
                rows={ordered.map((category) => {
                    const word = String(category.value);
                    const color = swatches.find((s) => String(s.value) === word)?.color;
                    return (
                        <DataRow
                            key={word}
                            name={valueName(session, read.path, category.value)}
                            value={category.count}
                            icon={
                                typeof color === "string" ? (
                                    <ColorSwatch color={color} size={12} withShadow={false} aria-hidden />
                                ) : undefined
                            }
                            onClick={() => {
                                void session.selection.apply({ scope: valueScope(layer, read.path, category.value) });
                            }}
                        />
                    );
                })}
            />
            {unmatched.map((u) => {
                const value = valueName(session, read.path, u.params.value);
                const dropped = u.params.dropped === true ? ": what this layer set for it was dropped" : "";
                return (
                    <Text key={`${u.code}:${String(u.params.value)}`} size="sm" c="dimmed">
                        {u.code === "group.new"
                            ? `${value} is new since the last run`
                            : `${value} is gone since the last run${dropped}`}
                    </Text>
                );
            })}
        </ControlSection>
    );
}

/**
 * A "Top N by" rule's ranked list, from the run it ranks by.
 * @param props - Component props
 * @param props.session - the session
 * @param props.layer - the layer
 * @returns the section, or null when the layer is not a "Top N by" layer
 */
function TopValues({ session, layer }: Readonly<{ session: GraphSession; layer: Layer }>): React.JSX.Element | null {
    const { selector } = layer;
    if (selector.match !== "top") {
        return null;
    }
    const read = valueRead(session, selector.path);
    const top = read.field === undefined ? undefined : read.run?.result?.top(read.field, selector.n);
    if (top === undefined) {
        return null;
    }
    return (
        <ControlSection label={`Top ${String(selector.n)} by ${read.name}`} collapsible={false} headingLevel={3}>
            {top.entries.map((entry) => (
                <DataRow
                    key={nodeKey(entry.id)}
                    name={String(entry.id)}
                    value={formatNumber(entry.value)}
                    onClick={() => {
                        // The row goes with the view it sat in; focus goes to the node's view.
                        focusValuesNext();
                        selectNode(session, entry.id);
                    }}
                />
            ))}
        </ControlSection>
    );
}

/**
 * The scope a layer's selector holds, when it names a set or a rule.
 * @param layer - the layer.
 * @returns the scope, or null.
 */
function setScope(layer: Layer): ScopeInput | null {
    const { selector } = layer;
    switch (selector.match) {
        case "member":
            return selector.of;
        case "rule":
            return { define: { kind: "rule", where: selector.where, reading: selector.edges ?? "clipped" } };
        default:
            return null;
    }
}

/**
 * A small set's members: the nodes a set or rule layer holds, the first eight, then the rest on
 * request; each selects its node.
 * @param props - Component props
 * @param props.session - the session
 * @param props.layer - the layer
 * @param props.matched - how many elements it matches
 * @param props.version - changes whenever the element reports a change
 * @returns the section, or null
 */
function MemberValues({
    session,
    layer,
    matched,
    version,
}: Readonly<{ session: GraphSession; layer: Layer; matched: number; version: string }>): React.JSX.Element | null {
    const scope = layer.target === "node" && matched <= MEMBERS_MAX ? setScope(layer) : null;
    const listed = layer.selector.match === "ids" ? layer.selector.nodes : undefined;
    const resolved = useAsyncValue(
        () => (scope === null ? null : session.scope.resolve(scope)),
        `${version}:${layer.id}`,
    );
    const nodes: readonly NodeId[] | undefined = listed ?? (resolved === undefined ? undefined : [...resolved.nodes]);
    if (nodes === undefined || nodes.length === 0) {
        return null;
    }
    return (
        <ControlSection label="Members" collapsible={false} headingLevel={3}>
            <FirstRows
                rows={nodes.map((id) => (
                    <DataRow
                        key={nodeKey(id)}
                        name={String(id)}
                        onClick={() => {
                            // The row goes with the view it sat in; focus goes to the node's view.
                            focusValuesNext();
                            selectNode(session, id);
                        }}
                    />
                ))}
            />
        </ControlSection>
    );
}

/** What a state layer's rule reads, by the state it follows. */
const STATE_NAMES = {
    selected: "Is selected",
    hovered: "Is hovered",
    ghosted: "Is outside the time window",
    pinned: "Is pinned",
} as const;

/**
 * Selected's and Hovered's current elements.
 * @param props - Component props
 * @param props.session - the session
 * @param props.state - which state the layer follows
 * @returns the section
 */
function StateValues({
    session,
    state,
}: Readonly<{ session: GraphSession; state: "selected" | "hovered" }>): React.JSX.Element {
    if (state === "hovered") {
        const { hovered } = session.selection;
        return (
            <ControlSection label="Now" collapsible={false} headingLevel={3}>
                {hovered === null ? (
                    <Text size="sm" c="dimmed">
                        Nothing hovered
                    </Text>
                ) : (
                    <DataRow name={String(hovered)} />
                )}
            </ControlSection>
        );
    }
    const { nodes, edges } = session.selection;
    return (
        <ControlSection label="Now" collapsible={false} headingLevel={3}>
            {nodes.length + edges.length === 0 ? (
                <Text size="sm" c="dimmed">
                    Nothing selected
                </Text>
            ) : (
                <>
                    {nodes.length > 0 && <DataRowHeader label={count(nodes.length, "node")} />}
                    <FirstRows
                        rows={nodes.map((id) => (
                            <DataRow
                                key={nodeKey(id)}
                                name={String(id)}
                                onClick={() => {
                                    // The row goes with the view it sat in; focus goes to the node's view.
                                    focusValuesNext();
                                    selectNode(session, id);
                                }}
                            />
                        ))}
                    />
                    {edges.length > 0 && <DataRow stat name="Edges" value={edges.length} />}
                </>
            )}
        </ControlSection>
    );
}

/**
 * Where a layer's look shows (the reader's question "why don't I see my look?"): per property it
 * writes, "on N of M nodes"; then, where layers above cover it, the top three of them with how many
 * elements each covers, and "N more". A covering layer's row selects what that layer paints.
 * @param props - Component props
 * @param props.session - the session
 * @param props.counted - the row's layers with the element's counts
 * @returns the section, or null when the row writes nothing
 */
function WhereItShows({
    session,
    counted,
}: Readonly<{
    session: GraphSession;
    counted: readonly { layer: Layer; counts: ReturnType<GraphSession["styles"]["counts"]> }[];
}>): React.JSX.Element | null {
    const rows = counted.flatMap(({ layer, counts }) =>
        Object.entries(counts.painted).map(([channel, n]) => ({
            layer,
            counts,
            channel: channel as Channel,
            n: n ?? 0,
        })),
    );
    if (rows.length === 0) {
        return null;
    }
    return (
        <ControlSection label="Where its look shows" collapsible={false} headingLevel={3}>
            {rows.map(({ layer, counts, channel, n }) => {
                const noun = layer.target === "node" ? "node" : "edge";
                const covers = counts.covers[channel];
                return (
                    <React.Fragment key={`${layer.id}:${channel}`}>
                        <DataRow
                            stat
                            name={`${noun === "node" ? "Node" : "Edge"} ${channelWord(channel).toLowerCase()}`}
                            value={`on ${formatNumber(n)} of ${count(counts.matched, noun)}`}
                        />
                        {covers?.layers.map((cover) => (
                            <DataRow
                                key={cover.layerId}
                                name={`Covered by ${session.styles.get(cover.layerId)?.name ?? "a layer"}`}
                                value={count(cover.count, noun)}
                                onClick={() => {
                                    void session.selection.apply({ layer: cover.layerId });
                                }}
                            />
                        ))}
                        {covers !== undefined && covers.more > 0 && (
                            <DataRow name={`${String(covers.more)} more ${covers.more === 1 ? "layer" : "layers"}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </ControlSection>
    );
}

/**
 * The halves whose matches a row's Covers lists: those that write a property (a half that is on
 * but sets nothing paints nothing), or every half while the row writes nothing yet.
 * @param counted - the row's layers with the element's counts.
 * @returns the halves to list.
 */
function covering<T extends { counts: ReturnType<GraphSession["styles"]["counts"]> }>(
    counted: readonly T[],
): readonly T[] {
    const painting = counted.filter(({ counts }) => Object.keys(counts.painted).length > 0);
    return painting.length === 0 ? counted : painting;
}

/**
 * The layers of a row: its node part and its edge part, those it has.
 * @param session - the session.
 * @param rowId - the row.
 * @returns the layers.
 */
function rowLayersOf(session: GraphSession, rowId: string): Layer[] {
    const parts = session.styles.parts(rowId);
    const ids = parts === undefined ? [rowId] : [parts.node, parts.edge];
    return ids.flatMap((id) => (id === undefined ? [] : (session.styles.get(id) ?? [])));
}

/**
 * The Values tab of a layer row (tier3 design, section 2.4): information, never styling, built the
 * same way for every row, Everything included. Covers (what it matches); Where its look shows (per
 * property, and who covers it); Values read; then, per value, its histogram (numbers), its groups
 * (categories) or its ordered steps (a path); a "Top N by" list, a small set's members, and
 * Selected's and Hovered's current elements.
 * @param props - Component props
 * @param props.id - the row
 * @param props.layerIds - the layers to read instead of the row's, for Everything without a row
 * @returns the tab
 */
export function LayerValues({
    id,
    layerIds,
}: Readonly<{ id: string; layerIds?: readonly string[] }>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    const styleVersion = useStyleVersion(session, element);
    const sessionVersion = useSessionVersion(session);
    if (session === null) {
        return null;
    }
    const layers =
        layerIds === undefined
            ? rowLayersOf(session, id)
            : layerIds.flatMap((layerId) => session.styles.get(layerId) ?? []);
    if (layers.length === 0) {
        return (
            <Text size="xs" c="dimmed" p="md">
                This row is gone
            </Text>
        );
    }
    const counted = layers.map((layer) => ({ layer, counts: session.styles.counts(layer.id) }));
    const paths = [...new Set(counted.flatMap(({ counts }) => counts.reads))];
    const reads = paths.map((path) => valueRead(session, path));
    const states = layers.flatMap((layer) => (layer.selector.match === "state" ? [layer.selector.state] : []));
    const readers = (path: Path): Layer[] =>
        counted.filter(({ counts }) => counts.reads.includes(path)).map(({ layer }) => layer);
    const version = `${String(styleVersion)}:${String(sessionVersion)}`;

    return (
        <>
            <ControlSection label="Covers" collapsible={false} headingLevel={3}>
                {covering(counted).map(({ layer, counts }) => (
                    <DataRow
                        key={layer.id}
                        stat
                        name={layer.target === "node" ? "Matched nodes" : "Matched edges"}
                        value={counts.matched}
                    />
                ))}
            </ControlSection>
            <WhereItShows session={session} counted={counted} />
            {/* Its own section: a header row with no value read as the label of the row below. */}
            {reads.length + states.length > 0 && (
                <ControlSection label="Values read" collapsible={false} headingLevel={3}>
                    {reads.map((read) => (
                        <DataRow key={read.path} stat name={read.name} value={stateWords(read.run)} />
                    ))}
                    {[...new Set(states)].map((state) => (
                        <DataRow key={state} stat name={STATE_NAMES[state]} value="This view only" />
                    ))}
                </ControlSection>
            )}
            {[...new Set(states)].map((state) =>
                state === "ghosted" || state === "pinned" ? null : (
                    <StateValues key={state} session={session} state={state} />
                ),
            )}
            {reads.map((read) =>
                read.run?.shape === "path" ? (
                    <PathValues key={read.path} session={session} run={read.run} summaryLabel="Route" />
                ) : (
                    <React.Fragment key={read.path}>
                        {/* A measure is a histogram, whatever reads it (a label too); categories only otherwise. */}
                        {histogramOf(session, read, readers(read.path)[0]) === null ? (
                            <CategoryValues session={session} read={read} layers={readers(read.path)} />
                        ) : (
                            <NumberValues session={session} read={read} layers={readers(read.path)} />
                        )}
                    </React.Fragment>
                ),
            )}
            {counted.map(({ layer, counts }) => (
                <React.Fragment key={layer.id}>
                    <TopValues session={session} layer={layer} />
                    <MemberValues session={session} layer={layer} matched={counts.matched} version={version} />
                </React.Fragment>
            ))}
        </>
    );
}

/**
 * The Everything row's Values tab: the same structure as every other layer's, read from the
 * starting Everything row (or the reader's own layer that paints everything).
 * @returns the tab
 */
export function EverythingRowValues(): React.JSX.Element | null {
    const { session } = useWorkspace();
    if (session === null) {
        return null;
    }
    const id = startingEverything(session);
    return id === undefined ? <LayerValues id="" layerIds={everythingRow(session)} /> : <LayerValues id={id} />;
}

/**
 * The Values tab of a folder: the values its layers read, each with the layers that read it.
 * @param props - Component props
 * @param props.id - the folder
 * @returns the tab
 */
export function FolderValues({ id }: Readonly<{ id: string }>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const found = findTreeRow(session.styles.tree(), id);
    const byPath = new Map<Path, string[]>();
    const walk = (rows: readonly { id: string; kind: string; name: string; children: readonly unknown[] }[]): void => {
        for (const row of rows) {
            if (row.kind === "folder") {
                walk(row.children as typeof rows);
                continue;
            }
            for (const layer of rowLayersOf(session, row.id)) {
                for (const path of session.styles.counts(layer.id).reads) {
                    const names = byPath.get(path) ?? [];
                    if (!names.includes(row.name)) {
                        names.push(row.name);
                    }
                    byPath.set(path, names);
                }
            }
        }
    };
    walk([...(found?.row.children ?? [])].reverse());
    return (
        <ControlSection label="Values read" collapsible={false} headingLevel={3}>
            {byPath.size === 0 ? (
                <Text size="sm" c="dimmed">
                    Its layers read no values
                </Text>
            ) : (
                [...byPath].map(([path, names]) => (
                    <DataRow key={path} stat name={valueRead(session, path).name} value={names.join(", ")} />
                ))
            )}
        </ControlSection>
    );
}

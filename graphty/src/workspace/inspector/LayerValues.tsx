import { ControlSection, DataRow, DataRowHeader, HistogramRow } from "@graphty/compact-mantine";
import type { Channel, GraphSession, Layer, NodeId, Path, Run, ScopeInput } from "@graphty/graphty-element/session";
import { Button, ColorSwatch, Text } from "@mantine/core";
import React, { useState } from "react";

import { findTreeRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import { sourceName } from "../style/row";
import { useStyleVersion } from "../style/useStyleVersion";
import { channelWord } from "../style/words";
import { useAsyncValue, useSessionVersion } from "./hooks";
import { nodeKey } from "./inspected";
import { selectNode } from "./reads";
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
        return run.stale === null ? "Current" : "Out of date";
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
    const { bins, min, median, max } = histogram;
    const measured = bins.reduce((sum, bin) => sum + bin.count, 0);
    const stepped = layers.flatMap((layer) =>
        Object.entries(layer.encode ?? {}).flatMap(([channel, binding]) => {
            if (binding === undefined || !("by" in binding) || binding.by !== read.path) {
                return [];
            }
            try {
                const preview = session.styles.preview(binding, { channel: channel as Channel });
                return preview.stepCounts.length > 0 ? [{ channel: channel as Channel, preview }] : [];
            } catch {
                return [];
            }
        }),
    );
    return (
        <ControlSection label={read.name} collapsible={false} headingLevel={3}>
            <HistogramRow
                label={read.name}
                bins={bins.map((bin) => ({
                    label: `${formatNumber(bin.from)} to ${formatNumber(bin.to)}: ${String(bin.count)}`,
                    count: bin.count,
                }))}
                minLabel={formatNumber(bins[0].from)}
                maxLabel={formatNumber(bins[bins.length - 1].to)}
            />
            {min !== undefined && median !== undefined && max !== undefined && (
                <Text size="sm" c="dimmed" data-testid="values-spread">
                    {`${formatNumber(measured)} have a value, ${formatNumber(min)} to ${formatNumber(max)}, median ${formatNumber(median)}`}
                </Text>
            )}
            {stepped.map(({ channel, preview }) => (
                <React.Fragment key={channel}>
                    <DataRowHeader label={`${channelWord(channel)} steps`} />
                    {preview.stepCounts.map((n, i) => {
                        const from = i === 0 ? preview.domain?.[0] : preview.steps[i - 1];
                        const to = i === preview.steps.length ? preview.domain?.[1] : preview.steps[i];
                        return (
                            <DataRow
                                key={i}
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
    return (
        <ControlSection label={read.name} collapsible={false} headingLevel={3}>
            <DataRowHeader label="Groups, largest first" />
            <FirstRows
                rows={session.styles.categories(layer.id, channel).map((category) => {
                    const word = String(category.value);
                    const color = swatches.find((s) => String(s.value) === word)?.color;
                    return (
                        <DataRow
                            key={word}
                            name={word}
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
            {unmatched.map((u) => (
                <Text key={`${u.code}:${String(u.params.value)}`} size="sm" c="dimmed">
                    {u.code === "group.new"
                        ? `${String(u.params.value)} is new since the last run`
                        : `${String(u.params.value)} is gone since the last run${u.params.dropped === true ? ": what this layer set for it was dropped" : ""}`}
                </Text>
            ))}
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
                            selectNode(session, id);
                        }}
                    />
                ))}
            />
        </ControlSection>
    );
}

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
 * same way for every row from the values it reads. Matched and Values read; then, per value, its
 * histogram (numbers), its groups (categories) or its ordered steps (a path); a "Top N by" list,
 * a small set's members, Selected's and Hovered's current elements; painted counts last.
 * @param props - Component props
 * @param props.id - the row
 * @returns the tab
 */
export function LayerValues({ id }: Readonly<{ id: string }>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    const styleVersion = useStyleVersion(session, element);
    const sessionVersion = useSessionVersion(session);
    if (session === null) {
        return null;
    }
    const layers = rowLayersOf(session, id);
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
            <ControlSection label="Summary" collapsible={false} headingLevel={3}>
                {counted.map(({ layer, counts }) => (
                    <DataRow
                        key={layer.id}
                        stat
                        name={layer.target === "node" ? "Matched nodes" : "Matched edges"}
                        value={counts.matched}
                    />
                ))}
            </ControlSection>
            {/* Its own section: a header row with no value read as the label of the row below. */}
            {reads.length + states.length > 0 && (
                <ControlSection label="Values read" collapsible={false} headingLevel={3}>
                    {reads.map((read) => (
                        <DataRow key={read.path} stat name={read.name} value={stateWords(read.run)} />
                    ))}
                    {[...new Set(states)].map((state) => (
                        <DataRow
                            key={state}
                            stat
                            name={state === "selected" ? "Is selected" : "Is hovered"}
                            value="This view only"
                        />
                    ))}
                </ControlSection>
            )}
            {[...new Set(states)].map((state) => (
                <StateValues key={state} session={session} state={state} />
            ))}
            {reads.map((read) =>
                read.run?.shape === "path" ? (
                    <PathValues key={read.path} session={session} run={read.run} summaryLabel="Route" />
                ) : (
                    <React.Fragment key={read.path}>
                        <CategoryValues session={session} read={read} layers={readers(read.path)} />
                        <NumberValues session={session} read={read} layers={readers(read.path)} />
                    </React.Fragment>
                ),
            )}
            {counted.map(({ layer, counts }) => (
                <React.Fragment key={layer.id}>
                    <TopValues session={session} layer={layer} />
                    <MemberValues session={session} layer={layer} matched={counts.matched} version={version} />
                </React.Fragment>
            ))}
            <ControlSection label="Painted" collapsible={false} headingLevel={3}>
                {counted.flatMap(({ layer, counts }) =>
                    Object.entries(counts.painted).map(([channel, n]) => (
                        <DataRow
                            key={channel}
                            stat
                            name={`${layer.target === "node" ? "Node" : "Edge"} ${channelWord(channel as Channel).toLowerCase()}`}
                            value={`${formatNumber(n ?? 0)} of ${formatNumber(counts.matched)}`}
                        />
                    )),
                )}
            </ControlSection>
        </>
    );
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

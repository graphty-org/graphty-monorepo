/**
 * The Calculate pop-over (tmp/entries-first/spec.md 2.1): edits one Graph value of a pie, chart or record -- what it
 * walks (edges, neighbors or members), the direction and hops, which ones it keeps, what it measures and what it
 * groups by -- at most six lines, its pickers the next level. Every change is one write of the entry's whole Graph
 * value; graphty-element walks, counts and groups (`GraphMeasure`), the panel only writes the definition.
 */

import { type DataField, DataFieldPicker, PanelField } from "@graphty/compact-mantine";
import type { GraphMeasure, RuleTree, WalkPath } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import React from "react";

import { readableName, valueFact } from "../words";
import { NONE, pruned, TYPES } from "./dataEntries";
import { PopLine, Segments, WordNumber } from "./dataLines";
import { walkingOver } from "./graphWalks";

/** A Graph value's parts the lines change, each optional so a line can take one off. */
type Patch = { -readonly [K in keyof GraphMeasure]?: GraphMeasure[K] };

/** What every line reads and writes. */
interface CalcArgs {
    readonly session: GraphSession;
    readonly graph: GraphMeasure;
    readonly set: (patch: Patch) => void;
}

/**
 * A walk path's picker id: "edge:" or "node:" and its path.
 * @param over - what the value walks.
 * @param walk - the path.
 * @returns the id, or null for none.
 */
function idOf(over: GraphMeasure["over"], walk: WalkPath | undefined): string | null {
    if (walk === undefined) {
        return null;
    }
    const on = walk.on ?? (over === "edges" ? "edge" : "node");
    return `${on}:${walk.path}`;
}

/**
 * The walk path a picker id names, writing `on` only where it is not the default.
 * @param over - what the value walks.
 * @param id - the id.
 * @returns the path.
 */
function walkOf(over: GraphMeasure["over"], id: string): WalkPath {
    const at = id.indexOf(":");
    const path = id.slice(at + 1);
    return over === "edges" && id.startsWith("node:") ? { path, on: "node" } : { path };
}

/** The group a walked value is listed under, by what the value walks. */
const FAR: Readonly<Record<GraphMeasure["over"], string>> = {
    edges: "Other end",
    neighbors: "Neighbor",
    members: "Member",
};

/**
 * The values a walk reads: an edge's own (Edges only) and the node's at the other end, the neighbor or the member.
 * @param session - the session.
 * @param over - what the value walks.
 * @param fits - which values to list, by their kind and what they are.
 * @returns the fields.
 */
function walkFields(
    session: GraphSession,
    over: GraphMeasure["over"],
    fits: (kind: string, valueKind: string | undefined) => boolean,
): DataField[] {
    return (
        session.data
            .readableValues()
            .filter(
                (value) =>
                    value.from !== "element" &&
                    value.end === undefined &&
                    value.holdsNodeIds !== true &&
                    (value.on === "node" || over === "edges") &&
                    fits(value.kind, value.valueKind),
            )
            // An edge's own values first: on Edges they are the default Of, the far end's after them.
            .sort((a, b) => Number(b.on === "edge") - Number(a.on === "edge"))
            .map((value) => ({
                id: `${value.on}:${value.path}`,
                name: readableName(session, value).name,
                type: value.spread === undefined ? TYPES[value.kind] : "list",
                group: value.on === "edge" ? "Edge" : FAR[over],
                sample: valueFact(value),
                keywords: [value.technicalName],
            }))
    );
}

/**
 * Every value.
 * @returns true.
 */
const ANY = (): boolean => true;

/**
 * Numbers only.
 * @param kind - the value's kind.
 * @returns whether it is a number.
 */
const NUMBERS = (kind: string): boolean => kind === "number";

/**
 * A time column.
 * @param _kind - the value's kind.
 * @param valueKind - what it is, for a control.
 * @returns whether it holds times.
 */
const TIMES = (_kind: string, valueKind: string | undefined): boolean => valueKind === "time";

/**
 * The picker row a group in force is, when it is not a value.
 * @param groupBy - the group.
 * @returns "direction", or undefined for a value.
 */
function actionOf(groupBy: NonNullable<GraphMeasure["groupBy"]>): string | undefined {
    return groupBy.by === "direction" ? "direction" : undefined;
}

/** The measures, with their words. */
const MEASURES: readonly (readonly [GraphMeasure["measure"], string])[] = [
    ["count", "Count"],
    ["sum", "Sum"],
    ["mean", "Mean"],
    ["min", "Min"],
    ["max", "Max"],
    ["mode", "Most common"],
];

/** The time periods, with their words. */
const PERIODS = [
    ["hour", "Hour"],
    ["day", "Day"],
    ["week", "Week"],
    ["month", "Month"],
    ["quarter", "Quarter"],
    ["year", "Year"],
] as const;

/**
 * The Direction segments (and, over neighbors, the Hops beside them).
 * @param props - Component props
 * @param props.args - the Graph value
 * @returns The line, or nothing over members
 */
function DirectionLine({ args }: Readonly<{ args: CalcArgs }>): React.JSX.Element | null {
    const { session, graph, set } = args;
    if (graph.over === "members") {
        return null;
    }
    const undirected = session.status.directed ? undefined : "Edges have no direction here";
    const direction = (
        <Segments
            label="Direction"
            value={graph.direction ?? "both"}
            options={[
                ["in", "In", undirected],
                ["out", "Out", undirected],
                ["both", "Both"],
            ]}
            onPick={(next) => {
                set({ direction: next === "both" ? undefined : (next as "in" | "out") });
            }}
        />
    );
    if (graph.over === "edges") {
        return (
            <PopLine line="calc.direction" name="Direction">
                {direction}
            </PopLine>
        );
    }
    return (
        <PopLine line="calc.direction" name="Hops / Direction" wide first={48}>
            <PanelField
                width="fill"
                label="Hops"
                kind="number"
                value={graph.hops ?? 1}
                min={1}
                max={3}
                onChange={(next) => {
                    const hops = Math.min(3, Math.max(1, Math.round(Number(next))));
                    set({ hops: hops === 1 ? undefined : (hops as 2 | 3) });
                }}
            />
            {direction}
        </PopLine>
    );
}

/**
 * The first rule a value keeps: one of its categories, or its numbers from its lowest.
 * @param session - the session.
 * @param id - the value's picker id.
 * @returns the rule.
 */
function firstRule(session: GraphSession, id: string): RuleTree {
    const on = id.startsWith("edge:") ? "edge" : "node";
    const path = id.slice(id.indexOf(":") + 1);
    const value = session.data.readableValues().find((each) => each.on === on && each.path === path);
    if (value?.kind === "number") {
        return { kind: "range", attribute: path, min: value.range?.min ?? 0 };
    }
    const first = session.data.valueCounts(path, { kind: on, scope: "graph" }).values.at(0);
    return { kind: "categories", attribute: path, values: [String(first?.value ?? "")] };
}

/**
 * The "Only where" line: a value of the walked edge or node, and the category it must be or the least number.
 * @param props - Component props
 * @param props.args - the Graph value
 * @returns The line
 */
function WhereLine({ args }: Readonly<{ args: CalcArgs }>): React.JSX.Element {
    const { session, graph, set } = args;
    const { over, where } = graph;
    const attribute = where !== undefined && "attribute" in where ? where.attribute : undefined;
    const id = idOf(over, attribute === undefined ? undefined : { path: attribute, on: graph.whereOn });
    const value = session.data.readableValues().find((each) => `${each.on}:${each.path}` === id);
    return (
        <PopLine line="calc.where" name="Only where" wide={value !== undefined}>
            <DataFieldPicker
                label="Only where"
                fields={walkFields(session, over, ANY)}
                value={id}
                actions={[NONE]}
                actionValue={id === null ? NONE.id : undefined}
                onAction={() => {
                    set({ where: undefined, whereOn: undefined });
                }}
                onChange={(next) => {
                    if (next === null) {
                        set({ where: undefined, whereOn: undefined });
                        return;
                    }
                    const nodeOnEdges = over === "edges" && next.startsWith("node:");
                    set({ where: firstRule(session, next), whereOn: nodeOnEdges ? "node" : undefined });
                }}
            />
            {value?.kind === "number" ? (
                <WordNumber
                    label="At least"
                    value={where?.kind === "range" ? where.min : undefined}
                    unset="Any"
                    onWrite={(min) => {
                        set({ where: pruned({ kind: "range" as const, attribute: value.path, min }) });
                    }}
                />
            ) : null}
            {value !== undefined && value.kind !== "number" ? (
                <PanelField
                    width="fill"
                    label="Is"
                    kind="select"
                    value={where?.kind === "categories" ? (where.values.at(0) ?? null) : null}
                    data={session.data
                        .valueCounts(value.path, { kind: value.on, scope: "graph" })
                        .values.map((each) => ({ value: String(each.value), label: String(each.value) }))}
                    onChange={(next) => {
                        set({ where: { kind: "categories", attribute: value.path, values: [String(next)] } });
                    }}
                />
            ) : null}
        </PopLine>
    );
}

/**
 * The "Measure / Of" line: what is measured, and of which value (none for a count, whose line is named "Measure").
 * @param props - Component props
 * @param props.args - the Graph value
 * @returns The line
 */
function MeasureLine({ args }: Readonly<{ args: CalcArgs }>): React.JSX.Element {
    const { session, graph, set } = args;
    const { over, measure } = graph;
    const fits = measure === "mode" ? ANY : NUMBERS;
    return (
        <PopLine line="calc.measure" name={measure === "count" ? "Measure" : "Measure / Of"} wide={measure !== "count"}>
            <PanelField
                width="fill"
                label="Measure"
                kind="select"
                value={measure}
                data={MEASURES.map(([value, label]) => ({ value, label }))}
                onChange={(next) => {
                    const picked = next as GraphMeasure["measure"];
                    if (picked === "count") {
                        set({ measure: picked, of: undefined });
                        return;
                    }
                    const first = walkFields(session, over, picked === "mode" ? ANY : NUMBERS).at(0);
                    const of = graph.of ?? (first === undefined ? undefined : walkOf(over, first.id));
                    if (of !== undefined) {
                        set({ measure: picked, of });
                    }
                }}
            />
            {measure === "count" ? null : (
                <DataFieldPicker
                    label="Of"
                    fields={walkFields(session, over, fits)}
                    value={idOf(over, graph.of)}
                    onChange={(next) => {
                        if (next !== null) {
                            set({ of: walkOf(over, next) });
                        }
                    }}
                />
            )}
        </PopLine>
    );
}

/**
 * The "Group by" line: a value (a time column adds its Period beside), or Direction over a directed graph's edges.
 * @param props - Component props
 * @param props.args - the Graph value
 * @returns The line
 */
function GroupLine({ args }: Readonly<{ args: CalcArgs }>): React.JSX.Element {
    const { session, graph, set } = args;
    const { over, groupBy } = graph;
    const byTime = groupBy?.by === "time" ? groupBy : undefined;
    const id = groupBy === undefined || groupBy.by === "direction" ? null : idOf(over, groupBy);
    const times = new Set(walkFields(session, over, TIMES).map((field) => field.id));
    return (
        <PopLine
            line="calc.group"
            name={byTime === undefined ? "Group by" : "Group by / Period"}
            wide={byTime !== undefined}
        >
            <DataFieldPicker
                label="Group by"
                fields={walkFields(session, over, ANY)}
                value={id}
                actions={[
                    NONE,
                    ...(over === "edges" && session.status.directed ? [{ id: "direction", label: "Direction" }] : []),
                ]}
                actionValue={groupBy === undefined ? NONE.id : actionOf(groupBy)}
                onAction={(action) => {
                    set({ groupBy: action === "direction" ? { by: "direction" } : undefined });
                }}
                onChange={(next) => {
                    if (next === null) {
                        set({ groupBy: undefined });
                        return;
                    }
                    const walk = walkOf(over, next);
                    set({
                        groupBy: times.has(next) ? { by: "time", period: "month", ...walk } : { by: "value", ...walk },
                    });
                }}
            />
            {byTime === undefined ? null : (
                <PanelField
                    width="fill"
                    label="Period"
                    kind="select"
                    value={byTime.period}
                    data={PERIODS.map(([value, label]) => ({ value, label }))}
                    onChange={(next) => {
                        set({ groupBy: { ...byTime, period: next as (typeof PERIODS)[number][0] } });
                    }}
                />
            )}
        </PopLine>
    );
}

/**
 * The "Window" line of a time group: the last N periods, ending at the newest date in the data or now.
 * @param props - Component props
 * @param props.args - the Graph value
 * @returns The line, or nothing without a time group
 */
function WindowLine({ args }: Readonly<{ args: CalcArgs }>): React.JSX.Element | null {
    const { graph, set } = args;
    const byTime = graph.groupBy?.by === "time" ? graph.groupBy : undefined;
    if (byTime === undefined) {
        return null;
    }
    const { window, ...rest } = byTime;
    return (
        <PopLine line="calc.window" name="Window" wide>
            <WordNumber
                label="Last"
                value={window?.last}
                unset="All"
                min={1}
                onWrite={(next) => {
                    const last = Math.round(next ?? 0);
                    set({ groupBy: last >= 1 ? { ...rest, window: { last, from: window?.from ?? "newest" } } : rest });
                }}
            />
            <Segments
                label="From"
                value={window?.from ?? "newest"}
                options={[
                    ["newest", "Newest"],
                    ["now", "Now"],
                ]}
                onPick={(next) => {
                    set({ groupBy: { ...rest, window: { last: window?.last ?? 12, from: next as "newest" | "now" } } });
                }}
            />
        </PopLine>
    );
}

/**
 * The Calculate pop-over's lines: see the file header.
 * @param props - Component props
 * @param props.session - the session
 * @param props.graph - the Graph value
 * @param props.put - writes the Graph value
 * @returns The lines
 */
export function CalculateLines({
    session,
    graph,
    put,
}: Readonly<{
    session: GraphSession;
    graph: GraphMeasure;
    put: (next: GraphMeasure) => void;
}>): React.JSX.Element {
    const args: CalcArgs = {
        session,
        graph,
        set: (patch) => {
            put(pruned({ ...graph, ...patch }));
        },
    };
    return (
        <>
            <div data-strip="">
                <PopLine line="calc.over" name={null}>
                    <Segments
                        label="Over"
                        value={graph.over}
                        options={[
                            ["edges", "Edges"],
                            ["neighbors", "Neighbors"],
                            ["members", "Members"],
                        ]}
                        onPick={(next) => {
                            put(walkingOver(graph, next as GraphMeasure["over"]));
                        }}
                    />
                </PopLine>
            </div>
            <DirectionLine args={args} />
            <WhereLine args={args} />
            <MeasureLine args={args} />
            <GroupLine args={args} />
            <WindowLine args={args} />
        </>
    );
}

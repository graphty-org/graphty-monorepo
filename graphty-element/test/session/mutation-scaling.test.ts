/**
 * @file Counted-work scaling of the session's mutating methods: each runs on a graph of n and of
 * 4n nodes, and the elements it visits (Map, Set and Array iterator steps and array scans, see
 * `visitsDuring`) may grow no faster than the method's own reach. A method that touches every node
 * may grow 4x, never 16x; a method that touches one record may grow at most 2x. Counted, never timed.
 *
 * The sessions are built with strict state off, as a consumer's are: the strict checks every other
 * test runs under walk the whole history on every write by design, and would be counted here.
 */

import { describe, it } from "vitest";

import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { edgeSpaceOf } from "../../src/session/scope/ScopeApi";
import type { GraphSession } from "../../src/session/types";
import { assertScalesLinearly, type Growth, visitsDuring } from "../helpers/cost";
import { makeSession } from "./helpers";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [200, 800] as const;

/**
 * An executor that publishes a partition of every node of a path session into five groups.
 * @param size - The node count.
 * @returns The executor.
 */
function partitionOf(size: number): (context: RunExecutionContext) => Promise<RunOutcome> {
    return (context) =>
        Promise.resolve({
            result: createRunResult({
                runId: context.runId,
                shape: "community",
                fields: [
                    {
                        name: "group",
                        plainName: "Group",
                        technicalName: "community",
                        kind: "node",
                        type: "integer",
                        path: `results.${context.runId}.group`,
                    },
                ],
                measured: { nodes: size, edges: size - 1 },
                nodes: ids(size).map((id, at) => ({ id, values: { group: at % 5 } })),
                caveats: {
                    exact: true,
                    direction: "as-loaded",
                    precision: "f64",
                    method: "louvain",
                    facts: [],
                    notes: [],
                },
                durationMs: 1,
            }),
        });
}

/**
 * A session over a path of `size` nodes, each with a weight and one of five groups, whose runs
 * publish that partition. Strict state is off, as it is for a consumer.
 * @param size - The node count.
 * @returns The session.
 */
function pathSession(size: number): GraphSession {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    const strict = scope.__GRAPHTY_STRICT_STATE__;
    scope.__GRAPHTY_STRICT_STATE__ = false;
    try {
        const harness = makeSession({ runs: { execute: partitionOf(size) } });
        const nodes = ids(size).map((id, at) => ({ id, weight: at, group: at % 5 }));
        const edges = nodes.slice(1).map((node, at) => ({ src: `n${String(at)}`, dst: node.id, w: at }));
        harness.add(nodes, edges);
        return harness.session;
    } finally {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    }
}

/**
 * Every node id of a path session.
 * @param size - The node count.
 * @returns The ids.
 */
function ids(size: number): string[] {
    return Array.from({ length: size }, (_, at) => `n${String(at)}`);
}

/**
 * Every edge id of a session.
 * @param session - The session.
 * @returns The ids.
 */
function edgeIds(session: GraphSession): string[] {
    const snapshot = session.data.snapshot();
    const space = edgeSpaceOf(snapshot);
    return Array.from({ length: snapshot.edgeCount }, (_, edge) => space.idOf(edge));
}

/** One method under test: what to set up, and the call whose work is counted. */
interface Case {
    /** `Owner.method`, as the cost-coverage registry spells it. */
    readonly method: string;
    /** `linear` when the call reaches every node, `constant` when it reaches one record. */
    readonly growth: Growth;
    /**
     * The issue recording that the method does more work than its reach today. Its test is
     * expected to fail until the issue is fixed, and the method stays out of the registry.
     */
    readonly superlinear?: number;
    /**
     * Build the state the call needs and return the call.
     * @param session - A fresh session over a path of `size` nodes.
     * @param size - The node count.
     * @returns The call to count.
     */
    prepare(session: GraphSession, size: number): Promise<() => unknown>;
}

const RED = "#ff0000";
const BLUE = "#0000ff";

/**
 * A fixed set holding every node.
 * @param session - The session.
 * @param size - The node count.
 * @param name - Its name.
 * @returns Its id.
 */
function everyNodeSet(session: GraphSession, size: number, name = "All"): string {
    return session.sets.create({ kind: "fixed", nodes: ids(size), reading: "induced" }, { name });
}

/**
 * A layer painting every node red.
 * @param session - The session.
 * @param name - Its name.
 * @returns Its id.
 */
async function everyNodeLayer(session: GraphSession, name = "Red"): Promise<string> {
    const layer = await session.styles.add({ name, selector: { match: "everything" }, set: { "node.color": RED } });
    await session.styles.settled();
    return layer.id;
}

/**
 * A layer coloring every node by its group.
 * @param session - The session.
 * @returns Its id.
 */
async function groupLayer(session: GraphSession): Promise<string> {
    const layer = await session.styles.add({
        name: "Groups",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.group" } },
    });
    await session.styles.settled();
    return layer.id;
}

const CASES: readonly Case[] = [
    // Sets
    {
        method: "SetsApi.create",
        growth: "linear",
        prepare: (session, size) => Promise.resolve(() => everyNodeSet(session, size)),
    },
    {
        method: "SetsApi.addMembers",
        growth: "linear",
        prepare: (session, size) => {
            const id = session.sets.create({ kind: "fixed", nodes: ids(size - 1), reading: "induced" }, { name: "A" });
            return Promise.resolve(() => session.sets.addMembers(id, { nodes: [`n${String(size - 1)}`] }));
        },
    },
    {
        method: "SetsApi.removeMembers",
        growth: "linear",
        prepare: (session, size) => {
            const id = everyNodeSet(session, size);
            return Promise.resolve(() => session.sets.removeMembers(id, { nodes: ["n0"] }));
        },
    },
    {
        method: "SetsApi.rename",
        growth: "linear",
        prepare: (session, size) => {
            const id = everyNodeSet(session, size);
            return Promise.resolve(() => session.sets.rename(id, "Renamed"));
        },
    },
    {
        method: "SetsApi.redefine",
        growth: "linear",
        prepare: (session, size) => {
            const id = everyNodeSet(session, size);
            const half = ids(size).filter((_, at) => at % 2 === 0);
            return Promise.resolve(() => session.sets.redefine(id, { kind: "fixed", nodes: half, reading: "induced" }));
        },
    },
    {
        method: "SetsApi.remove",
        growth: "linear",
        prepare: (session, size) => {
            const id = everyNodeSet(session, size);
            return Promise.resolve(() => session.sets.remove(id));
        },
    },
    {
        method: "SetsApi.restore",
        growth: "linear",
        prepare: (session, size) => {
            const id = everyNodeSet(session, size);
            // A set something still names keeps its record when removed, so it can come back.
            session.sets.create({ kind: "rule", where: { kind: "member", of: { set: id } }, reading: "induced" });
            session.sets.remove(id);
            return Promise.resolve(() => session.sets.restore(id));
        },
    },
    {
        method: "SetsApi.combine",
        growth: "linear",
        prepare: (session, size) => {
            const a = everyNodeSet(session, size, "A");
            const b = session.sets.create({ kind: "fixed", nodes: ["n0"], reading: "induced" }, { name: "B" });
            return Promise.resolve(() => session.sets.combine("union", [{ set: a }, { set: b }]));
        },
    },
    {
        method: "SetsApi.createFrom",
        growth: "linear",
        prepare: async (session, size) => {
            await session.selection.apply({ nodes: ids(size) });
            return () => session.sets.createFrom("selection", { name: "Picked" });
        },
    },
    {
        method: "SetsApi.createPath",
        growth: "linear",
        prepare: async (session) => {
            await session.selection.apply({ edges: edgeIds(session) });
            return () => session.sets.createPath("selection", { name: "Route" });
        },
    },
    // Selection
    {
        method: "SelectionApi.apply",
        growth: "linear",
        prepare: (session, size) => Promise.resolve(() => session.selection.apply({ nodes: ids(size) })),
    },
    {
        method: "SelectionApi.clear",
        growth: "linear",
        prepare: async (session, size) => {
            await session.selection.apply({ nodes: ids(size) });
            return () => session.selection.clear();
        },
    },
    {
        method: "SelectionApi.promote",
        growth: "linear",
        prepare: async (session, size) => {
            await session.selection.apply({ nodes: ids(size) });
            return () => session.selection.promote("Picked");
        },
    },
    // Styles
    {
        method: "StylesApi.add",
        growth: "linear",
        prepare: (session) =>
            Promise.resolve(async () => {
                await everyNodeLayer(session);
            }),
    },
    {
        method: "StylesApi.update",
        growth: "linear",
        prepare: async (session) => {
            const id = await everyNodeLayer(session);
            return async () => {
                await session.styles.update(id, { set: { "node.color": BLUE } });
                await session.styles.settled();
            };
        },
    },
    {
        method: "StylesApi.remove",
        growth: "linear",
        prepare: async (session) => {
            const id = await everyNodeLayer(session);
            return async () => {
                await session.styles.remove(id);
                await session.styles.settled();
            };
        },
    },
    {
        method: "StylesApi.move",
        growth: "linear",
        prepare: async (session) => {
            const first = await everyNodeLayer(session, "First");
            await everyNodeLayer(session, "Second");
            return async () => {
                await session.styles.move(first, null);
                await session.styles.settled();
            };
        },
    },
    {
        method: "StylesApi.removeBySource",
        growth: "linear",
        prepare: async (session) => {
            await everyNodeLayer(session, "First");
            await everyNodeLayer(session, "Second");
            return async () => {
                await session.styles.removeBySource((source) => source.by === "user");
                await session.styles.settled();
            };
        },
    },
    {
        method: "StylesApi.encode",
        growth: "linear",
        prepare: async (session) => {
            const run = await session.runs.start("louvain", {}, { style: false });
            return async () => {
                await session.styles.encode({ run: run.runId, channel: "node.color" });
                await session.styles.settled();
            };
        },
    },
    {
        method: "StylesApi.resolveToStatic",
        growth: "linear",
        prepare: async (session) => {
            const id = await groupLayer(session);
            return async () => {
                await session.styles.resolveToStatic(id, "node.color");
                await session.styles.settled();
            };
        },
    },
    {
        method: "StylesApi.setValueHidden",
        growth: "linear",
        prepare: async (session) => {
            const id = await groupLayer(session);
            return async () => {
                await session.styles.setValueHidden(id, "node.color", 2, true);
                await session.styles.settled();
            };
        },
    },
    {
        method: "StylesApi.applyTemplate",
        growth: "linear",
        prepare: async (session) => {
            await everyNodeLayer(session);
            await groupLayer(session);
            const document = session.styles.toDocument();
            return async () => {
                await session.styles.applyTemplate(document);
                await session.styles.settled();
            };
        },
    },
    // Notes: one note per node, so a write that walks every note grows with the graph. The write
    // itself no longer does (#1890, test/session/notes/scaling.test.ts); what still grows here is
    // the history re-charge after it (#1891, one step per note added) and the derivation pass's
    // copy of the notes slice (#1906).
    {
        method: "NotesApi.update",
        growth: "constant",
        superlinear: 1891,
        prepare: (session, size) => {
            const notes = ids(size).map((node) => session.notes.add({ text: node, targets: [{ node }] }));
            return Promise.resolve(() => session.notes.update(notes[0], { text: "edited" }));
        },
    },
    {
        method: "NotesApi.remove",
        growth: "constant",
        superlinear: 1891,
        prepare: (session, size) => {
            const notes = ids(size).map((node) => session.notes.add({ text: node, targets: [{ node }] }));
            return Promise.resolve(() => session.notes.remove(notes[0]));
        },
    },
    {
        method: "NotesApi.mergeDocument",
        growth: "linear",
        prepare: (session, size) => {
            const source = pathSession(size);
            for (const node of ids(size)) {
                source.notes.add({ text: node, targets: [{ node }] });
            }

            const document = source.notes.toDocument();
            source.dispose();
            return Promise.resolve(() => session.notes.mergeDocument(document));
        },
    },
    // Data
    {
        method: "SessionDataApi.updateNodes",
        growth: "linear",
        prepare: async (session, size) => {
            await everyNodeLayer(session);
            const updates = ids(size).map((id, at) => ({ id, values: { weight: at + 1 } }));
            return async () => {
                await session.data.updateNodes(updates);
                await session.styles.settled();
            };
        },
    },
    {
        method: "SessionDataApi.updateEdges",
        growth: "linear",
        prepare: (session) => {
            const updates = edgeIds(session).map((id, at) => ({ id, values: { w: at + 1 } }));
            return Promise.resolve(() => session.data.updateEdges(updates));
        },
    },
    {
        method: "SessionDataApi.removeEdges",
        growth: "linear",
        prepare: (session) => {
            const edges = edgeIds(session);
            return Promise.resolve(() => session.data.removeEdges(edges));
        },
    },
    {
        method: "SessionDataApi.declare",
        growth: "linear",
        prepare: (session) =>
            Promise.resolve(() =>
                session.data.declare({ kind: "node", name: "group" }, { measurement: "categorical" }),
            ),
    },
    // Visibility, scope and settings
    {
        method: "VisibilityApi.set",
        growth: "linear",
        prepare: (session) => Promise.resolve(() => session.visibility.set({ kind: "degree", min: 2 })),
    },
    {
        method: "VisibilityApi.setWindow",
        growth: "linear",
        prepare: (session, size) =>
            Promise.resolve(() => session.visibility.setWindow({ attribute: "data.weight", from: 0, to: size / 2 })),
    },
    {
        method: "ScopeApi.save",
        growth: "linear",
        prepare: (session, size) => Promise.resolve(() => session.scope.save("Half", { nodes: ids(size / 2) })),
    },
    {
        method: "ScopeApi.remove",
        growth: "linear",
        prepare: (session, size) => {
            const id = session.scope.save("Half", { nodes: ids(size / 2) });
            return Promise.resolve(() => session.scope.remove(id));
        },
    },
    {
        method: "SessionConfig.set",
        growth: "linear",
        prepare: async (session) => {
            await everyNodeLayer(session);
            return async () => {
                await session.config.set({ data: { knownFields: { nodeLabelPath: "group" } } });
                await session.styles.settled();
            };
        },
    },
];

describe("the session's mutating methods do work in proportion to their reach", () => {
    for (const { method, growth, superlinear, prepare } of CASES) {
        const reach = growth === "linear" ? "no more than linear in the graph" : "about the same at any size";
        // A method with an open superlinear issue is expected to fail, so the fix turns it green.
        const test = superlinear === undefined ? it : it.fails;
        test(`${method}: ${reach}${superlinear === undefined ? "" : ` (not yet: #${String(superlinear)})`}`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const session = pathSession(size);
                    const call = await prepare(session, size);
                    const visits = await visitsDuring(call);
                    session.dispose();
                    return visits;
                },
                { sizes: SIZES, growth, counter: `elements visited by ${method}` },
            );
        });
    }
});

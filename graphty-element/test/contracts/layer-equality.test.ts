/**
 * @file Every style layer takes every operation, whoever made it.
 *
 * The owner's rule (2026-11-05): "any layer may be deleted or modified in any way. there are NO
 * SPECIAL LAYER." This test builds each way a project gets layers, enumerates every layer that
 * exists afterward from `styles.list()`, and runs one table of operations on each. A layer is never
 * picked by name or from a hand list, so a new default layer is covered the day it appears.
 *
 * An operation that fails on a layer must be listed in the `layerOperations` section of
 * `graphty/special-layers-baseline.json`, which `tools/check-special-layers.mjs` lets only shrink. A
 * listed one that now works, or whose layer no project holds any more, fails here too, so the list cannot go stale.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import type { Channel, StyleDocument } from "../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../src/session";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { Layer } from "../../src/session/styles";
import type { StyleRow } from "../../src/session/styles/tree";

const BASELINE = JSON.parse(
    readFileSync(new URL("../../../graphty/special-layers-baseline.json", import.meta.url), "utf8"),
) as { layerOperations: readonly { layer: string; operation: string }[] };

const NODE_IDS = [1, 2, 3, 4];

/** A run of any algorithm: a group per node, which suggests a color per group. */
async function communities(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    return {
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
            measured: { nodes: NODE_IDS.length, edges: 0 },
            nodes: NODE_IDS.map((id, at) => ({ id, values: { group: at % 2 } })),
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "louvain", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/** A new project with a small graph, before anything turns its layers on. */
async function newProject(): Promise<GraphSession> {
    const session = createGraphSession({ runs: { execute: communities }, features: ["timeline"] });
    await session.data.addNodes(NODE_IDS.map((id) => ({ id, step: id, ...(id === 1 ? { only: true } : {}) })));
    await session.data.addEdges([
        { source: 1, target: 2, step: 1, only: true },
        { source: 2, target: 3, step: 2 },
        { source: 3, target: 4, step: 3 },
    ]);
    return session;
}

/** A new project with every starting row a setting can bring. */
async function startingRowsOn(): Promise<GraphSession> {
    const session = await newProject();
    await session.config.set({ startingRows: true, editableBase: true });
    return session;
}

/** A template somebody wrote: a node layer and an edge layer. */
const WRITTEN_TEMPLATE: StyleDocument = {
    version: 1,
    layers: [
        { name: "Template nodes", target: "node", selector: { match: "everything" }, set: { "node.color": "#123456" } },
        { name: "Template edges", target: "edge", selector: { match: "everything" }, set: { "edge.color": "#654321" } },
    ],
};

/** Each way a project comes to hold layers. */
const SCENARIOS: readonly { readonly name: string; readonly build: () => Promise<GraphSession> }[] = [
    { name: "a new project with the starting rows off", build: newProject },
    { name: "a new project with the starting rows on", build: startingRowsOn },
    {
        name: "a new project with every optional starting row",
        build: async () => {
            const session = await startingRowsOn();
            await session.config.set({ pinnedStyle: { color: "#868e96", scale: 1.12, opacity: 1 } });
            await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });
            return session;
        },
    },
    {
        name: "a written template",
        build: async () => {
            const session = await newProject();
            await session.styles.applyTemplate(WRITTEN_TEMPLATE, { templateId: "written" });
            return session;
        },
    },
    {
        name: "the starting rows saved and applied as a template",
        build: async () => {
            const saved = (await startingRowsOn()).styles.toDocument();
            const session = await newProject();
            await session.styles.applyTemplate(saved, { templateId: "saved" });
            return session;
        },
    },
    {
        name: "a saved project opened again",
        build: async () => {
            const { text } = await (await startingRowsOn()).project.save();
            const session = createGraphSession({ runs: { execute: communities }, features: ["timeline"] });
            await session.project.open(text);
            return session;
        },
    },
    {
        name: "an algorithm's suggested styles",
        build: async () => {
            const session = await startingRowsOn();
            await session.runs.start("louvain", {});
            await session.styles.settled();
            return session;
        },
    },
];

/** Finds a row in the tree, with its neighbors. */
function place(
    session: GraphSession,
    id: string,
): { row: StyleRow; siblings: readonly StyleRow[]; at: number; parent: string | null } | undefined {
    const walk = (rows: readonly StyleRow[], parent: string | null): ReturnType<typeof place> => {
        for (const [at, row] of rows.entries()) {
            if (row.id === id) {
                return { row, siblings: rows, at, parent };
            }
            const inner = walk(row.children, row.id);
            if (inner !== undefined) {
                return inner;
            }
        }
        return undefined;
    };
    return walk(session.styles.tree(), null);
}

/** The row a layer is drawn in. */
function rowOf(layer: Layer): string {
    return layer.row ?? layer.id;
}

/** Everything the operations change, to compare before and after an undo. */
function snapshot(session: GraphSession): string {
    return JSON.stringify({ layers: session.styles.list(), tree: session.styles.tree() });
}

/** A selector matching one node and one edge, so one element of either kind a layer paints. */
const NARROWER: Layer["selector"] = { match: "has", path: "data.only" };

/** A channel of a layer's kind that an encoding of the layer does not already write. */
function channel(layer: Layer): Channel {
    const unused: readonly Channel[] = [
        `${layer.target}.color`,
        layer.target === "node" ? "node.haloColor" : "edge.bandColor",
    ];
    return unused.find((each) => layer.encode?.[each] === undefined) ?? unused[0];
}

interface Operation {
    readonly name: string;
    /** Does it. A rejection means the operation failed. */
    readonly run: (session: GraphSession, layer: Layer) => PromiseLike<unknown>;
    /** Whether it did what it does on a caller's layer; a failure names what is wrong. */
    readonly effect: (session: GraphSession, layer: Layer) => void;
}

/**
 * A move to one end of the unpinned rows, after taking off any pin: a pin holds a row in its band,
 * and any row can be unpinned.
 */
function move(name: string, end: "first" | "last"): Operation {
    let target = 0;
    return {
        name,
        run: async (session, layer) => {
            const id = rowOf(layer);
            assert.isDefined(place(session, id), "the layer has a row");
            await session.styles.pinRow(id, "none");
            const found = place(session, id);
            assert.isDefined(found);
            const free = [...found.siblings.entries()].filter(([, row]) => row.pin === "none").map(([at]) => at);
            target = end === "first" ? free[0] : free[free.length - 1];
            await session.styles.moveRow(id, { index: target, parent: found.parent });
        },
        effect: (session, layer) => {
            assert.strictEqual(place(session, rowOf(layer))?.at, target, "the row moved");
        },
    };
}

/** The operations every layer takes. */
const OPERATIONS: readonly Operation[] = [
    {
        name: "remove",
        run: (session, layer) => session.styles.remove(layer.id),
        effect: (session, layer) => {
            assert.isUndefined(session.styles.get(layer.id), "the layer is gone");
        },
    },
    {
        name: "delete row",
        run: (session, layer) => session.styles.deleteRow(rowOf(layer)),
        effect: (session, layer) => {
            assert.isUndefined(session.styles.get(layer.id), "the layer is gone");
            assert.isUndefined(place(session, rowOf(layer)), "the row is gone");
        },
    },
    {
        name: "rename",
        run: (session, layer) => session.styles.renameRow(rowOf(layer), "Renamed"),
        effect: (session, layer) => {
            assert.strictEqual(session.styles.get(layer.id)?.name, "Renamed");
            assert.strictEqual(place(session, rowOf(layer))?.row.name, "Renamed");
        },
    },
    move("move up", "first"),
    move("move down", "last"),
    {
        name: "hide",
        run: (session, layer) => session.styles.hideRow(rowOf(layer), true),
        effect: (session, layer) => {
            assert.isTrue(place(session, rowOf(layer))?.row.hidden, "the row is hidden");
            assert.deepStrictEqual(
                Object.values(session.styles.counts(layer.id).painted).filter((count) => count !== 0),
                [],
                "a hidden layer paints nothing",
            );
        },
    },
    {
        name: "lock",
        run: (session, layer) => session.styles.lockRow(rowOf(layer), true),
        effect: (session, layer) => {
            assert.isTrue(place(session, rowOf(layer))?.row.locked, "the row is locked");
        },
    },
    {
        name: "narrow selection",
        run: (session, layer) => session.styles.update(layer.id, { selector: NARROWER }),
        effect: (session, layer) => {
            assert.deepStrictEqual(session.styles.get(layer.id)?.selector, NARROWER);
            assert.strictEqual(session.styles.counts(layer.id).matched, 1, "the layer matches the one element");
        },
    },
    {
        name: "add property",
        run: (session, layer) =>
            session.styles.update(layer.id, { set: { ...layer.set, [channel(layer)]: "#010203" } }),
        effect: (session, layer) => {
            assert.strictEqual(session.styles.get(layer.id)?.set?.[channel(layer)], "#010203");
        },
    },
    {
        name: "change property",
        run: async (session, layer) => {
            await session.styles.update(layer.id, { set: { ...layer.set, [channel(layer)]: "#010203" } });
            await session.styles.update(layer.id, { set: { ...layer.set, [channel(layer)]: "#040506" } });
        },
        effect: (session, layer) => {
            assert.strictEqual(session.styles.get(layer.id)?.set?.[channel(layer)], "#040506");
        },
    },
];

/** Who a layer's source says made it, without the ids of one run. */
function origin(layer: Layer): string {
    const { source } = layer;
    switch (source.by) {
        case "element":
            return `element:${source.reason}`;
        case "template":
            return `template:${source.templateId}`;
        case "run":
            return `run:${source.algorithm}`;
        case "plugin":
            return `plugin:${source.name}`;
        default:
            return source.by;
    }
}

/** A layer's name in the baseline. */
function keyOf(layer: Layer): string {
    return `${origin(layer)}/${layer.name}/${layer.target}`;
}

/**
 * Runs one operation on one layer of a fresh project, then undoes it.
 * @returns What went wrong: `[operation]` or `[operation + " undo"]`, or nothing.
 */
async function attempt(
    build: () => Promise<GraphSession>,
    at: number,
    operation: Operation,
): Promise<{ operation: string; why: string } | undefined> {
    const session = await withCallerLayers(build);
    const layer = session.styles.list()[at];
    const before = snapshot(session);
    const steps = session.history.position;
    try {
        await operation.run(session, layer);
        await session.styles.settled();
        operation.effect(session, layer);
    } catch (error) {
        return { operation: operation.name, why: String(error) };
    }
    try {
        while (session.history.position > steps) {
            await session.undo();
        }
        await session.styles.settled();
        assert.strictEqual(snapshot(session), before, "undo puts everything back");
    } catch (error) {
        return { operation: `${operation.name} undo`, why: String(error) };
    }
    return undefined;
}

/** A scenario with two layers of the caller's own, which every operation must work on. */
async function withCallerLayers(build: () => Promise<GraphSession>): Promise<GraphSession> {
    const session = await build();
    await session.styles.add({
        name: "Caller node",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#abcdef" },
    });
    await session.styles.add({
        name: "Caller edge",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#abcdef" },
    });
    await session.styles.settled();
    return session;
}

describe("every layer takes every operation", () => {
    it("matches the baseline exactly", async () => {
        const failures = new Map<string, string>();
        const visited = new Set<string>();
        for (const scenario of SCENARIOS) {
            const layers = (await withCallerLayers(scenario.build)).styles.list();
            for (const [at, layer] of layers.entries()) {
                visited.add(keyOf(layer));
                for (const operation of OPERATIONS) {
                    const failure = await attempt(scenario.build, at, operation);
                    if (failure !== undefined) {
                        failures.set(`${keyOf(layer)} | ${failure.operation}`, `${scenario.name}: ${failure.why}`);
                    }
                }
            }
        }
        assert.includeMembers([...visited], ["user/Caller node/node", "user/Caller edge/edge"]);
        const listed = new Set(BASELINE.layerOperations.map(({ layer, operation }) => `${layer} | ${operation}`));
        assert.deepEqual(
            [...failures].filter(([key]) => !listed.has(key)),
            [],
            "a layer refused an operation a caller's layer takes (issue #5905): fix it, the baseline only shrinks",
        );
        assert.deepEqual(
            [...listed].filter((key) => !failures.has(key)),
            [],
            "the operation works now: delete this from graphty/special-layers-baseline.json",
        );
    });
});

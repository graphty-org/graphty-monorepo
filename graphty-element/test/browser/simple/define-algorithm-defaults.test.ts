/**
 * @file What `defineAlgorithm` fills in for a run, on a real `<graphty-element>`: the results a
 * simple node score publishes against the element's own built-in degree, the caveats built from
 * `note`, `converged` and `weights`, the warnings of simple-tier.md section 2.4 items 7 and 8, and
 * cancellation through `progress`.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { defineAlgorithm, type GraphtyError, isGraphtyError } from "../../../extend";
import type { Graphty } from "../../../index";
import type { GraphSession } from "../../../session";
import { operationQueueOf } from "../../../src/Graph";

/** A triangle a-b-c with a tail c-d, a pair e-f, and a node with no edges. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }, { id: "f" }, { id: "lone" }];
const EDGES = [
    { source: "a", target: "b", confidence: 0.9 },
    { source: "b", target: "c", confidence: 0.5 },
    { source: "c", target: "a", confidence: 0.4 },
    { source: "c", target: "d", confidence: 0.2 },
    { source: "e", target: "f", confidence: 0.7 },
];

let element: Graphty;

beforeEach(async () => {
    element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    element.nodeData = NODES;
    element.edgeData = EDGES;
    await operationQueueOf(element.graph).waitForCompletion();
});

afterEach(() => {
    element.remove();
});

/**
 * The session behind the element.
 * @returns The session.
 */
function session(): GraphSession {
    return element.graph.getSession();
}

/**
 * What a promise rejected with.
 * @param work - The promise.
 * @returns The error.
 */
async function rejection(work: PromiseLike<unknown>): Promise<unknown> {
    try {
        await work;
    } catch (error) {
        return error;
    }

    return assert.fail("the run did not fail");
}

describe("a simple node score publishes exactly what a built-in does", () => {
    it("matches the built-in degree value, rank and percentile on every node", async () => {
        defineAlgorithm({ id: "acme-degree", node: (node) => node.degree });

        const simple = await element.run("acme-degree", {}, { as: "simple-degree" });
        const builtIn = await element.run("degree", {}, { as: "built-in-degree" });

        assert.strictEqual(simple.node("c")?.value, 3, "c touches three edges");
        for (const { id } of NODES) {
            const mine = simple.node(id);
            const theirs = builtIn.node(id);
            assert.strictEqual(mine?.value, theirs?.value, `value of ${id}`);
            assert.strictEqual(mine?.rank, theirs?.rank, `rank of ${id}`);
            assert.strictEqual(mine?.percentile, theirs?.percentile, `percentile of ${id}`);
        }
        assert.strictEqual(
            session().results.get("simple-degree")?.graph.mean,
            session().results.get("built-in-degree")?.graph.mean,
        );
    });
});

describe("the caveats a run is filled in with", () => {
    it("carries the author's notes, how an iteration ended, and what the weights mean", async () => {
        defineAlgorithm({
            id: "acme-settle",
            options: { strength: { type: "attribute", on: "edge", default: "confidence" } },
            weights: { option: "strength", meaning: "strength" },
            nodes: (graph, { options, note, converged }) => {
                note("Every node starts at 1.");
                converged(false, 7);
                return new Map(graph.nodes().map((node) => [node.id, 1 + node.strength(options.strength)]));
            },
        });

        const run = element.run("acme-settle");
        await run;

        assert.include(run.caveats.notes, "Every node starts at 1.");
        assert.strictEqual(run.caveats.method, "Acme settle");
        assert.strictEqual(run.caveats.direction, "undirected");
        assert.deepEqual(run.caveats.weight, { attribute: "confidence", meaning: "strength" });
        assert.isFalse(run.caveats.converged);
        assert.strictEqual(run.caveats.iterations, 7);
        assert.isFalse(run.caveats.exact, "stopping at the cap publishes what the run has, marked inexact");
        assert.strictEqual(run.caveats.partialReason, "iteration cap reached");
        assert.isTrue(run.partial, "a result that stopped at its cap is partial, as its caveats say (#933)");
    });

    it("warns when nothing was measured", async () => {
        defineAlgorithm({ id: "acme-silent", edge: () => Number.NaN });

        const run = element.run("acme-silent");
        await run;

        assert.include(
            run.caveats.notes,
            "acme-silent: no edge was measured -- did the function return NaN or undefined for every edge?",
        );
    });
});

describe("a map keyed by the wrong ids", () => {
    it("is refused when no key is a node", async () => {
        defineAlgorithm({
            id: "acme-numbered",
            nodes: () =>
                new Map([
                    [1, 1],
                    [2, 2],
                ]),
        });

        const error = await rejection(element.run("acme-numbered"));

        assert.isTrue(isGraphtyError(error));
        assert.strictEqual((error as GraphtyError).code, "E_EXTENSION_FAILED");
        assert.include((error as GraphtyError).message, "no key matches a node id (got 1; node ids here are strings)");
    });

    it("keeps the nodes and names the keys that are not nodes", async () => {
        defineAlgorithm({
            id: "acme-partial",
            groups: () =>
                new Map<string, number>([
                    ["a", 1],
                    ["b", 1],
                    ["zz", 2],
                ]),
        });

        const run = element.run("acme-partial", {}, { as: "partial" });
        const result = await run;

        assert.strictEqual(result.node("a")?.group, 1);
        assert.isUndefined(result.node("c"), "a node the map left out is in no group");
        assert.include(
            run.caveats.notes,
            'acme-partial: groups() returned values for 1 keys that are not nodes ("zz"); they were left out.',
        );
    });
});

describe("cancelling a whole-graph function", () => {
    it("stops the author's loop at its next progress call, as a cancel and not as a failure", async () => {
        let stopped = false;
        let started: () => void = () => undefined;
        const running = new Promise<void>((resolve) => {
            started = resolve;
        });
        defineAlgorithm({
            id: "acme-endless",
            nodes: async (_graph, { progress }) => {
                started();
                try {
                    for (;;) {
                        await progress(0.5);
                    }
                } finally {
                    stopped = true;
                }
            },
        });

        const run = element.run("acme-endless");
        await running;
        run.cancel("the reader pressed Stop");
        const error = await rejection(run);

        assert.instanceOf(error, DOMException);
        assert.strictEqual(error.name, "AbortError");
        assert.strictEqual(run.status, "canceled");
        const deadline = Date.now() + 5000;
        while (!stopped && Date.now() < deadline) {
            await new Promise((settle) => setTimeout(settle, 10));
        }
        assert.isTrue(stopped, "the author's own loop unwound");
    });
});

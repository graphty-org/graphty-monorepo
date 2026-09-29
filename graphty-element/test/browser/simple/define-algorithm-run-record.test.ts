/**
 * @file What a simple algorithm's run record says about the run, on a real `<graphty-element>`:
 * which weight the numbers used (the attribute the code READ, declared or not), every attribute
 * the run read, a function that held the page, a function that returned the wrong kind of value,
 * and a graph with parallel edges and self-loops -- which the graph view keeps as they are, so
 * no merge is reported and the view's degree is its own, documented, number.
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { defineAlgorithm, type GraphtyError, isGraphtyError } from "../../../extend";
import type { Graphty } from "../../../index";
import { operationQueueOf } from "../../../src/Graph";

/**
 * a-b twice (parallel), b-a once more the other way, a self-loop on a, c-b; every edge carries
 * `conf`, and the node `x` has no edge at all.
 */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "x" }];
const EDGES = [
    { source: "a", target: "b", conf: 2 },
    { source: "a", target: "b", conf: 3 },
    { source: "b", target: "a", conf: 1 },
    { source: "a", target: "a", conf: 4 },
    { source: "c", target: "b", conf: 5 },
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
 * What a promise rejected with, asserted to be a GraphtyError.
 * @param work - The promise.
 * @returns The error.
 */
async function rejection(work: PromiseLike<unknown>): Promise<GraphtyError> {
    try {
        await work;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `a GraphtyError, not ${String(error)}`);
        return error as GraphtyError;
    }

    return assert.fail("the run did not fail");
}

describe("the weight a run records is the one it read", () => {
    it("records the attribute read through strength() when no weights member is declared", async () => {
        defineAlgorithm({
            id: "acme-read-weight",
            options: { weight: { type: "attribute", on: "edge", default: null } },
            node: (node, { options }) => node.strength(options.weight),
        });

        const run = element.run("acme-read-weight", { weight: "conf" });
        await run;

        assert.deepEqual(run.caveats.weight, { attribute: "conf", meaning: "strength" });
        assert.include(run.caveats.notes, 'acme-read-weight read: edge "conf".');
    });

    it("records no weight when the declared weight was never read", async () => {
        defineAlgorithm({
            id: "acme-unread-weight",
            options: { weight: { type: "attribute", on: "edge", default: "conf" } },
            weights: { option: "weight", meaning: "distance" },
            node: (node) => node.degree,
        });

        const run = element.run("acme-unread-weight");
        await run;

        assert.isNull(run.caveats.weight);
    });

    it("keeps the declared meaning for the weight it read", async () => {
        defineAlgorithm({
            id: "acme-distance",
            options: { weight: { type: "attribute", on: "edge", default: "conf" } },
            weights: { option: "weight", meaning: "distance" },
            edge: (edge, { options }) => edge.weight(options.weight),
        });

        const run = element.run("acme-distance");
        await run;

        assert.deepEqual(run.caveats.weight, { attribute: "conf", meaning: "distance" });
    });

    it("lists a path written in the code as an input", async () => {
        defineAlgorithm({ id: "acme-fixed-path", edge: (edge) => edge.number("conf") });

        const run = element.run("acme-fixed-path");
        await run;

        assert.include(run.caveats.notes, 'acme-fixed-path read: edge "conf".');
        assert.isNull(run.caveats.weight, "a number read is an attribute, not a weight");
    });
});

describe("a function that holds the page", () => {
    it("warns in the run record and on the console", async () => {
        const warned: unknown[] = [];
        const original = console.warn;
        console.warn = (...args: unknown[]) => warned.push(args.join(" "));
        try {
            defineAlgorithm({
                id: "acme-spin",
                nodes: (graph) => {
                    const until = performance.now() + 300;
                    while (performance.now() < until) {
                        // Spins without handing the page back.
                    }

                    return new Map(graph.nodes().map((node) => [node.id, 1]));
                },
            });

            const run = element.run("acme-spin");
            await run;

            const advice =
                "acme-spin: nodes() held the page for over 200 ms at a time; await context.progress(i / n) inside its loop.";
            assert.include(run.caveats.notes, advice);
            assert.include(warned, advice);
        } finally {
            console.warn = original;
        }
    });
});

describe("a function that returns the wrong kind of value", () => {
    it("refuses a node() that returns a Promise, saying so", async () => {
        defineAlgorithm({
            id: "acme-async-node",
            node: ((node: { degree: number }) => Promise.resolve(node.degree)) as never,
        });

        const error = await rejection(element.run("acme-async-node"));

        assert.strictEqual(error.code, "E_EXTENSION_FAILED");
        assert.include(error.message, 'acme-async-node: node() returned a Promise for node "a"');
    });

    it("names true and false as the mistake when groups() returns them", async () => {
        defineAlgorithm({
            id: "acme-flags",
            groups: ((graph: { nodes(): readonly { id: string; degree: number }[] }) =>
                new Map(graph.nodes().map((node) => [node.id, node.degree > 0]))) as never,
        });

        const run = element.run("acme-flags");
        await run;

        assert.include(
            run.caveats.notes,
            "acme-flags: groups() returned true or false for 4 nodes; a group is a number or a string, so they were left out.",
        );
    });
});

describe("parallel edges and self-loops", () => {
    it("reports no merge, because the view keeps every edge", async () => {
        defineAlgorithm({ id: "acme-count", node: (node) => node.degree });

        const run = element.run("acme-count");
        const result = await run;

        assert.isFalse(
            run.caveats.notes.some((note) => note.includes("merged")),
            `no merge note; the notes are ${JSON.stringify(run.caveats.notes)}`,
        );
        assert.strictEqual(result.node("b")?.value, 4, "b touches a-b twice, b-a and c-b");
    });

    it("counts a self-loop once and every parallel edge, unlike the built-in degree", async () => {
        defineAlgorithm({ id: "acme-view-degree", node: (node) => node.degree });

        const simple = await element.run("acme-view-degree", {}, { as: "view-degree" });
        const builtIn = await element.run("degree", {}, { as: "built-in-degree" });

        // a: a-b, a-b, b-a and the loop. The view counts four; the built-in counts the loop twice
        // and the repeated a-b once: 1 + 1 + 2.
        assert.strictEqual(simple.node("a")?.value, 4);
        assert.strictEqual(builtIn.node("a")?.value, 4);
        // b: a-b, a-b, b-a, c-b. The view counts four; the built-in merges the repeated a-b.
        assert.strictEqual(simple.node("b")?.value, 4);
        assert.strictEqual(builtIn.node("b")?.value, 3);
    });
});

describe("reading an edge score by its ends", () => {
    it("works as the guide shows, through the ranking and the session's edge records", async () => {
        defineAlgorithm({ id: "acme-conf", edge: (edge) => edge.number("conf") });

        const share = await element.run("acme-conf", {}, { as: "conf" });
        const byEnds: string[] = [];
        for (const { id, value } of share.ranking("value")) {
            const edge = element.session.data.edge(String(id));
            byEnds.push(`${String(edge?.source)}-${String(edge?.target)}:${String(value)}`);
        }

        assert.sameMembers(byEnds, ["a-b:2", "a-b:3", "b-a:1", "a-a:4", "c-b:5"]);
    });
});

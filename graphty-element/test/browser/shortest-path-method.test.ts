/**
 * @file The shortest path's method left unset: Dijkstra when every weight it reads is zero or
 * above, Bellman-Ford when one is negative, and the run's caveats name the method that ran.
 *
 * Without the switch, an unset method over a negative weight ran Dijkstra, whose relaxation never
 * ends on an undirected negative edge (a loop that costs less every time round) and froze the page.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * An element holding a small road map whose `km` column is a distance.
 * @param ab - The length of the a-b edge.
 * @returns the element
 */
async function roads(ab: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;

    const csv = ["from,to,km", `a,b,${String(ab)}`, "b,c,2", "a,c,5", "c,d,1"].join("\n");
    const draft = await element.session.data.prepare({ config: { file: new File([csv], "roads.csv") } });
    await draft.load({ mapping: { source: "from", target: "to", weight: "km", weightMeaning: "distance" } });

    return element;
}

/**
 * Run the shortest path from a to d and return the method its caveats name.
 * @param element - The element.
 * @param params - Extra parameters.
 * @returns `caveats.method`.
 */
async function methodOf(element: Graphty, params: Record<string, unknown> = {}): Promise<string> {
    const run = element.session.runs.start("shortest-path", { source: "a", target: "d", ...params });
    await run;
    assert.strictEqual(run.status, "succeeded");
    return run.caveats.method;
}

describe("the shortest path's method", () => {
    it(
        "left unset, is Dijkstra over weights of zero and above",
        async () => {
            assert.strictEqual(await methodOf(await roads(1)), "dijkstra");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "left unset, is Bellman-Ford when a weight is negative",
        async () => {
            assert.strictEqual(await methodOf(await roads(-1)), "bellman-ford");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "set, is the one asked for",
        async () => {
            assert.strictEqual(await methodOf(await roads(1), { method: "bellman-ford" }), "bellman-ford");
            assert.strictEqual(await methodOf(await roads(1), { method: "dijkstra" }), "dijkstra");
        },
        TEST_TIMEOUT_MS,
    );
});

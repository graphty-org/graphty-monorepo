/**
 * Browser coverage for the working graph's element wiring: the `working-graph` attribute Lit drives
 * from `attributeChangedCallback`, and the one derived-input cache the element's session and its
 * runs share. The mode and the view themselves are covered by
 * `test/session/working/working-graph.test.ts`.
 *
 * An unrecognised value must not throw from the setter (a throw during an upgrade leaves the
 * element unrendered): it keeps the mode it had and says so on the console.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { scopedInputCounters } from "../../src/algorithms/input/ScopedInput";

/** Containers mounted by a test, removed after it. */
const containers: HTMLDivElement[] = [];

/**
 * Mount an element from markup.
 * @param markup - The element's markup.
 * @returns The element.
 */
function mount(markup: string): Graphty {
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.appendChild(container);
    containers.push(container);

    return container.querySelector("graphty-element") as Graphty;
}

afterEach(() => {
    for (const container of containers.splice(0)) {
        container.remove();
    }

    vi.restoreAllMocks();
});

describe("the working-graph attribute", () => {
    test("sets the session's mode from markup, and reads back what the session holds", async () => {
        const element = mount(`<graphty-element working-graph="visible"></graphty-element>`);
        await element.updateComplete;

        assert.strictEqual(element.workingGraph, "visible");
        assert.strictEqual(element.session.config.workingGraph, "visible");

        element.workingGraph = "documented";
        await element.updateComplete;
        assert.strictEqual(element.session.config.workingGraph, "documented");
        assert.strictEqual(element.getAttribute("working-graph"), "documented");
    });

    test("keeps the mode it had for an unknown value, and reports it", async () => {
        const reported = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const element = mount(`<graphty-element working-graph="visible"></graphty-element>`);
        await element.updateComplete;

        element.setAttribute("working-graph", "everything");
        await element.updateComplete;

        assert.strictEqual(element.session.config.workingGraph, "visible");
        assert.isTrue(reported.mock.calls.some((call) => String(call[0]).includes("working-graph")));
    });

    test("a run over what is shown reads the view the session built, deriving nothing more", async () => {
        const element = mount(`<graphty-element working-graph="visible"></graphty-element>`);
        await element.updateComplete;
        const { session } = element;
        // Undirected and simple, so a run needs no orientation or merge step of its own.
        const nodes = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, kind: i < 8 ? "a" : "b" }));
        const edges = Array.from({ length: 11 }, (_, i) => ({ source: `n${String(i)}`, target: `n${String(i + 1)}` }));
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ directed: false, nodes, edges }) },
        });
        await session.visibility.set({ kind: "categories", attribute: "data.kind", values: ["a"] });
        assert.strictEqual(session.data.working().snapshot().nodeCount, 8);

        const before = scopedInputCounters.derivations;
        await session.runs.start("degree");

        assert.strictEqual(scopedInputCounters.derivations, before, "the run reused the view's induced subgraph");
    });
});

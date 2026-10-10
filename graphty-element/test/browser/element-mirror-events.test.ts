/**
 * @file The element events that had no document, no test and no story, and the note event.
 *
 * `<graphty-element>` mirrors four of its own facts onto the DOM. The node pointer events are
 * documented in the events guide and tested; `graphty-run-change`, `graphty-selection-change`
 * and `graphty-visibility-change` are dispatched by the element on every run, every selection
 * movement and every filter change, and were written down nowhere. An application that wanted a
 * progress bar, a selection readout or a "showing 1,204 of 50,000" line had to read the
 * element's source to find out the events existed.
 *
 * Each detail here is checked for being SERIALISABLE as well as for arriving, because that is
 * the rule these three mirrors exist to keep: a `CustomEvent` detail crosses to listeners that
 * may structure-clone it, so it carries ids and counts rather than render objects.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, test, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { ProgressChange } from "../../src/session";

/** Two nodes and the edge between them, as an inline JSON data source. */
const GRAPH = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ source: "a", target: "b" }],
});

let mounted: Graphty | null = null;

/**
 * Mount a graphty-element, load the graph into it and wait for both to settle.
 * @returns the element
 */
async function mountWithGraph(): Promise<Graphty> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const element = document.createElement("graphty-element");
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    container.appendChild(element);
    mounted = element;

    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    element.dataSource = "json";
    element.dataSourceConfig = { data: GRAPH };
    await element.waitForSettled();

    return element;
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("the element's own mirrors on the DOM", () => {
    test("graphty-selection-change arrives with the ids, and survives a structured clone", async () => {
        const element = await mountWithGraph();
        const seen: unknown[] = [];
        element.addEventListener("graphty-selection-change", (event) => {
            seen.push((event as CustomEvent).detail);
        });

        await element.session.selection.apply({ nodes: ["a"] });

        assert.strictEqual(seen.length, 1, "selecting a node told the DOM");
        assert.doesNotThrow(() => structuredClone(seen[0]), "the detail carries no render object");
    });

    test("graphty-visibility-change arrives with the counts", async () => {
        const element = await mountWithGraph();
        const seen: unknown[] = [];
        element.addEventListener("graphty-visibility-change", (event) => {
            seen.push((event as CustomEvent).detail);
        });

        element.session.visibility.showContext = true;
        await vi.waitFor(() => {
            assert.isNotEmpty(seen, "a visibility change told the DOM");
        });
        // Anything else the change set off has run, so a second event would have arrived.
        await element.waitForSettled();

        assert.strictEqual(seen.length, 1, "a visibility change told the DOM");
        assert.doesNotThrow(() => structuredClone(seen[0]), "the detail carries no render object");
    });

    test("graphty-run-change arrives as a run starts and ends", async () => {
        const element = await mountWithGraph();
        const phases: string[] = [];
        element.addEventListener("graphty-run-change", (event) => {
            phases.push((event as CustomEvent<{ phase: string }>).detail.phase);
        });

        await element.session.runs.start("degree");

        assert.include(phases, "start", "a run announced that it had started");
        assert.include(phases, "end", "and that it had finished");
    });

    test("graphty-progress-change arrives for a load, ends, and survives a structured clone", async () => {
        const element = await mountWithGraph();
        const seen: ProgressChange[] = [];
        element.addEventListener("graphty-progress-change", (event) => {
            seen.push(event.detail);
        });

        await element.session.data.import({ type: "json", config: { data: GRAPH } });

        assert.isTrue(seen.length > 0 && seen.every((change) => change.task === "load"), "the load told the DOM");
        assert.strictEqual(seen.at(-1)?.phase, "end", "the last event says the load ended");
        assert.deepInclude(
            seen[0],
            { phase: "progress", completed: 0 },
            "the first event says the load began, never held back",
        );
        assert.deepInclude(seen.at(-1), { outcome: "succeeded" }, "and how it ended");
        assert.doesNotThrow(() => structuredClone(seen), "the detail carries plain values");
    });

    test("graphty-note-change arrives with plain values and no record", async () => {
        const element = await mountWithGraph();
        const seen: unknown[] = [];
        element.addEventListener("graphty-note-change", (event) => {
            seen.push((event as CustomEvent).detail);
        });

        const id = element.session.notes.add({ text: "about a", targets: [{ node: "a" }] });

        assert.deepEqual(seen, [{ id, change: "created", fields: [], cause: "command" }]);
        assert.doesNotThrow(() => structuredClone(seen[0]), "the detail carries plain values");
    });
});

/**
 * @file Two repaints asked for at once take turns, and each one announces what IT painted.
 *
 * WHY THIS IS A FILE OF ITS OWN. Everything in `repaint.test.ts` asks for one pass, awaits it,
 * and then asks for the next -- which is the one order in which the defect below cannot happen,
 * and is why nothing saw it.
 *
 * THE DEFECT. The pass keeps one dirty set per element kind: a scratch array and a count, emptied
 * at the start of every pass. Every pass yields to the event loop, because that is what keeps a
 * fifty-thousand element repaint off the frame budget. So two passes asked for at once do not
 * take turns, they interleave -- and the second one's start empties the set the first one is
 * still painting from. The first pass then paints the second one's elements, reports a count that
 * belongs to neither, and leaves the elements it was asked about untouched.
 *
 * IT IS THE ORDINARY CASE, not a contrived one. Three doors into a pass fire within a few
 * milliseconds of each other on an ordinary load: the repaint a data source's load ends with, the
 * repaint a finished algorithm run asks for, and the layer that run's own suggestion adds.
 * Measured on the Kruskal story before this was fixed, all three reported the same nineteen edges
 * and no nodes at all, and the twenty nodes the first pass had painted never reached a mesh --
 * every one of them stayed on the appearance the element gives a node it has not styled yet.
 */

import { assert, describe, it } from "vitest";

import type { Path } from "../../../src/catalog/types";
import {
    type CompiledLayer,
    createStylesApi,
    type ElementLayerSpec,
    type RepaintContext,
} from "../../../src/session/styles/index";
import type { SelectorSource, SelectorTarget } from "../../../src/session/styles/predicate";
import { createLayerRepaint, type RepaintEngine } from "../../../src/session/styles/repaint";

/** One element's columns, keyed by the path a selector names. */
type Row = Readonly<Record<Path, unknown>>;

/** Six nodes, three of which a run measured. */
const NODES: readonly Row[] = [
    { "results.louvain.group": "a" },
    { "results.louvain.group": "b" },
    { "results.louvain.group": "a" },
    {},
    {},
    {},
];

/** Which nodes the run measured, which is what a `has` selector walks instead of the node list. */
const MEASURED: Readonly<Record<Path, readonly number[]>> = { "results.louvain.group": [0, 1, 2] };

/** The element's own layer, at the bottom of the stack. */
const ELEMENT_BASE: ElementLayerSpec = {
    name: "Default",
    source: { by: "element", reason: "default" },
    selector: { match: "everything" },
    set: { "node.color": "#333333" },
};

/** A context that never cancels and reports to nobody. */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

/** The engine, the stack over it, and every set a pass announced. */
interface Harness {
    /** The engine under test. */
    readonly engine: RepaintEngine;
    /** Adds a layer, which is the second door into a pass. Its run is awaitable. */
    add: (name: string) => PromiseLike<unknown>;
    /** The stack as it stands, which is what a whole-graph repaint is handed. */
    stack: () => readonly CompiledLayer[];
    /** One entry per finished pass: the node indices that pass announced. */
    readonly announced: number[][];
}

/**
 * A session of six nodes with a repaint bound to it, recording what every pass announces.
 * @returns The harness.
 */
function makeHarness(): Harness {
    const elements: SelectorSource = {
        nodeValue: (index, path) => NODES[index]?.[path],
        edgeValue: () => undefined,
        nodeIdOf: (index) => `n${String(index)}`,
        edgeIdOf: (index) => `e${String(index)}`,
    };

    const engine = createLayerRepaint({
        nodeCount: () => NODES.length,
        edgeCount: () => 0,
        elements,
        measured: (path: Path, target: SelectorTarget) => (target === "node" ? MEASURED[path] : undefined),
    });

    const styles = createStylesApi({
        elements,
        base: [ELEMENT_BASE],
        repaint: engine.repaint,
        encoding: engine.encoding,
        onChange: () => undefined,
    });

    const announced: number[][] = [];

    engine.onPainted(() => {
        announced.push(Array.from(engine.lastPainted("node")));
    });

    return {
        engine,
        announced,
        stack: () => styles.compiled(),
        add: (name: string) =>
            styles.add({
                name,
                selector: { match: "has", path: "results.louvain.group" },
                set: { "node.color": "#ff0000" },
            }),
    };
}

describe("two repaints asked for at once", () => {
    it("each announce the elements they were asked to paint, not each other's", async () => {
        const harness = makeHarness();

        // THE SAME TICK, which is the whole point: a load's whole-graph repaint and the layer an
        // algorithm's suggestion adds arrive together and neither awaits the other.
        const whole = harness.engine.repaintAll(harness.stack(), quietContext());
        const edit = harness.add("Communities");

        await Promise.all([whole, edit]);

        assert.strictEqual(harness.announced.length, 2, "one announcement per finished pass");

        const sizes = harness.announced.map((set) => set.length).sort((left, right) => left - right);

        assert.deepStrictEqual(
            sizes,
            [3, 6],
            "the whole-graph pass painted all six nodes and the layer painted the three the run " +
                `measured; the passes announced ${JSON.stringify(harness.announced)}`,
        );
    });

    it("leave every element painted by the whole stack, not by whichever pass ran last", async () => {
        const harness = makeHarness();

        const whole = harness.engine.repaintAll(harness.stack(), quietContext());
        const edit = harness.add("Communities");

        await Promise.all([whole, edit]);

        const colours = NODES.map((_row, index) => harness.engine.styleOf("node", index)["node.color"]?.hex ?? "none");

        assert.deepStrictEqual(
            colours,
            ["#ff0000", "#ff0000", "#ff0000", "#333333", "#333333", "#333333"],
            "the three measured nodes wear the layer and the other three wear the element's own default",
        );
    });
});

describe("whether a pass is on its way", () => {
    // A renderer frames its camera on the sizes the stack painted. A pass yields to the event loop
    // and waits behind the pass in front of it, so for as many frames as the machine is slow a
    // size can be asked for and not painted yet -- and a renderer that cannot see that frames the
    // graph on the sizes from before the edit.
    it("is true from the moment a pass is asked for until the last one has announced", async () => {
        const harness = makeHarness();

        assert.isFalse(harness.engine.painting(), "nothing has been asked for yet");

        const duringAnnouncement: boolean[] = [];

        harness.engine.onPainted(() => {
            duringAnnouncement.push(harness.engine.painting());
        });

        const first = harness.engine.repaintAll(harness.stack(), quietContext());
        const second = harness.engine.repaintAll(harness.stack(), quietContext());

        assert.isTrue(harness.engine.painting(), "two passes were asked for and neither has run");

        await Promise.all([first, second]);

        // Still true while each pass announces, so there is no moment between "on its way" and
        // "arrived and waiting to be drawn" in which the picture looks finished.
        assert.deepStrictEqual(duringAnnouncement, [true, true]);
        assert.isFalse(harness.engine.painting(), "both passes have finished");
    });
});

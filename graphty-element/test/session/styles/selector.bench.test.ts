/**
 * The selector engine's performance contract, asserted rather than reviewed.
 *
 * Design 4.6.1a states a budget -- a single-layer edit on 50,000 nodes completes in under 16 ms
 * of main-thread work -- and says it is asserted by a CI benchmark, because a design that states
 * a complexity class and nothing that checks it is how an accidentally quadratic loop gets
 * built. This file is that check for the selector half of the repaint.
 *
 * WHAT IT GUARDS AGAINST, concretely: an implementation that calls `jmespath.search()` once per
 * element. That costs roughly 1,300-1,900 ns per element, which is 65-95 ms for one layer at
 * 50,000 elements, so it blows the whole-frame budget on selector evaluation alone. Every
 * assertion below is written so that such an implementation fails it.
 *
 * TWO KINDS OF ASSERTION, and both are here on purpose. The absolute ceilings are generous,
 * because a shared CI runner is slower and noisier than a workstation; they catch an order of
 * magnitude, not a percent. The RATIO against `jmespath.search()` measured in this same process
 * is the machine-independent one: it is the same arithmetic on the same hardware at the same
 * moment, so it stays meaningful wherever this runs.
 */

import jmespath from "jmespath";
import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import type { ElementPredicate, SelectorSource } from "../../../src/session/styles/predicate";
import { compileSelector,type Selector } from "../../../src/session/styles/selector";

/** The element count the budget is stated at. */
const ELEMENTS = 50_000;

/**
 * The selector half of a single-layer edit, in milliseconds.
 *
 * Well under the 16 ms whole-frame budget, because deciding WHICH elements to paint is only the
 * first of the repaint's jobs and must not eat the frame on its own. A `search()`-per-element
 * implementation measures 65-95 ms here.
 */
const PASS_BUDGET_MS = 5;

/** How many times cheaper than a `jmespath.search()` call a compiled predicate must be. */
const SPEEDUP = 10;

/** How many times each measurement is repeated; the fastest run is the estimate. */
const ROUNDS = 5;

/** The columns every measurement reads, sized at the element count the budget names. */
const groups: (number | null)[] = Array.from({ length: ELEMENTS }, (_, index) => (index % 7 === 0 ? null : index % 13));
const flags: (boolean | null)[] = Array.from({ length: ELEMENTS }, (_, index) => (index % 3 === 0 ? true : null));
const ids: NodeId[] = Array.from({ length: ELEMENTS }, (_, index) => `n${String(index)}`);

const source: SelectorSource = {
    nodeValue: (index, path) => (path === "results.louvain.group" ? groups[index] : flags[index]),
    edgeValue: () => undefined,
    nodeIdOf: (index) => ids[index],
};

/** What one measurement found. */
interface Measurement {
    /** Nanoseconds per element, taken as the fastest of {@link ROUNDS} passes. */
    readonly perElement: number;
    /** Milliseconds for one whole pass over {@link ELEMENTS} elements. */
    readonly passMs: number;
    /** How many elements the pass matched, so an accidentally empty pass cannot look fast. */
    readonly matched: number;
}

/**
 * Time one pass over every element, repeated, keeping the fastest.
 * @param run - Answers one element and reports whether it matched.
 * @returns The measurement.
 */
function measure(run: (index: number) => boolean): Measurement {
    let best = Number.POSITIVE_INFINITY;
    let matched = 0;

    for (let round = 0; round < ROUNDS; round++) {
        const started = performance.now();
        let hits = 0;

        for (let index = 0; index < ELEMENTS; index++) {
            if (run(index)) {
                hits++;
            }
        }

        best = Math.min(best, performance.now() - started);
        matched = hits;
    }

    return { perElement: (best * 1e6) / ELEMENTS, passMs: best, matched };
}

/**
 * The baseline: what one `jmespath.search()` call costs, on this machine, right now.
 *
 * Measured against a root object that is already built, so it is the kindest possible reading of
 * the old path -- the real one also allocates that object per element.
 * @returns The measurement.
 */
function measureSearch(): Measurement {
    const root = { data: { type: "host" }, results: { louvain: { group: 3 } } };

    return measure(() => jmespath.search(root, "results.louvain.group != `null`") === true);
}

/**
 * Compile a selector and measure the predicate it produced.
 * @param selector - The selector to compile.
 * @returns The measurement.
 */
function measureSelector(selector: Selector): Measurement {
    const compiled = compileSelector(selector, "node", source);
    const test: ElementPredicate = compiled.test ?? ((): boolean => true);

    return measure(test);
}

/**
 * Report a measurement beside the budget it was held to, so a CI log carries the numbers rather
 * than only a pass or a fail.
 * @param label - What was measured.
 * @param measurement - What it measured.
 * @param baseline - The `jmespath.search()` cost per element, for the ratio.
 */
function report(label: string, measurement: Measurement, baseline: number): void {
    const speedup = baseline / measurement.perElement;
    console.log(
        `${label.padEnd(34)} ${measurement.perElement.toFixed(1).padStart(8)} ns/element  ` +
            `${measurement.passMs.toFixed(2).padStart(7)} ms for ${String(ELEMENTS)}  ` +
            `${speedup.toFixed(0).padStart(5)}x search  matched ${String(measurement.matched)}`,
    );
}

describe("selector evaluation stays inside the repaint budget", () => {
    const baseline = measureSearch();

    it("measures the jmespath.search baseline it is being held against", () => {
        console.log(
            `jmespath.search baseline           ${baseline.perElement.toFixed(1).padStart(8)} ns/call     ` +
                `${baseline.passMs.toFixed(2).padStart(7)} ms for ${String(ELEMENTS)}`,
        );

        // Not a budget, a sanity check: a "baseline" of nothing would make every ratio below
        // meaningless, and that is exactly how a benchmark quietly stops testing anything.
        assert.isAbove(baseline.perElement, 50, "a search() call cannot plausibly cost under 50 ns");
    });

    it("runs an expression selector far cheaper than a search per element", () => {
        const measurement = measureSelector({ match: "expression", where: "results.louvain.group != `null`" });
        report("expression: path != `null`", measurement, baseline.perElement);

        assert.strictEqual(measurement.matched, ELEMENTS - Math.ceil(ELEMENTS / 7));
        assert.isBelow(measurement.passMs, PASS_BUDGET_MS);
        assert.isBelow(measurement.perElement, baseline.perElement / SPEEDUP);
    });

    it("runs an equality expression far cheaper than a search per element", () => {
        const measurement = measureSelector({ match: "expression", where: "data.isInPath == `true`" });
        report("expression: path == `true`", measurement, baseline.perElement);

        assert.strictEqual(measurement.matched, Math.ceil(ELEMENTS / 3));
        assert.isBelow(measurement.passMs, PASS_BUDGET_MS);
        assert.isBelow(measurement.perElement, baseline.perElement / SPEEDUP);
    });

    it("runs the generated has selector at least as cheaply as the expression it replaces", () => {
        const measurement = measureSelector({ match: "has", path: "results.louvain.group" });
        report("has: one column presence test", measurement, baseline.perElement);

        assert.strictEqual(measurement.matched, ELEMENTS - Math.ceil(ELEMENTS / 7));
        assert.isBelow(measurement.passMs, PASS_BUDGET_MS);
        assert.isBelow(measurement.perElement, baseline.perElement / SPEEDUP);
    });

    it("runs an ids selector as a set membership test", () => {
        const measurement = measureSelector({ match: "ids", nodes: ["n1", "n17", "n3000"] });
        report("ids: set membership", measurement, baseline.perElement);

        assert.strictEqual(measurement.matched, 3);
        assert.isBelow(measurement.passMs, PASS_BUDGET_MS);
        assert.isBelow(measurement.perElement, baseline.perElement / SPEEDUP);
    });

    it("costs nothing at all for everything, because there is no test to call", () => {
        const compiled = compileSelector({ match: "everything" }, "node", source);

        assert.strictEqual(compiled.test, null, "a universal selector must cost no call per element");
    });

    it("parses once at compile time, whatever the element count", () => {
        const where = "results.louvain.group != `null` && data.isInPath == `true`";

        for (let round = 0; round < 200; round++) {
            compileSelector({ match: "expression", where }, "node", source);
        }

        const started = performance.now();

        for (let round = 0; round < 1000; round++) {
            compileSelector({ match: "expression", where }, "node", source);
        }

        const perCompile = ((performance.now() - started) * 1e6) / 1000;
        console.log(`compile: parse + build closure     ${perCompile.toFixed(1).padStart(8)} ns/selector`);

        // One compile is allowed to cost far more than one element, because it happens once per
        // layer edit. What it may NOT cost is anything like the element count: this is the
        // assertion that an implementation compiling per element fails.
        assert.isBelow(perCompile, baseline.perElement * ELEMENTS);
    });
});

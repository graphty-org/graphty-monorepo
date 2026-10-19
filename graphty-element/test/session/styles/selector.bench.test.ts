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
 * WHAT IS ASSERTED IS COUNTED WORK, never a stopwatch. Every pass is held to the work it may do:
 * no `jmespath.search()` call at all, no expression parsed while the predicate runs, and exactly
 * one column read per element. A `search()`-per-element implementation fails the first, one that
 * re-parses per element the second, and one that walks or re-reads a root object per element the
 * third, on any machine however busy it is. Compiling is held to one parse per selector, whatever
 * the element count.
 *
 * THE TIMINGS ARE PRINTED, NOT ASSERTED: nanoseconds per element, milliseconds per pass at 50,000
 * elements against the design's 5 ms share of the frame, and the ratio against `search()` measured
 * in this process, so a CI log still shows the trend. ci.yml's advisory "performance" job runs this
 * file. selector.test.ts pins the same mechanism, gating, on small inputs.
 */

import jmespath from "jmespath";
import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { type ElementPredicate, predicateCounters, type SelectorSource } from "../../../src/session/styles/predicate";
import { compileSelector, type Selector } from "../../../src/session/styles/selector";

/** The element count the budget is stated at. */
const ELEMENTS = 50_000;

/**
 * The selector half of a single-layer edit, in milliseconds: the design's share of the 16 ms
 * frame. Printed beside each measurement and never asserted -- a stopwatch on a busy machine
 * measures the machine. A `search()`-per-element implementation measures 65-95 ms here.
 */
const PASS_BUDGET_MS = 5;

/** How many times cheaper than a `jmespath.search()` call the design expects a predicate to be; printed. */
const SPEEDUP = 10;

/** How many times each measurement is repeated; the fastest run is the estimate. */
const ROUNDS = 5;

/** The columns every measurement reads, sized at the element count the budget names. */
const groups: (number | null)[] = Array.from({ length: ELEMENTS }, (_, index) => (index % 7 === 0 ? null : index % 13));
const flags: (boolean | null)[] = Array.from({ length: ELEMENTS }, (_, index) => (index % 3 === 0 ? true : null));
const ids: NodeId[] = Array.from({ length: ELEMENTS }, (_, index) => `n${String(index)}`);

/** Column reads made through {@link source}: a value or an id, one per call. */
let reads = 0;

const source: SelectorSource = {
    nodeValue: (index, path) => {
        reads++;
        return path === "results.louvain.group" ? groups[index] : flags[index];
    },
    edgeValue: () => undefined,
    nodeIdOf: (index) => {
        reads++;
        return ids[index];
    },
};

/** What one measurement found. */
interface Measurement {
    /** Nanoseconds per element, taken as the fastest of {@link ROUNDS} passes. */
    readonly perElement: number;
    /** Milliseconds for one whole pass over {@link ELEMENTS} elements. */
    readonly passMs: number;
    /** How many elements the pass matched, so an accidentally empty pass cannot look fast. */
    readonly matched: number;
    /** Column reads in one pass over every element. */
    readonly reads: number;
    /** Expressions parsed during the passes. */
    readonly parses: number;
    /** `jmespath.search()` calls made during the passes. */
    readonly searches: number;
}

/**
 * Count the `jmespath.search()` calls some work makes, whoever makes them.
 * @param work - The work.
 * @returns How many calls it made.
 */
function searchesDuring(work: () => void): number {
    const { search: original } = jmespath;
    let calls = 0;
    jmespath.search = (data, expression) => {
        calls++;
        return original(data, expression);
    };

    try {
        work();
    } finally {
        jmespath.search = original;
    }

    return calls;
}

/**
 * Time one pass over every element, repeated, keeping the fastest.
 * @param run - Answers one element and reports whether it matched.
 * @returns The measurement.
 */
function measure(run: (index: number) => boolean): Measurement {
    let best = Number.POSITIVE_INFINITY;
    let matched = 0;
    let passReads = 0;
    const parsesBefore = predicateCounters.parses;

    const searches = searchesDuring(() => {
        for (let round = 0; round < ROUNDS; round++) {
            const readsBefore = reads;
            const started = performance.now();
            let hits = 0;

            for (let index = 0; index < ELEMENTS; index++) {
                if (run(index)) {
                    hits++;
                }
            }

            best = Math.min(best, performance.now() - started);
            matched = hits;
            passReads = reads - readsBefore;
        }
    });

    return {
        perElement: (best * 1e6) / ELEMENTS,
        passMs: best,
        matched,
        reads: passReads,
        parses: predicateCounters.parses - parsesBefore,
        searches,
    };
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
            `${speedup.toFixed(0).padStart(5)}x search  ` +
            `(budget ${String(PASS_BUDGET_MS)} ms, ${String(SPEEDUP)}x)  matched ${String(measurement.matched)}`,
    );
}

/**
 * Assert the work one pass over every element did: no `search()`, no parse, one read each.
 * @param measurement - What the pass did.
 */
function assertOneReadPerElement(measurement: Measurement): void {
    assert.strictEqual(measurement.searches, 0, "no jmespath.search() call while the predicate runs");
    assert.strictEqual(measurement.parses, 0, "no expression parsed while the predicate runs");
    assert.strictEqual(measurement.reads, ELEMENTS, "one column read per element, and no more");
}

describe("selector evaluation stays inside the repaint budget", () => {
    const baseline = measureSearch();

    it("measures the jmespath.search baseline it is being held against", () => {
        console.log(
            `jmespath.search baseline           ${baseline.perElement.toFixed(1).padStart(8)} ns/call     ` +
                `${baseline.passMs.toFixed(2).padStart(7)} ms for ${String(ELEMENTS)}`,
        );

        // Not a budget, a check that the counter sees what it is meant to: the baseline makes one
        // search() per element, so a counter reading zero below means something.
        assert.strictEqual(baseline.searches, ELEMENTS * ROUNDS, "the baseline makes one search() per element");
    });

    it("runs an expression selector far cheaper than a search per element", () => {
        const measurement = measureSelector({ match: "expression", where: "results.louvain.group != `null`" });
        report("expression: path != `null`", measurement, baseline.perElement);

        assert.strictEqual(measurement.matched, ELEMENTS - Math.ceil(ELEMENTS / 7));
        assertOneReadPerElement(measurement);
    });

    it("runs an equality expression far cheaper than a search per element", () => {
        const measurement = measureSelector({ match: "expression", where: "data.isInPath == `true`" });
        report("expression: path == `true`", measurement, baseline.perElement);

        assert.strictEqual(measurement.matched, Math.ceil(ELEMENTS / 3));
        assertOneReadPerElement(measurement);
    });

    it("runs the generated has selector at least as cheaply as the expression it replaces", () => {
        const measurement = measureSelector({ match: "has", path: "results.louvain.group" });
        report("has: one column presence test", measurement, baseline.perElement);

        assert.strictEqual(measurement.matched, ELEMENTS - Math.ceil(ELEMENTS / 7));
        assertOneReadPerElement(measurement);
    });

    it("runs an ids selector as a set membership test", () => {
        const measurement = measureSelector({ match: "ids", nodes: ["n1", "n17", "n3000"] });
        report("ids: set membership", measurement, baseline.perElement);

        assert.strictEqual(measurement.matched, 3);
        assertOneReadPerElement(measurement);
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

        const readsBefore = reads;
        const parsesBefore = predicateCounters.parses;
        const started = performance.now();

        for (let round = 0; round < 1000; round++) {
            compileSelector({ match: "expression", where }, "node", source);
        }

        const perCompile = ((performance.now() - started) * 1e6) / 1000;
        console.log(`compile: parse + build closure     ${perCompile.toFixed(1).padStart(8)} ns/selector`);

        // One compile is one parse and touches no element: an implementation that compiled per
        // element, or read the columns to compile, fails here.
        assert.strictEqual(predicateCounters.parses - parsesBefore, 1000, "one parse per compile");
        assert.strictEqual(reads - readsBefore, 0, "compiling reads no element");
    });
});

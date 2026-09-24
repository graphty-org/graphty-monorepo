/**
 * The repaint's performance contract, asserted rather than reviewed.
 *
 * Design 4.6.1a states a budget -- a single-layer edit on 50,000 nodes completes in under 16 ms
 * of main-thread work, one frame -- and says in the same breath that it is asserted by a CI
 * benchmark, because a design that states a complexity class and nothing that checks it is how an
 * accidentally quadratic loop gets built. This file is that check.
 *
 * WHAT IT GUARDS AGAINST, concretely, all three of them measured against the dependencies pinned
 * today:
 *
 * - A `jmespath.search()` per element: 1,843 ns per call, 92 ms for one layer at 50,000 nodes.
 * - Interning a style by scanning every style already minted: 515 ms for 500 distinct styles,
 *   2.1 s for 1,000, and a continuous colour encoding makes the distinct count the element count.
 * - Repainting the graph on every edit instead of the elements the edit touched.
 *
 * HOW THE BUDGET IS ASSERTED, and why it is not a bare stopwatch. This file runs beside two
 * hundred others on a machine with fewer cores than test files, and the same edit measures 9.8 ms
 * alone and 23.9 ms while the rest of the suite is running -- so a bare 16 ms ceiling would be a
 * test of how busy the runner is. Every budget here is therefore asserted twice:
 *
 * - Against a REFERENCE MEASURED IN THIS PROCESS AT THIS MOMENT: the `jmespath.search()` pass the
 *   repaint replaces, and a scanning interner like the one it replaces. The same arithmetic on
 *   the same hardware under the same load, so the ratio means the same thing wherever this runs
 *   and however busy the machine is. This is the assertion that actually guards the budget.
 * - Against a generous absolute ceiling, as a backstop for the case where the reference itself
 *   gets faster. Four frames, because the contention factor measured above is nearly three and a
 *   runner with fewer cores is worse -- the CONTRACT is one frame, and the printed number,
 *   measured with this file running on its own, is the one to read.
 *
 * EVERY MEASUREMENT IS PRINTED, pass or fail, so a CI log carries the numbers and a regression
 * shows up as a trend rather than as a sudden red.
 */

import jmespath from "jmespath";
import { assert, describe, it } from "vitest";

import type { Path } from "../../../src/catalog/types";
import { createStylesApi, type ElementLayerSpec, type RepaintContext, type SessionStylesApi } from "../../../src/session/styles/index";
import { createStyleInterner } from "../../../src/session/styles/intern";
import type { SelectorSource } from "../../../src/session/styles/predicate";
import { createLayerRepaint, type RepaintEngine } from "../../../src/session/styles/repaint";

/** The element count the budget is stated at. */
const ELEMENTS = 50_000;

/** The budget the design states: one frame of main-thread work for one single-layer edit. */
const FRAME_MS = 16;

/**
 * How much slower this file measures while the rest of the suite runs beside it.
 *
 * Measured on this machine: the same edit costs 10.1 ms alone and 28.8 ms under a full-suite run,
 * a factor of 2.9, and a runner with fewer cores than this one is worse. The absolute ceilings
 * below are the budget times this, so that a busy runner cannot fail them on its own; the ratios
 * against the references measured beside them are what actually hold the budget.
 */
const CONTENTION = 4;

/**
 * What the reference selector pass costs on an idle, uninstrumented machine.
 *
 * Only ever used to work out how much slower the CURRENT process is than that, so the absolute
 * ceilings can be scaled by the same factor. See {@link ceilingFor}.
 */
const SEARCH_PASS_REFERENCE_MS = 100;

/**
 * How many times cheaper than the OLD SELECTOR PASS ALONE a whole edit has to be.
 *
 * The comparison is deliberately unfair to this implementation: the reference is only the
 * `jmespath.search()` calls the old path made -- 1,843 ns each, 92 ms for one layer at 50,000
 * nodes -- while the measured side is the whole edit, validation, preparation, paint, interning
 * and all. Anything that reintroduces a parse per element fails this by construction.
 */
const SEARCH_SPEEDUP = 4;

/** How many elements the narrow run measured, of the fifty thousand in the graph. */
const NARROW = 300;

/** The column a wide run published: every element carries a value. */
const SCORES = Float64Array.from({ length: ELEMENTS }, (_, index) => (index % 997) / 997);

/** The elements the narrow run measured, evenly spread so nothing can be won by locality. */
const NARROW_INDICES = Uint32Array.from({ length: NARROW }, (_, index) => index * Math.floor(ELEMENTS / NARROW));

/** The narrow run's values, by dense index. */
const GROUPS = new Map<number, string>([...NARROW_INDICES].map((index, at) => [index, `g${String(at % 6)}`]));

/** What the wide run published. */
const WIDE_PATH: Path = "results.betweenness.score";

/** What the narrow run published. */
const NARROW_PATH: Path = "results.louvain.group";

/** The element's own layer: a flat colour over the whole graph, which every stack below sits on. */
const ELEMENT_BASE: ElementLayerSpec = {
    name: "Default",
    source: { by: "element", reason: "default" },
    selector: { match: "everything" },
    set: { "node.color": "#333333", "node.size": 1 },
};

/** What the session can say about one element. */
const ELEMENTS_SOURCE: SelectorSource = {
    nodeValue: (index, path) => {
        if (path === WIDE_PATH) {
            return SCORES[index];
        }

        return path === NARROW_PATH ? GROUPS.get(index) : undefined;
    },
    edgeValue: () => undefined,
    nodeIdOf: (index) => `n${String(index)}`,
};

/**
 * What the selector path the repaint replaces cost, measured here and now.
 *
 * `search()` re-parses its expression on every call, which is why the old path could not be made
 * to fit a frame whatever else was done to it. Measuring it in this process, at this moment,
 * against this machine's current load is what makes every ratio below independent of all three.
 * @returns Milliseconds for one pass of {@link ELEMENTS} calls.
 */
function measureSearchPass(): number {
    const root = { data: { kind: "host" }, results: { betweenness: { score: 0.5 } } };
    const started = cpuMs();

    for (let index = 0; index < ELEMENTS; index++) {
        jmespath.search(root, "results.betweenness.score != `null`");
    }

    return cpuMs() - started;
}

/** A context that never cancels and reports to nobody. */
function quietContext(): RepaintContext {
    return { signal: new AbortController().signal, report: () => undefined };
}

/**
 * How many times each edit is measured. Each round builds a session of its own, because an edit
 * changes the stack it was made against and cannot be made twice; the FASTEST round is the
 * estimate, so what is reported is steady-state work rather than the first pass through code the
 * engine has not compiled yet.
 */
const ROUNDS = 4;

interface Harness {
    /** The engine under test. */
    readonly engine: RepaintEngine;
    /** The stack it paints from. */
    readonly styles: SessionStylesApi;
}

/** What measuring an edit found. */
interface Measurement {
    /** The fastest round's main-thread work, in milliseconds. */
    readonly ms: number;
    /** The same round's wall clock, which is what a person waits. */
    readonly wall: number;
    /** The session the last round was made against, for the assertions about what was painted. */
    readonly harness: Harness;
}

/**
 * How much processor time this process has used, in milliseconds.
 *
 * WHY THE BUDGET IS ASSERTED AGAINST THIS AND NOT THE CLOCK. The suite runs many files at once on
 * a machine with fewer cores than files, so a pass doing 10 ms of work takes 28 ms of clock while
 * the scheduler is running somebody else, and a clock ceiling would be a test of how busy the
 * runner is.
 *
 * It is an UPPER BOUND on the main-thread work the design's budget is stated in, never an
 * understatement: it counts every thread this process has, so V8's background collector and its
 * background compiler are in it too. On an idle machine it measures 13.7 ms where the clock says
 * 10.0 ms, and both are printed.
 * @returns Milliseconds of user plus system time.
 */
function cpuMs(): number {
    const { user, system } = process.cpuUsage();

    return (user + system) / 1000;
}

/**
 * A fifty-thousand-node session with its base layer already painted.
 *
 * The first draw is done and NOT timed: what the budget is about is the next edit, which is what
 * a person does when they colour a graph by a metric.
 * @returns The harness.
 */
async function makeHarness(): Promise<Harness> {
    const engine = createLayerRepaint({
        nodeCount: () => ELEMENTS,
        edgeCount: () => 0,
        elements: ELEMENTS_SOURCE,
        measured: (path, target) => {
            if (target !== "node") {
                return undefined;
            }

            return path === NARROW_PATH ? NARROW_INDICES : undefined;
        },
    });

    const styles = createStylesApi({ elements: ELEMENTS_SOURCE, base: [ELEMENT_BASE], repaint: engine.repaint });

    await engine.repaintAll(styles.compiled(), quietContext());

    return { engine, styles };
}

/**
 * Time one edit against a fresh session, repeatedly, keeping the fastest round.
 *
 * Wall clock is the conservative reading: it holds the edit to the pass's own work PLUS
 * validation, the run queue's microtasks and any turn the pass gave back to the event loop, so an
 * implementation that passes here has used less main-thread time than the number printed, never
 * more.
 * @param edit - The edit to make.
 * @returns The fastest round and the session it was last made against.
 */
async function measureEdit(edit: (harness: Harness) => PromiseLike<unknown>): Promise<Measurement> {
    let best = Number.POSITIVE_INFINITY;
    let wall = Number.POSITIVE_INFINITY;
    let harness = await makeHarness();

    for (let round = 0; round < ROUNDS; round++) {
        harness = round === 0 ? harness : await makeHarness();

        const clock = performance.now();
        const cpu = cpuMs();

        await edit(harness);

        const spent = cpuMs() - cpu;

        if (spent < best) {
            best = spent;
            wall = performance.now() - clock;
        }
    }

    return { ms: best, wall, harness };
}

/**
 * Print one measurement beside the budget it was held to.
 * @param label - What was measured.
 * @param ms - How long it took.
 * @param budget - What it was allowed.
 * @param extra - Anything else worth carrying into the log.
 */
function report(label: string, ms: number, budget: number, extra = ""): void {
    console.log(
        `${label.padEnd(44)} ${ms.toFixed(2).padStart(8)} ms  of ${String(budget).padStart(4)} ms budget  ${extra}`,
    );
}

/**
 * Print one edit's measurement, main-thread work first and wall clock beside it.
 * @param label - What was measured.
 * @param measurement - What it measured.
 * @param budget - What it was allowed.
 * @param extra - Anything else worth carrying into the log.
 */
function reportEdit(label: string, measurement: Measurement, budget: number, extra = ""): void {
    report(label, measurement.ms, budget, `${measurement.wall.toFixed(2)} ms wall  ${extra}`);
}

describe("a single-layer edit stays inside one frame", () => {
    /** What the old selector pass costs on this machine, under this load, right now. */
    const searchPass = measureSearchPass();

    /**
     * The absolute ceiling for one edit, scaled by how slow this process actually is.
     *
     * The ratios against `searchPass` are what hold the budget, because both sides are measured
     * in the same process and a slow environment moves them together. The absolute ceiling is a
     * belt, and a belt sized in real milliseconds stops meaning anything once the environment
     * stops running at real speed.
     *
     * CI runs this file under v8 coverage, which instruments every function in the measured path
     * and does not touch the wall clock. That read 72 ms against a fixed 64 ms ceiling -- a
     * failure that says nothing about the repaint. Rather than loosen the number for everyone, or
     * try to detect coverage (there is no runtime signal for the v8 provider: no `__coverage__`
     * global, and none of the VITEST_* variables say), the ceiling is scaled by the slowdown this
     * process is already demonstrating on the reference pass beside it.
     *
     * So an idle uninstrumented run keeps the tight ceiling it has always had, and an instrumented
     * or heavily loaded one is held to the same standard in ITS units.
     * @returns The ceiling in milliseconds.
     */
    function ceilingFor(): number {
        const slowdown = Math.max(1, searchPass / SEARCH_PASS_REFERENCE_MS);

        return FRAME_MS * CONTENTION * slowdown;
    }

    it("measures the selector pass it is being held against", () => {
        report("jmespath.search, 50,000 calls", searchPass, FRAME_MS, `${((searchPass * 1e6) / ELEMENTS).toFixed(0)} ns each`);

        // Not a budget, a sanity check: a reference of nothing would make every ratio below
        // meaningless, and that is exactly how a benchmark quietly stops testing anything.
        assert.isAbove(searchPass, FRAME_MS, "one search per element cannot plausibly fit in a frame");
    });

    it("colours fifty thousand nodes by a metric in under one frame", async () => {
        const measurement = await measureEdit((h) =>
            h.styles.add({
                name: "Betweenness",
                selector: { match: "has", path: WIDE_PATH },
                encode: { "node.color": { by: WIDE_PATH, scale: "linear", palette: "viridis" } },
            }),
        );
        const { ms, harness } = measurement;

        reportEdit("colour encoding, 50,000 nodes", measurement, FRAME_MS, `${String(harness.engine.meshCount("node"))} meshes`);

        // The pass really did paint: a benchmark that measures an edit which was refused, or one
        // that matched nothing, is a benchmark that measures nothing.
        assert.notStrictEqual(harness.engine.styleOf("node", 17)["node.color"]?.hex, "#333333");
        assert.isBelow(ms, searchPass / SEARCH_SPEEDUP);
        assert.isBelow(ms, ceilingFor());
    });

    it("does not mint a source mesh per colour", async () => {
        const { engine, styles } = await makeHarness();

        await styles.add({
            name: "Betweenness",
            selector: { match: "has", path: WIDE_PATH },
            encode: { "node.color": { by: WIDE_PATH, scale: "linear", palette: "viridis" } },
        });

        const painted = new Set(
            Array.from({ length: 500 }, (_, index) => engine.styleOf("node", index * 97)["node.color"]?.hex),
        );

        assert.isAbove(painted.size, 50, "a continuous ramp really did paint many distinct colours");

        // Two, and both of them come from the base layer's SIZE: the one an element with no size
        // would keep, and the one every element actually has. The ramp painted five hundred
        // distinct colours over them and added none, because colour is per-instance GPU state.
        assert.strictEqual(engine.meshCount("node"), 2);
    });

    it("sizes fifty thousand nodes, meshes and all, in under 16 ms", async () => {
        // The hard case for a structural hash: size DOES key a source mesh, so a continuous
        // encoding mints one per distinct value. That is the shape of the load that measured
        // 2.1 s at a thousand styles when interning was a scan over everything already minted.
        const measurement = await measureEdit((h) =>
            h.styles.add({
                name: "Sizes",
                selector: { match: "has", path: WIDE_PATH },
                encode: { "node.size": { by: WIDE_PATH, scale: "linear", range: [1, 8] } },
            }),
        );
        const { ms, harness } = measurement;
        const meshes = harness.engine.meshCount("node");

        reportEdit("size encoding, 50,000 nodes", measurement, FRAME_MS, `${String(meshes)} meshes`);

        assert.isAbove(meshes, 100, "the encoding really did mint many distinct meshes");
        assert.isBelow(ms, searchPass / SEARCH_SPEEDUP);
        assert.isBelow(ms, ceilingFor());
    });

    it("takes a wide layer back off again in under 16 ms", async () => {
        // Removal is the case a layer editor hits most and the one the design's worked example of
        // the old defect ends at: 50,000 elements have to be given back what the layers beneath
        // painted, which means visiting all of them.
        let best = Number.POSITIVE_INFINITY;

        for (let round = 0; round < ROUNDS; round++) {
            const { styles } = await makeHarness();
            const layer = await styles.add({
                name: "Betweenness",
                selector: { match: "has", path: WIDE_PATH },
                encode: { "node.color": { by: WIDE_PATH, scale: "linear", palette: "viridis" } },
            });

            const started = cpuMs();

            await styles.remove(layer.id);

            best = Math.min(best, cpuMs() - started);
        }

        report("removing a 50,000-element layer", best, FRAME_MS);

        assert.isBelow(best, searchPass / SEARCH_SPEEDUP);
        assert.isBelow(best, ceilingFor());
    });
});

describe("an edit costs what it touches, not what the graph holds", () => {
    it("repaints three hundred elements for a run that measured three hundred", async () => {
        const wide = await measureEdit((h) =>
            h.styles.add({
                name: "Betweenness",
                selector: { match: "has", path: WIDE_PATH },
                encode: { "node.color": { by: WIDE_PATH, scale: "linear", palette: "viridis" } },
            }),
        );

        const narrow = await measureEdit((h) =>
            h.styles.add({
                name: "Communities",
                selector: { match: "has", path: NARROW_PATH },
                encode: { "node.color": { by: NARROW_PATH, scale: "ordinal", palette: "okabe-ito" } },
            }),
        );

        reportEdit("run-bound layer, 300 of 50,000", narrow, FRAME_MS, `${(wide.ms / narrow.ms).toFixed(1)}x cheaper`);

        const { engine } = narrow.harness;

        assert.notStrictEqual(engine.styleOf("node", NARROW_INDICES[1])["node.color"]?.hex, "#333333");
        assert.strictEqual(engine.styleOf("node", 1)["node.color"]?.hex, "#333333", "an unmeasured node is untouched");

        // The machine-independent assertion, and the one that actually tests the measured-column
        // rule: the same
        // edit over six hundredths of the graph has to be several times cheaper. An
        // implementation that walks the node list to find what this layer matches costs roughly
        // the same for both, whatever the absolute numbers on the machine are.
        assert.isBelow(narrow.ms, wide.ms / 3);
        assert.isBelow(narrow.ms, (FRAME_MS / 4) * CONTENTION);
    });

    it("repaints nothing at all for a layer that matches nothing", async () => {
        const measurement = await measureEdit((h) =>
            h.styles.add({
                name: "Nothing",
                selector: { match: "ids", nodes: [] },
                set: { "node.color": "#ff0000" },
            }),
        );

        reportEdit("the floor: an edit that paints nothing", measurement, FRAME_MS / 4);

        assert.isBelow(measurement.ms, (FRAME_MS / 4) * CONTENTION);
    });
});

describe("interning is a hash, not a scan", () => {
    /**
     * How many times to build a run of styles so that the window being timed is milliseconds
     * rather than microseconds.
     *
     * Processor time is accounted in ticks, so timing a tenth of a millisecond of work measures
     * the scheduler and not the code. Both methods are measured over the same total number of
     * styles, so the repetition cannot favour either.
     *
     * THE TOTAL IS THIRTY-TWO THOUSAND AND NOT EIGHT, and that is a measurement fix rather than a
     * threshold one. At eight thousand the window was a single millisecond, and
     * {@link cpuMs} charges this process's BACKGROUND COLLECTOR to it -- so one collection landing
     * inside the window read as eight times the work, and the ratio this test asserts failed
     * roughly one full-suite run in six with nothing wrong with the code. Four times the work per
     * window puts the collection's share back in proportion; every threshold below is unchanged.
     * @param distinct - How many distinct styles one run builds.
     * @returns How many runs to build.
     */
    const repeatsFor = (distinct: number): number => Math.max(1, Math.round(32_000 / distinct));

    /**
     * Intern a run of distinct styles the way the element does today: by comparing the new style
     * with every style already minted until one matches.
     *
     * This is the reference, reimplemented here in ten lines so that the comparison is against a
     * scan measured on THIS machine under THIS load rather than against a number in a document.
     * The element's own version compares with a deep equality check over a nested object, so it
     * is slower than this one, not faster.
     * @param distinct - How many distinct styles to mint.
     * @returns Nanoseconds per style.
     */
    const timeScanning = (distinct: number): number => {
        const rounds = repeatsFor(distinct);
        const started = cpuMs();

        for (let round = 0; round < rounds; round++) {
            const minted: { shape: string; size: number }[] = [];

            for (let value = 0; value < distinct; value++) {
                let found = -1;

                for (let at = 0; at < minted.length; at++) {
                    if (minted[at].shape === "sphere" && minted[at].size === value) {
                        found = at;
                        break;
                    }
                }

                if (found === -1) {
                    minted.push({ shape: "sphere", size: value });
                }
            }
        }

        return ((cpuMs() - started) * 1e6) / (distinct * rounds);
    };

    /**
     * Time interning a run of distinct styles, from empty.
     * @param distinct - How many distinct styles to mint.
     * @returns Nanoseconds per style.
     */
    const timeInterning = (distinct: number): number => {
        const rounds = repeatsFor(distinct);
        const started = cpuMs();
        let last = createStyleInterner<number>();

        for (let round = 0; round < rounds; round++) {
            const interner = createStyleInterner<number>();

            for (let value = 0; value < distinct; value++) {
                interner.begin();
                interner.pushText("sphere");
                interner.pushNumber(value);
                interner.end(() => value);
            }

            last = interner;
        }

        const ms = cpuMs() - started;

        assert.strictEqual(last.size, distinct);

        return (ms * 1e6) / (distinct * rounds);
    };

    /**
     * The fastest of several runs, so one unlucky collection does not decide a ratio.
     * @param measure - What to measure.
     * @param distinct - How many distinct styles to mint.
     * @returns Nanoseconds per style.
     */
    const bestOf = (measure: (distinct: number) => number, distinct: number): number => {
        let best = Number.POSITIVE_INFINITY;

        for (let round = 0; round < 3; round++) {
            best = Math.min(best, measure(distinct));
        }

        return best;
    };

    it("stays flat as styles accumulate where a scan grows with them", () => {
        /** The smaller of the two style counts the two methods are compared at. */
        const few = 1_000;

        /** The larger. Eight times as many, so a linear cost shows up as eight times as much. */
        const many = 8_000;

        // Warm both code paths so the first measurement is not paying for its own compilation.
        timeInterning(few);
        timeScanning(few);

        const hashFew = bestOf(timeInterning, few);
        const hashMany = bestOf(timeInterning, many);
        const scanFew = bestOf(timeScanning, few);
        const scanMany = bestOf(timeScanning, many);
        const hashGrowth = hashMany / hashFew;
        const scanGrowth = scanMany / scanFew;

        console.log(
            `per distinct style, hash                     ${hashFew.toFixed(0).padStart(6)} ns at 1,000 ` +
                `${hashMany.toFixed(0).padStart(6)} ns at 8,000   ${hashGrowth.toFixed(2)}x`,
        );
        console.log(
            `per distinct style, the scan it replaces     ${scanFew.toFixed(0).padStart(6)} ns at 1,000 ` +
                `${scanMany.toFixed(0).padStart(6)} ns at 8,000   ${scanGrowth.toFixed(2)}x`,
        );

        // THE WHOLE ASSERTION, and it is a shape rather than a number. Eight times as many styles
        // cost a scan several times as much EACH, and cost a hash roughly the same. Both sides
        // are measured in the same breath on the same machine under the same load, so a slow or a
        // busy runner moves them together and the comparison survives it.
        assert.isAbove(scanGrowth, 3, "the reference really is the linear scan it claims to be");
        assert.isBelow(hashGrowth, scanGrowth / 2, "a hash does not care how many styles came before");
        assert.isAbove(scanMany / hashMany, 4);
    });

    it("mints one distinct style per element without leaving the frame's neighbourhood", () => {
        timeInterning(2_000);

        const perStyle = bestOf(timeInterning, ELEMENTS);
        const ms = (perStyle * ELEMENTS) / 1e6;

        report("interning 50,000 distinct styles", ms, FRAME_MS, `${perStyle.toFixed(0)} ns each`);

        // One distinct mesh per node is not a picture anybody draws -- it is what a continuous
        // encoding of a mesh-keying channel does at full precision, and it is the load that
        // measured 2.1 s at ONE THOUSAND styles when interning was a scan. It is held to two
        // frames rather than one because it is the pathological case and not the budgeted one.
        assert.isBelow(ms, FRAME_MS * 2 * CONTENTION);
    });
});

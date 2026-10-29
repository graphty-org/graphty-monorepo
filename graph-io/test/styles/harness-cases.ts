/**
 * What the style harness's test files share: every format it runs, the checks known not to hold yet, and the round
 * trip and hostile-block checks of each format with a style writer, which run in slices (harness-writes-*.test.ts) so
 * that vitest spreads them over its workers. In one file they were 1,225 tests in one worker, most of the graph-io
 * shard's time, and on a slow runner the shard ran out of time waiting for that one file (issue #4525).
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { extractStyles } from "../../src/styles/internal.js";
import { RANDOM_10000, RANDOM_10000_CUT } from "./formats/dot.js";
import {
    checkHostileBlocks,
    formatInputs,
    type LoadedGraph,
    roundTrip,
    STYLE_CORPUS,
    type StyleFormat,
    styleFormats,
    type StyleInput,
} from "./harness.js";

/** How many files the round trip and hostile-block checks are spread over: harness-writes-1 to -3.test.ts. */
export const WRITE_SLICES = 3;

export const registered = await styleFormats();
const claimed = new Set(registered.map((f) => f.name));
/** Corpus directories no module registered: read through the default registry, with one mutant per styled file. */
const unregistered: StyleFormat[] = readdirSync(STYLE_CORPUS)
    .filter((d) => statSync(join(STYLE_CORPUS, d)).isDirectory() && !claimed.has(d) && d !== "hostile")
    .sort()
    .map((name) => ({ name, mutantsPerFile: 1 }));
export const FORMATS = [...registered, ...unregistered];

/**
 * Checks that do not hold yet, by `<input> plans` or `<input> writes`, with the defect: each runs as an expected
 * failure, so the fix turns it red until it is removed from here. All found by the style fidelity fixtures.
 */
export const KNOWN_FAILURES: ReadonlyMap<string, string> = new Map([
    ["dot/fidelity/real-depcruise.gv writes", "an outside edit of the written DOT gives no new exception"],
    [
        "json/fidelity/vis-siblings.json writes",
        "the vis writer writes a fitted vis-network ellipse as a sized dot, whose label the reader hangs below it (labelOffsetY 4)",
    ],
    [
        "json/fidelity/vis-synth.json writes",
        "the vis writer writes a fitted vis-network ellipse as a sized dot, whose label the reader hangs below it (labelOffsetY 4)",
    ],
    [
        "json/fidelity/vis-transparency.json writes",
        "the vis writer writes a fitted vis-network ellipse as a sized dot, whose label the reader hangs below it (labelOffsetY 4)",
    ],
    [
        "json/fidelity/vis-unix.json writes",
        "the vis writer writes a fitted vis-network ellipse as a sized dot, whose label the reader hangs below it (labelOffsetY 4)",
    ],
    [
        "json/fidelity/vis-world.json writes",
        "the vis writer writes a fitted vis-network ellipse as a sized dot, whose label the reader hangs below it (labelOffsetY 4)",
    ],
    [
        "json/vis-dot-to-graph-softmaint.json writes",
        "the vis writer writes a fitted vis-network ellipse as a sized dot, whose label the reader hangs below it (labelOffsetY 4)",
    ],
    [
        "json/generated/cytoscape-graphty-written.json plans",
        "the Cytoscape.js writer rounds a label offset to 5 decimals (4.33333) where the rules give 4.333333333333334",
    ],
    [
        "json/generated/cytoscape-tamper-native-edited.json plans",
        "the Cytoscape.js writer rounds a label offset to 5 decimals (4.33333) where the rules give 4.333333333333334",
    ],
]);

/**
 * The inputs a check runs on, each with whether it is a known failure.
 * @param inputs - the inputs
 * @param check - the check
 * @returns the inputs that should pass and the known failures
 */
export function split<T extends { readonly name: string }>(
    inputs: readonly T[],
    check: "plans" | "writes",
): { readonly pass: (readonly [string, T])[]; readonly fail: (readonly [string, T])[] } {
    const rows = inputs.map((input) => [input.name, input] as const);
    const isKnown = ([name]: readonly [string, T]): boolean => KNOWN_FAILURES.has(`${name} ${check}`);
    return { pass: rows.filter((r) => !isKnown(r)), fail: rows.filter(isKnown) };
}

/**
 * The largest member of a generated series, by the smaller member whose rules are the same kinds: its round trip
 * writes, reads back and compares every element, and leaves the checks that do not grow with the graph (the fixed
 * point, the outside edit, the hostile blocks) to the smaller one, which saves nine whole exports and imports.
 * DOT's random-10000 has a self-loop and a parallel pair, which Graphviz draws bent, and random-1000 has neither, so
 * its smaller member is a cut of it that keeps them.
 */
export const SCALE_POINTS: ReadonlyMap<string, string> = new Map([
    ["graphml/generated/scale-5000.graphml.gz", "graphml/generated/scale-500.graphml.gz"],
    ["gexf/generated/random-all-6000.gexf.gz", "gexf/generated/random-all-600.gexf"],
    [RANDOM_10000, RANDOM_10000_CUT],
]);

/**
 * A format's inputs, each read once however many checks use it.
 * @param format - the format
 * @returns the inputs
 */
export function sharedInputs(format: StyleFormat): StyleInput[] {
    return formatInputs(format).map((input) => {
        let loaded: Promise<LoadedGraph> | undefined;
        return { ...input, load: () => (loaded ??= input.load()) };
    });
}

/**
 * The round trip and hostile-block checks of every format with a style writer, on one slice of each format's inputs.
 * @param slice - which slice, from 0
 */
export function describeWrites(slice: number): void {
    const writing = FORMATS.flatMap((f) => (f.writer === undefined ? [] : [[f.name, f, f.writer] as const]));
    describe.each(writing)("%s", (_name, format, writer) => {
        const inputs = sharedInputs(format).filter((_input, i) => i % WRITE_SLICES === slice);
        const writes = split(inputs, "writes");
        const write = async (input: (typeof inputs)[number]): Promise<void> => {
            const loaded = await input.load();
            const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report);
            const full = !SCALE_POINTS.has(input.name);
            expect(ex === null ? [] : await roundTrip(writer, loaded, ex, full)).toEqual([]);
        };
        it.each(writes.pass)("%s writes styles that read back as the same rules and values", (_name, input) =>
            write(input),
        );
        it.each(inputs.filter((input) => !SCALE_POINTS.has(input.name)).map((input) => [input.name, input] as const))(
            "%s ignores a hostile graphty.styles block in the written file",
            async (_input, input) => {
                const loaded = await input.load();
                const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report);
                expect(ex === null ? [] : await checkHostileBlocks(writer, loaded, ex)).toEqual([]);
            },
        );
        if (writes.fail.length > 0) {
            it.fails.each(writes.fail)(
                "%s writes styles that read back as the same rules and values (known failure)",
                (_n, i) => write(i),
            );
        }
    });
}

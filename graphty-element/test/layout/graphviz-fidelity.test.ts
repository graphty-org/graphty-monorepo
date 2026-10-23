/**
 * @file The Graphviz layouts on 20 files of graph-io's DOT corpus, against two recordings made by
 * `scripts/record-graphviz-fixtures.ts`:
 *
 * - the same library (`@hpcc-js/wasm-graphviz`) the element runs: exactly equal for dot, neato,
 *   circo, twopi, osage and patchwork, within 1 point for fdp and sfdp;
 * - native Graphviz 16.1.0 (the command line, built without pango and run with the `qsort` the
 *   WebAssembly build uses): after both drawings are normalized to their bounding box, within
 *   1e-6 of its size for dot, neato, circo, twopi, osage and patchwork, which in practice means
 *   the same numbers.
 *
 * fdp and sfdp are not held to the command line. Both are numerically sensitive: fdp's drawings
 * differ from native in 13 of the 20 files, and sfdp's in all 20 (the native build has no
 * triangulation library, which sfdp's default overlap removal uses). Measured with Procrustes
 * alignment, the WebAssembly drawing is as far from native as native is from itself with another
 * start seed, so the difference is the engine's sensitivity, not a wrong engine.
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import { dotImporter } from "@graphty/graph-io/dot";
import { assert, describe, it } from "vitest";

import { GRAPHVIZ_ENGINES, type GraphvizEngine } from "../../src/layout/graphviz/engines";
import { fromJson } from "../../src/layout/graphviz/fromJson";
import { layout } from "../../src/layout/graphviz/loader";
import { POINTS_PER_UNIT, toDot } from "../../src/layout/graphviz/toDot";

const FIXTURES = resolve(import.meta.dirname, "graphviz-fixtures");
const CORPUS = resolve(import.meta.dirname, "../../../graph-io/test/conformance/fixtures/dot");

/** One recorded file. */
interface Fixture {
    readonly file: string;
    readonly nodes: number;
    readonly engines: Readonly<
        Record<GraphvizEngine, { readonly wasm: readonly number[]; readonly cli: readonly number[] }>
    >;
}

/** The engines whose answers are exact. */
const EXACT: ReadonlySet<GraphvizEngine> = new Set(["dot", "neato", "circo", "twopi", "osage", "patchwork"]);

/** How far fdp and sfdp may move from the recording: one point, in scene units. */
const ONE_POINT = 1 / POINTS_PER_UNIT;

/** How far, as a fraction of the bounding box, the exact engines may be from the command line. */
const CLI_TOLERANCE = 1e-6;

/**
 * Positions shifted to the bounding box's corner and divided by its larger side.
 * @param positions - two numbers per row
 * @returns the normalized positions
 */
function normalized(positions: ArrayLike<number>): number[] {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 2) {
        x0 = Math.min(x0, positions[i]);
        x1 = Math.max(x1, positions[i]);
        y0 = Math.min(y0, positions[i + 1]);
        y1 = Math.max(y1, positions[i + 1]);
    }

    const size = Math.max(x1 - x0, y1 - y0) || 1;
    return Array.from(positions, (v, i) => (v - (i % 2 === 0 ? x0 : y0)) / size);
}

/**
 * The largest distance between corresponding points.
 * @param a - two numbers per row
 * @param b - two numbers per row
 * @returns the distance
 */
function largestGap(a: ArrayLike<number>, b: ArrayLike<number>): number {
    let gap = 0;
    for (let i = 0; i < a.length; i += 2) {
        gap = Math.max(gap, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1]));
    }

    return gap;
}

const fixtures: Fixture[] = readdirSync(FIXTURES)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(resolve(FIXTURES, name), "utf8")) as Fixture);

describe("Graphviz layouts of the DOT corpus", () => {
    it("records 20 files", () => {
        assert.strictEqual(fixtures.length, 20);
    });

    for (const fixture of fixtures) {
        it(`${fixture.file}: every engine matches the library's recording and the command line`, async () => {
            const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
            await dotImporter.import(readFileSync(resolve(CORPUS, fixture.file)), builder, { ids: "keep" });
            const snapshot = builder.freeze();
            assert.strictEqual(snapshot.nodeCount, fixture.nodes);
            const dot = toDot(snapshot, {});

            for (const engine of GRAPHVIZ_ENGINES) {
                const reply = await layout(dot, engine);
                assert.isTrue(reply.ok, `${engine}: ${JSON.stringify(reply)}`);
                const positions = reply.ok ? fromJson(reply.json, snapshot.nodeCount) : new Float32Array(0);
                const recorded = fixture.engines[engine];
                if (EXACT.has(engine)) {
                    assert.deepEqual(Array.from(positions), recorded.wasm, `${engine} equals the library's recording`);
                    assert.isAtMost(
                        largestGap(normalized(positions), normalized(recorded.cli)),
                        CLI_TOLERANCE,
                        `${engine} matches the Graphviz command line`,
                    );
                } else {
                    assert.isAtMost(largestGap(positions, recorded.wasm), ONE_POINT, `${engine} within 1pt`);
                }
            }
        });
    }
});

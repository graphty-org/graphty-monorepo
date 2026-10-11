import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fromEdgeArrays } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { type LayoutResult, radial, shell, type ShellRotate } from "../src";

interface Case {
    kind: "shell" | "radial";
    name: string;
    n: number;
    edges: [number, number][];
    root: number | null;
    nlist: number[][];
    rotate: number;
    /** networkx's shell_layout with `rotate`. */
    positions: number[][];
    /** networkx's shell_layout with its default rotate, pi / shells. */
    defaultRotate: number[][];
}

// Located from the working directory, as the other networkx fixtures are (happy-dom rewrites import.meta.url).
const fixture = JSON.parse(
    readFileSync(resolve(process.cwd(), "test/fixtures/networkx/shell-radial.json"), "utf8"),
) as { networkx: string; cases: Case[] };

/** Runs the case's layout with `rotate`. */
const run = (c: Case, rotate: ShellRotate): LayoutResult => {
    const s = fromEdgeArrays({
        directed: false,
        nodeCount: c.n,
        src: Uint32Array.from(c.edges.map((e) => e[0])),
        dst: Uint32Array.from(c.edges.map((e) => e[1])),
    });
    return c.kind === "shell" ? shell(s, { nlist: c.nlist, rotate }) : radial(s, { root: c.root, rotate });
};

/** Asserts `r` is networkx's positions, which radial stretches so its outermost ring lands on scale. */
const matches = (c: Case, r: LayoutResult, expected: number[][]): void => {
    const m = c.nlist.length;
    const stretch = c.kind === "radial" && m > 1 ? m / (m - 1) : 1;
    expected.forEach(([x, y], i) => {
        // networkx spaces each shell's angles in float32
        assert.closeTo(r.positions[2 * i], x * stretch, 1e-6, `node ${i} x`);
        assert.closeTo(r.positions[2 * i + 1], y * stretch, 1e-6, `node ${i} y`);
    });
};

describe(`shell and radial rotate against networkx ${fixture.networkx} shell_layout`, () => {
    for (const c of fixture.cases) {
        it(`${c.kind}: ${c.name}, rotate ${c.rotate}`, () => {
            matches(c, run(c, c.rotate), c.positions);
        });

        it(`${c.kind}: ${c.name}, networkx's default rotate`, () => {
            matches(c, run(c, "networkx"), c.defaultRotate);
            matches(c, run(c, Math.PI / c.nlist.length), c.defaultRotate);
        });
    }

    it("rejects a rotate that is not a finite number", () => {
        const s = fromEdgeArrays({ directed: false, nodeCount: 3, src: new Uint32Array(0), dst: new Uint32Array(0) });
        assert.throws(() => shell(s, { rotate: Number.NaN }), /rotate/);
        assert.throws(() => radial(s, { rotate: Number.POSITIVE_INFINITY }), /rotate/);
    });
});

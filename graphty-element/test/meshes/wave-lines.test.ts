/**
 * @file Sine-wave and zigzag lines and borders drawn with a swing and a period of their own (`line.waveAmplitude`,
 * `line.wavePeriod`, `border.waveAmplitude`, `border.wavePeriod`), and the contiguous-arrow border, as Cytoscape
 * desktop draws them (`ding-presentation-impl` `SineWaveStroke`, `ZigzagStroke`, `ContiguousArrowStroke`): a sine
 * wave a crest and a trough of quadratic arcs a period, a zigzag turning every half period from a quarter period on,
 * and a chain of chevrons three border widths apart.
 */
import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import {
    borderRing,
    piecesThickness,
    type Point2,
    type RingPiece,
    sineWavePeriod,
    zigzagPeriod,
} from "../../src/meshes/shapeOutlines";

/** A circle of radius r as an outline, counter-clockwise. */
const circle = (r: number, n = 128): Point2[] =>
    Array.from({ length: n }, (_, i) => [r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);

/** The points of a piece nearest an x, on each edge. */
const at = (piece: RingPiece, x: number): [Point2, Point2] => {
    const i = piece.inner.reduce(
        (best, p, k) => (Math.abs(p[0] - x) < Math.abs(piece.inner[best][0] - x) ? k : best),
        0,
    );
    return [piece.inner[i], piece.outer[i]];
};

describe("a sine wave's period", () => {
    // Cytoscape's sine wave for a line 3 wide: quadTo(5, 13, 10, 3) and quadTo(15, -13, 20, 3) above the path,
    // the same arcs through 0 below it, centered here on the path
    const period = sineWavePeriod(10, 20, 3);

    test("runs a period along its path, its band as wide as the line where it meets the path", () => {
        const xs = period.inner.map(([x]) => x);
        assert.closeTo(Math.min(...xs), -10, 1e-9);
        assert.closeTo(Math.max(...xs), 10, 1e-9);
        for (const x of [-10, 0, 10]) {
            const [inner, outer] = at(period, x);
            assert.closeTo(outer[1] - inner[1], 3, 1e-9, `band at ${String(x)}`);
        }
    });

    test("swings to its crest and trough as Java2D's quadratic arcs do, its band half as wide there", () => {
        const [crestIn, crestOut] = at(period, -5);
        assert.closeTo(crestIn[1], 6.5 - 1.5, 1e-9);
        assert.closeTo(crestOut[1], 6.5 + 1.5 - 1.5, 1e-9);
        const [troughIn, troughOut] = at(period, 5);
        assert.closeTo(troughIn[1], -6.5 - 1.5, 1e-9);
        assert.closeTo(troughOut[1] - troughIn[1], 1.5, 1e-9);
    });
});

describe("a zigzag's period", () => {
    test("turns a quarter and three quarters of a period on, the swing to either side, a line its width thick", () => {
        const piece = zigzagPeriod(10, 20, 3);
        const middle = piece.inner.map((p, i): Point2 => [
            (p[0] + piece.outer[i][0]) / 2,
            (p[1] + piece.outer[i][1]) / 2,
        ]);
        assert.deepEqual(
            middle.map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]),
            [
                [0, 0],
                [5, -10],
                [15, 10],
                [20, 0],
            ],
        );
        // each straight side is the line's width across
        const [a, b] = [piece.inner[0], piece.outer[0]];
        assert.closeTo(Math.hypot(b[0] - a[0], b[1] - a[1]), 3, 1e-9);
    });

    test("stops at its first or second turn, capped square half the line's width past it where the line ends", () => {
        assert.lengthOf(zigzagPeriod(10, 20, 3, { stretch: "first-turn" }).inner, 2);
        assert.lengthOf(zigzagPeriod(10, 20, 3, { stretch: "second-turn" }).inner, 3);
        const capped = zigzagPeriod(10, 20, 3, { stretch: "first-turn", startCap: true });
        const [ix, iy] = capped.inner[0];
        const [ox, oy] = capped.outer[0];
        // the start moved half the width back along the first side, (5, -10) from the path
        const back = -(1.5 / Math.hypot(5, 10));
        assert.closeTo((ix + ox) / 2, 5 * back, 1e-9);
        assert.closeTo((iy + oy) / 2, -10 * back, 1e-9);
    });
});

describe("a border drawn with a wave of its own", () => {
    test("a zigzag border is one closed line its width thick, swinging past the ring", () => {
        const pieces = borderRing(circle(14), 4, "zigzag", { amplitude: 10, period: 20 });
        assert.lengthOf(pieces, 1);
        assert.isTrue(pieces[0].closed);
        assert.closeTo(piecesThickness(pieces), 4, 0.05);
        const reach = Math.max(...pieces[0].outer.concat(pieces[0].inner).map(([x, y]) => Math.hypot(x, y)));
        // the ring's middle is 16 out; its turns swing 10 past it and its spikes further
        assert.isAbove(reach, 26);
    });

    test("a sine-wave border is one straight period every period round the ring, looping out past it", () => {
        // the ring's middle is a circle of radius 16, about 100 round: periods at 0, 20, ... 100
        const pieces = borderRing(circle(14), 4, "sinewave", { amplitude: 10, period: 20 });
        assert.lengthOf(pieces, 6);
        assert.closeTo(piecesThickness(pieces), 1.34, 0.05);
    });

    test("without one, a zigzag border waves within its ring as before", () => {
        const pieces = borderRing(circle(14), 4, "zigzag");
        const reach = Math.max(...pieces.flatMap((p) => p.outer.concat(p.inner)).map(([x, y]) => Math.hypot(x, y)));
        assert.isAtMost(reach, 18 + 1e-3);
    });

    test("a contiguous-arrow border is a chain of chevrons, one every three border widths", () => {
        const pieces = borderRing(circle(14), 4, "contiguous-arrow");
        // a bar and two arms an arrow, round a middle of radius 16 (about 100 round): arrows at 0, 12, ... 96
        assert.lengthOf(pieces, 3 * 9);
        const reach = Math.max(...pieces.flatMap((p) => p.outer.concat(p.inner)).map(([x, y]) => Math.hypot(x, y)));
        // the arms reach two widths past the ring's middle
        assert.closeTo(reach, Math.hypot(16 + 8, 6), 1);
    });
});

describe("an edge drawn with a wave of its own", () => {
    let scene: Scene;
    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });
    afterEach(() => {
        scene.getEngine().dispose();
    });

    const line = (pattern: "sinewave" | "zigzag", length: number): PatternedLineMesh =>
        new PatternedLineMesh(pattern, Vector3.Zero(), new Vector3(length, 0, 0), scene, {
            width: 3,
            color: "#505050",
            opacity: 1,
            is2DMode: true,
            wave: { amplitude: 10, period: 20 },
        });

    test("a sine wave is a period centered every period from its start while one fits, wherever it was laid", () => {
        const wave = line("sinewave", 65.6);
        // periods centered at 0, 20, 40, 60
        assert.lengthOf(wave.elements, 4);
        assert.deepEqual(
            wave.drawnEnds()?.map((p) => Math.round(p.x * 1e6) / 1e6),
            [-10, 70],
        );
        // laid again longer, it holds the periods that now fit, not one fewer
        wave.update(Vector3.Zero(), new Vector3(85, 0, 0));
        assert.lengthOf(wave.elements, 5);
    });

    test("a zigzag stops at its last turn, capped, half a period short of its end or less", () => {
        // turns at 5, 15, ..., 55 fit in 64.5: six, three periods, the last to its second turn
        const zig = line("zigzag", 64.5);
        assert.lengthOf(zig.elements, 3);
        const ends = zig.drawnEnds()?.map((p) => p.x) ?? [];
        // its last turn is 55 along, its square cap reaching on past it
        assert.isAbove(ends[1], 55);
        assert.isBelow(ends[1], 58);
        assert.isBelow(ends[0], 0);
    });
});

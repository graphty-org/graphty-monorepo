/**
 * @file A patterned line draws a bounded number of pieces (issue #4257): an infinite or non-finite length or end
 * point lays no unbounded pattern, a huge one spreads its pieces out to the cap rather than multiplying them, and a
 * line of a realistic length draws exactly the pieces it always did.
 */
import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { discreteMeshCount, discreteMeshOffsets, PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import { PATTERN_DEFINITIONS, type PatternType } from "../../src/meshes/PatternedLineRenderer";

/** The most pieces a line may draw. */
const CAP = 65536;

const PATTERNS = Object.keys(PATTERN_DEFINITIONS) as PatternType[];

describe("the piece count of a discrete pattern", () => {
    test("is one for a length that is not finite", () => {
        for (const length of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
            assert.strictEqual(discreteMeshCount(length, 0.5), 1, String(length));
        }
    });

    test("stops at the cap for a huge length, a zero element width or a huge pattern count", () => {
        assert.strictEqual(discreteMeshCount(1e12, 0.5), CAP);
        assert.strictEqual(discreteMeshCount(10, 0), CAP);
        assert.strictEqual(discreteMeshCount(10, 0.5, Number.POSITIVE_INFINITY), CAP);
        assert.strictEqual(discreteMeshCount(10, 0.5, 1e9), CAP);
    });

    test("is unchanged for realistic lengths", () => {
        // two boundary elements and as many more as fit 1.5 element widths apart
        for (const [length, width] of [
            [10, 0.2],
            [300, 0.2],
            [2000, 0.025],
            [19000, 0.2],
        ] as const) {
            const expected = 2 + Math.max(0, Math.floor((length - 2 * width - 0.5 * width) / (1.5 * width)));
            assert.strictEqual(discreteMeshCount(length, width), expected, `${String(length)} / ${String(width)}`);
        }
    });
});

describe("a patterned line of extreme length", () => {
    let scene: Scene;
    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });
    afterEach(() => {
        scene.getEngine().dispose();
    });

    const options = { width: 0.5, color: "#505050", opacity: 1 };
    const wave = { amplitude: 0.2, period: 0.4 };

    const allFinite = (mesh: PatternedLineMesh): boolean =>
        mesh.elements.every((e) => e.position.asArray().every((v) => Number.isFinite(v)));

    for (const pattern of PATTERNS) {
        test(`${pattern}: an infinite or not-a-number end point lays a bounded, finite line`, () => {
            const bad = [
                new Vector3(Number.POSITIVE_INFINITY, 0, 0),
                new Vector3(0, Number.NaN, 0),
                new Vector3(1e308, 0, 0).scale(10),
            ];
            for (const end of bad) {
                const made = new PatternedLineMesh(pattern, Vector3.Zero(), end, scene, options);
                assert.isAtMost(made.elements.length, CAP);
                assert.isTrue(allFinite(made), `${pattern} made with ${end.toString()}`);

                const updated = new PatternedLineMesh(pattern, Vector3.Zero(), new Vector3(5, 0, 0), scene, options);
                updated.update(Vector3.Zero(), end);
                assert.isAtMost(updated.elements.length, CAP);
                assert.isTrue(allFinite(updated), `${pattern} updated to ${end.toString()}`);

                // a route through a far-off bend lays the line along its finite points
                updated.updatePath([Vector3.Zero(), end, new Vector3(3, 0, 0)]);
                assert.isAtMost(updated.elements.length, CAP);
                assert.isTrue(allFinite(updated));
                made.dispose();
                updated.dispose();
            }
        });
    }

    for (const [label, pattern, waveShape] of [
        ["dot", "dot", undefined],
        ["zigzag", "zigzag", undefined],
        ["sinewave with a period of its own", "sinewave", wave],
        ["zigzag with a period of its own", "zigzag", wave],
    ] as const) {
        test(`${label}: a huge length spreads the pieces out to the cap, from one end to the other`, () => {
            const length = 1e6;
            const mesh = new PatternedLineMesh(pattern, Vector3.Zero(), new Vector3(1, 0, 0), scene, {
                ...options,
                wave: waveShape,
            });
            mesh.update(Vector3.Zero(), new Vector3(length, 0, 0));
            const n = mesh.elements.length;
            assert.isAtMost(n, CAP);
            assert.isAtLeast(n, CAP - 2, "the pattern is kept, not dropped");
            const xs = mesh.elements.map((e) => e.position.x);
            assert.isBelow(xs[0], length / 1000);
            assert.isAbove(xs[n - 1], length * 0.999);
            mesh.dispose();
        });
    }

    test("a zigzag of a realistic length still sits its segments 0.75 apart", () => {
        const mesh = new PatternedLineMesh("zigzag", Vector3.Zero(), new Vector3(300, 0, 0), scene, options);
        assert.strictEqual(mesh.elements.length, 400);
        mesh.elements.forEach((e, i) => {
            assert.closeTo(e.position.x, i * 0.75, 1e-9);
        });
    });

    test("a dashed line of a realistic length lays its dashes where it always did", () => {
        const length = 300;
        const mesh = new PatternedLineMesh("dash", Vector3.Zero(), new Vector3(length, 0, 0), scene, options);
        // a dash is a box three widths long
        const expected = discreteMeshOffsets(length, 1.5, discreteMeshCount(length, 1.5));
        assert.strictEqual(mesh.elements.length, expected.length);
        mesh.elements.forEach((e, i) => {
            assert.closeTo(e.position.x, expected[i], 1e-4); // positions are stored as float32
        });
    });
});

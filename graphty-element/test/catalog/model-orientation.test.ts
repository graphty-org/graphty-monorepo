/**
 * `turnModelOrientation` (./catalog): every quarter turn of every one of the 24 orientations lands
 * where the template builder (src/models/prepareTemplate.ts) would draw the model turned that way.
 */

import { Matrix } from "@babylonjs/core/Maths/math.vector.js";
import { assert, describe, it } from "vitest";

import { type ModelUpAxis, turnModelOrientation } from "../../catalog";

const AXES: readonly ModelUpAxis[] = ["y", "z", "-y", "-z", "x", "-x"];
const TURNS = [0, 90, 180, -90];

/**
 * The rotation the template builder bakes in, written as it writes it.
 * @param up - The file's up axis.
 * @param turn - The turn in degrees.
 * @returns The matrix.
 */
function orientation(up: ModelUpAxis, turn: number): Matrix {
    const quarter = Math.PI / 2;
    const tilt: Record<ModelUpAxis, Matrix> = {
        y: Matrix.Identity(),
        "-y": Matrix.RotationX(Math.PI),
        z: Matrix.RotationX(-quarter),
        "-z": Matrix.RotationX(quarter),
        x: Matrix.RotationZ(quarter),
        "-x": Matrix.RotationZ(-quarter),
    };
    return tilt[up].multiply(Matrix.RotationY(Math.PI + (turn * Math.PI) / 180));
}

/**
 * Whether two rotations are the same, to rounding.
 * @param a - One.
 * @param b - The other.
 * @returns True when they are.
 */
function same(a: Matrix, b: Matrix): boolean {
    return a.asArray().every((value, i) => Math.abs(value - b.asArray()[i]) < 1e-6);
}

describe("turnModelOrientation", () => {
    for (const up of AXES) {
        for (const turn of TURNS) {
            it(`turns ${up} at ${String(turn)} degrees the way the template draws it`, () => {
                const left = turnModelOrientation({ up, turn }, "left");
                assert.isTrue(same(orientation(left.up, left.turn), orientation(up, turn + 90)));
                const right = turnModelOrientation({ up, turn }, "right");
                assert.isTrue(same(orientation(right.up, right.turn), orientation(up, turn - 90)));

                const forward = turnModelOrientation({ up, turn }, "forward");
                const tipped = orientation(up, turn).multiply(Matrix.RotationX(-Math.PI / 2));
                assert.isTrue(same(orientation(forward.up, forward.turn), tipped));
                const back = turnModelOrientation(forward, "back");
                assert.isTrue(same(orientation(back.up, back.turn), orientation(up, turn)));
            });
        }
    }

    it("reaches all 24 orientations from upright", () => {
        const seen = new Set<string>();
        const queue = [{ up: "y" as ModelUpAxis, turn: 0 }];
        while (queue.length > 0) {
            const next = queue.shift();
            if (next === undefined || seen.has(`${next.up} ${String(next.turn)}`)) {
                continue;
            }
            seen.add(`${next.up} ${String(next.turn)}`);
            for (const step of ["left", "right", "forward", "back"] as const) {
                queue.push(turnModelOrientation(next, step));
            }
        }
        assert.strictEqual(seen.size, 24);
    });

    it("settles a detected up axis, and keeps turns between -180 and 180", () => {
        assert.deepStrictEqual(turnModelOrientation({ up: "detected", turn: 180 }, "left", "z"), {
            up: "z",
            turn: -90,
        });
        assert.deepStrictEqual(turnModelOrientation({ up: "y", turn: 0 }, "forward"), { up: "-z", turn: 0 });
    });
});

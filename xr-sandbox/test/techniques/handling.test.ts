import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { describe, expect, it } from "vitest";

import { MAX_SCALE, MIN_SCALE, type Pose, startTwoHand, twoHandPose } from "../../src/techniques/handling/two-hand";

const pose = (): Pose => ({
    position: new Vector3(0.1, 1.4, 0.8),
    rotation: Quaternion.RotationYawPitchRoll(0.3, 0.1, 0),
    scale: 1,
});
const blank = (): Pose => ({ position: new Vector3(), rotation: new Quaternion(), scale: 0 });
const L = new Vector3(-0.15, 1.3, 0.5);
const R = new Vector3(0.15, 1.3, 0.5);

/** Where a graph-local point lands under a pose. */
const place = (p: Pose, local: Vector3): Vector3 =>
    local.scale(p.scale).rotateByQuaternionToRef(p.rotation, new Vector3()).addInPlace(p.position);
/** The graph-local point under a world point at a pose. */
const local = (p: Pose, world: Vector3): Vector3 =>
    world
        .subtract(p.position)
        .rotateByQuaternionToRef(Quaternion.Inverse(p.rotation), new Vector3())
        .scaleInPlace(1 / p.scale);

describe("handling: ours two-hand", () => {
    it("scales by the ratio of hand distances", () => {
        const s = startTwoHand(L, R, pose());
        const out = twoHandPose(s, new Vector3(-0.3, 1.3, 0.5), new Vector3(0.3, 1.3, 0.5), blank());
        expect(out.scale).toBeCloseTo(2, 9);
    });

    it("clamps scale at 0.2x and 5x", () => {
        const s = startTwoHand(L, R, pose());
        const far = twoHandPose(s, new Vector3(-1.5, 1.3, 0.5), new Vector3(1.5, 1.3, 0.5), blank());
        expect(far.scale).toBe(MAX_SCALE);
        const near = twoHandPose(s, new Vector3(-0.01, 1.3, 0.5), new Vector3(0.01, 1.3, 0.5), blank());
        expect(near.scale).toBe(MIN_SCALE);
    });

    it("pivots about the hands' midpoint: the graph point under it follows it", () => {
        const start = pose();
        const s = startTwoHand(L, R, start);
        const under = local(start, L.add(R).scale(0.5));
        // Move, spread and turn the hands at once.
        const l = new Vector3(-0.2, 1.5, 0.45);
        const r = new Vector3(0.25, 1.35, 0.75);
        const out = twoHandPose(s, l, r, blank());
        const mid = l.add(r).scale(0.5);
        expect(Vector3.Distance(place(out, under), mid)).toBeLessThan(1e-6);
    });

    it("turns with the hands: the start hand line rotates onto the line now", () => {
        const s = startTwoHand(L, R, pose());
        const l = new Vector3(-0.1, 1.2, 0.4);
        const r = new Vector3(0.1, 1.4, 0.6);
        const out = twoHandPose(s, l, r, blank());
        const turn = out.rotation.multiply(Quaternion.Inverse(s.pose.rotation));
        const was = R.subtract(L).normalize().rotateByQuaternionToRef(turn, new Vector3());
        expect(Vector3.Distance(was, r.subtract(l).normalize())).toBeLessThan(1e-6);
    });

    it("has no feedback: same hands give the same pose however often it runs, whatever the graph did", () => {
        const s = startTwoHand(L, R, pose());
        const l = new Vector3(-0.32, 1.31, 0.52);
        const r = new Vector3(0.29, 1.28, 0.49);
        const a = twoHandPose(s, l, r, blank());
        let b = blank();
        for (let i = 0; i < 100; i++) {
            // Feeding the output back as if it were the graph's pose changes nothing.
            b = twoHandPose(s, l, r, b);
        }
        expect(b.scale).toBe(a.scale);
        expect(Vector3.Distance(a.position, b.position)).toBe(0);
        expect(Quaternion.Dot(a.rotation, b.rotation)).toBeCloseTo(1, 12);
    });

    it("holds still for still hands, and ignores hands closer than 1 mm", () => {
        const start = pose();
        const s = startTwoHand(L, R, start);
        const still = twoHandPose(s, L, R, blank());
        expect(Vector3.Distance(still.position, start.position)).toBeLessThan(1e-12);
        expect(still.scale).toBe(1);
        const p = new Vector3(0, 1.3, 0.5);
        const touching = twoHandPose(s, p, p.add(new Vector3(1e-4, 0, 0)), blank());
        expect(touching.scale).toBe(1);
    });
});

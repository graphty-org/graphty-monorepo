import { assert, describe, it } from "vitest";

import { twoHandGestureDelta } from "../../extend";

describe("twoHandGestureDelta from ./extend, over plain vectors", () => {
    const right = { x: 1, y: 0, z: 0 };

    it("zooms out when the hands move apart, clamped to 10% a frame", () => {
        assert.closeTo(twoHandGestureDelta(0.4, right, 0.41, right).zoom, 0.98, 1e-12);
        assert.closeTo(twoHandGestureDelta(0.2, right, 1.2, right).zoom, 0.9, 1e-12);
        assert.isNull(twoHandGestureDelta(0.4, right, 0.5, right).axis);
    });

    it("turns a quarter turn about +Y as a plain unit axis", () => {
        const { axis, angle } = twoHandGestureDelta(0.4, right, 0.4, { x: 0, y: 0, z: -1 });

        assert.closeTo(axis?.x ?? NaN, 0, 1e-12);
        assert.closeTo(axis?.y ?? NaN, 1, 1e-12);
        assert.closeTo(axis?.z ?? NaN, 0, 1e-12);
        assert.closeTo(angle, -Math.PI / 2, 1e-12);
    });
});

import { assert, describe, it } from "vitest";

import type { LocationMapFrame } from "../../src/layout/locationMap/place";
import { frameFacts, throttle } from "../../src/managers/viewLog";

describe("viewLog", () => {
    it("throttle opens at most once per interval", () => {
        let t = 0;
        const due = throttle(250, () => t);
        const opened: number[] = [];
        for (t = 0; t <= 1000; t += 50) {
            if (due()) {
                opened.push(t);
            }
        }

        assert.deepEqual(opened, [0, 250, 500, 750, 1000]);
    });

    it("frameFacts gives a globe's center across the antimeridian, its extent and radius", () => {
        const frame = {
            surface: "globe",
            dimensions: 3,
            bounds: [
                [170, -10],
                [-170, 30],
            ],
            size: 50,
            mapScale: 1,
            radius: 40,
            world: false,
        } as unknown as LocationMapFrame;

        const facts = frameFacts(frame);
        assert.deepEqual(facts.center, [180, 10]);
        assert.deepEqual(facts.extent, [20, 40]);
        assert.equal(facts.radius, 40);
        assert.equal(facts.world, false);
        assert.deepEqual(frameFacts(null), { surface: null });
    });
});

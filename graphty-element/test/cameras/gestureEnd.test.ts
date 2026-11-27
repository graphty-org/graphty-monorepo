import { assert, describe, it } from "vitest";

import { WHEEL_PAUSE_MS, WheelRun } from "../../src/cameras/gestureEnd";

describe("WheelRun", () => {
    it("keeps a burst spread over frames, with a frame or more between wheels, as one run", () => {
        const run = new WheelRun();
        // Five notches, each handed over a frame or two after the last, as a busy browser does.
        const ends = [0, 17, 50, 84, 101].flatMap((at) => {
            run.wheel(at);
            return [run.frame(at + 16), run.frame(at + 33)];
        });
        assert.notInclude(ends, true);
        assert.isFalse(run.frame(101 + WHEEL_PAUSE_MS - 1));
        assert.isTrue(run.frame(101 + WHEEL_PAUSE_MS), "ends once the wheel has rested");
        assert.isFalse(run.frame(101 + WHEEL_PAUSE_MS + 16), "ends once");
    });

    it("ends nothing without a wheel, and nothing after a reset", () => {
        const run = new WheelRun();
        assert.isFalse(run.frame(1000));
        run.wheel(0);
        run.reset();
        assert.isFalse(run.frame(WHEEL_PAUSE_MS * 2));
    });
});

import { describe, expect, it } from "vitest";

import { bindingFor, fromSettings, parseExtra } from "../../src/techniques/gestures/bindings";
import { BINDABLE, loadTemplates } from "../../src/techniques/gestures/poses";
import {
    createTracker,
    decode,
    distance,
    encode,
    handOf,
    mirror,
    normalize,
    type PoseEvent,
} from "../../src/techniques/gestures/recognizer";

const OPTS = { begin: 0.3, end: 0.45, holdMs: 150, minFrames: 3 };
const FRAME_MS = 1000 / 72;

/**
 * Run a tracker over a stream of frames.
 * @param frames - per frame: thumbs-up's distance (relax sits at 1), or a suppression reason
 * @returns every event, with its frame index
 */
const run = (frames: (number | string)[]): (PoseEvent & { frame: number })[] => {
    const t = createTracker(
        () => OPTS,
        (p) => p === "thumbs-up",
    );
    const out: (PoseEvent & { frame: number })[] = [];
    frames.forEach((f, frame) => {
        const ev = t.step(frame * FRAME_MS, typeof f === "string" ? f : { "thumbs-up": f, relax: 1 });
        if (ev) {
            out.push({ ...ev, frame });
        }
    });
    return out;
};
const held = (ms: number, d = 0.1): number[] => Array.from({ length: Math.round(ms / FRAME_MS) }, () => d);
const rest = (n: number): number[] => Array.from({ length: n }, () => 1.2);

describe("pose tracker: minimum hold and hysteresis", () => {
    it("a pose held 300 ms fires exactly once, after the hold, and ends on release", () => {
        const ev = run([...rest(5), ...held(300), ...rest(5)]);
        expect(ev.map((e) => e.type)).toEqual(["start", "end"]);
        expect((ev[0].frame - 5) * FRAME_MS).toBeGreaterThanOrEqual(150);
    });

    it("a pose held 100 ms fires nothing", () => {
        expect(run([...rest(5), ...held(100), ...rest(30)])).toEqual([]);
    });

    it("flickering every two frames between the pose and rest fires nothing", () => {
        const flicker = Array.from({ length: 120 }, (_, i) => (Math.floor(i / 2) % 2 === 0 ? 0.1 : 1.2));
        expect(run(flicker)).toEqual([]);
    });

    it("between begin and end an active pose stays on; past end it ends", () => {
        const ev = run([...held(200), ...held(500, 0.4), 0.5, ...rest(5)]);
        expect(ev.map((e) => e.type)).toEqual(["start", "end"]);
        expect(ev[1].frame).toBe(held(200).length + held(500).length);
    });

    it("between begin and end a pose that is not on never starts", () => {
        expect(run(held(1000, 0.35))).toEqual([]);
    });

    it("nothing fires while suppressed, and a suppressed active pose ends", () => {
        expect(run([...held(300).map(() => "pinching")])).toEqual([]);
        const ev = run([...held(300), "pinching", ...held(300)]);
        expect(ev.map((e) => [e.type, e.reason])).toEqual([
            ["start", undefined],
            ["end", "pinching"],
            ["start", undefined],
        ]);
    });

    it("a pose seen on only two samples never fires, however long apart (a stalled frame)", () => {
        const t = createTracker(
            () => OPTS,
            () => true,
        );
        expect(t.step(0, { "thumbs-up": 0.1 })).toBeNull();
        expect(t.step(400, { "thumbs-up": 0.1 })).toBeNull();
        expect(t.step(401, { "thumbs-up": 0.1 })?.type).toBe("start");
    });

    it("a pose that may not fire never becomes active", () => {
        const t = createTracker(
            () => OPTS,
            () => false,
        );
        for (let i = 0; i < 50; i++) {
            expect(t.step(i * FRAME_MS, { "thumbs-up": 0.05 })).toBeNull();
        }
    });
});

describe("templates (handy-work's matcher)", () => {
    const templates = loadTemplates();

    it("loads handy-work's shipped poses and the composed thumbs up, 25 joints each", () => {
        for (const name of [...BINDABLE, "fist", "relax", "flat"]) {
            expect(templates.get(name)?.[0], name).toBe(25);
        }
    });

    it("each template is its own best match, on both hands", () => {
        for (const side of ["left", "right"] as const) {
            for (const [name, t] of templates) {
                const live = normalize(Float32Array.from(handOf(t, side)));
                const best = [...templates].sort(
                    (a, b) => distance(a[1], side, live) - distance(b[1], side, live),
                )[0][0];
                expect(best, `${side} ${name}`).toBe(name);
            }
        }
    });

    it("a mirrored left thumbs up (what the emulated right hand shows) matches within the default", () => {
        const t = templates.get("thumbs-up");
        if (!t) {
            throw new Error("no thumbs-up template");
        }
        const live = normalize(mirror(handOf(t, "left")));
        const own = distance(t, "right", live);
        expect(own).toBeLessThan(OPTS.begin / 2);
        // The fist differs only in the thumb, so it is the nearest other pose; still clearly farther.
        expect(distance(templates.get("fist") ?? t, "right", live)).toBeGreaterThan(own + 0.15);
    });

    it("base64 round-trips a template", () => {
        const t = templates.get("shaka") ?? new Float32Array();
        expect(Array.from(decode(encode(t)))).toEqual(Array.from(t));
    });
});

describe("bindings", () => {
    const poses = [...loadTemplates().keys()];

    it("refuses palm-toward-face and palm-forward pinches with the reason", () => {
        const { bindings, refused } = parseExtra(
            "point@palm-face+pinch:undo; flat@palm-forward+pinch:redo; shaka@palm-up:redo",
            poses,
        );
        expect(refused.map((r) => r.definition)).toEqual([
            "point@palm-face+pinch:undo",
            "flat@palm-forward+pinch:redo",
        ]);
        expect(refused[0].reason).toMatch(/Quest's system gesture/);
        expect(refused[1].reason).toMatch(/Galaxy XR's navigation/);
        expect(bindings).toEqual([{ gesture: "shaka", kind: "pose", palm: "up", command: "redo", from: "extra" }]);
    });

    it("refuses the fist, unknown gestures and commands, and pinched poses", () => {
        const { bindings, refused } = parseExtra("fist:undo;wave:undo;shaka:dance;horns+pinch:undo;garbage", poses);
        expect(bindings).toEqual([]);
        expect(refused).toHaveLength(5);
    });

    it("settings bind poses and paired swipes; a palm-specific binding wins when the palm matches", () => {
        const values: Record<string, string> = {
            "thumbs-up": "next color",
            swipesLR: "undo / redo",
            swipesFB: "none",
            "tap-thumb": "clear selection",
        };
        const list = [
            ...parseExtra("thumbs-up@palm-up:undo", poses).bindings,
            ...fromSettings((k) => values[k] ?? "none", BINDABLE),
        ];
        expect(bindingFor(list, "thumbs-up", { up: false, face: false })?.command).toBe("next color");
        expect(bindingFor(list, "thumbs-up", { up: true, face: false })?.command).toBe("undo");
        expect(bindingFor(list, "swipe-right", { up: false, face: false })?.command).toBe("redo");
        expect(bindingFor(list, "swipe-forward", { up: false, face: false })).toBeNull();
        expect(bindingFor(list, "shaka", { up: false, face: false })).toBeNull();
    });
});

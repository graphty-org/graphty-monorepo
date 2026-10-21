/**
 * @file The layout transition registry, the `layoutTransition` setting, and the runner's clock
 * (design/rendering/shader-styles.md section 3.7). The clock is a stub of `performance.now`, so
 * progress is asserted from the readings handed to the runner, never from elapsed time.
 */

import type { Scene } from "@babylonjs/core/scene";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { clearRegisteredTransitionsForTesting, registerTransition } from "../../extend";
import { isGraphtyError } from "../../src/errors/GraphtyError";
import { createGraphSession } from "../../src/session";
import type { RenderQuality } from "../../src/session/shaders";
import {
    LayoutTransitionRunner,
    type TransitionHost,
    type TransitionSubject,
} from "../../src/transitions/LayoutTransitionRunner";
import { particlesPerNode } from "../../src/transitions/ParticleDrawable";
import { TRANSITION_PRESETS } from "../../src/transitions/presets";
import { transitionDescriptors } from "../../src/transitions/registry";

const LINEAR = {
    descriptor: { id: "test/linear", plainName: "Linear" },
    move: (t: number, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => ({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        z: from.z + (to.z - from.z) * t,
    }),
};

afterEach(() => {
    clearRegisteredTransitionsForTesting();
    vi.restoreAllMocks();
});

/**
 * The code a call threw.
 * @param call - The call.
 * @returns The code, or undefined when it did not throw a GraphtyError.
 */
function codeOf(call: () => void): string | undefined {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not a GraphtyError";
    }

    return undefined;
}

describe("registerTransition", () => {
    it("ships no presets yet, and lists a registered transition with its params defaulted", () => {
        assert.lengthOf(TRANSITION_PRESETS, 0);
        assert.deepEqual(transitionDescriptors(), []);
        registerTransition(LINEAR);
        const listed = transitionDescriptors();
        assert.deepEqual(listed, [{ id: "test/linear", plainName: "Linear", params: [] }]);
        assert.isTrue(Object.isFrozen(listed[0]));
        assert.strictEqual(transitionDescriptors(), listed, "the same array until a registration changes");
    });

    it("refuses a bare id, a missing move and an unknown drawable, naming the member", () => {
        assert.strictEqual(
            codeOf(() => registerTransition({ ...LINEAR, descriptor: { id: "glide", plainName: "G" } })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            codeOf(() => registerTransition({ descriptor: LINEAR.descriptor } as unknown as typeof LINEAR)),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            codeOf(() => registerTransition({ ...LINEAR, drawable: "smoke" as "particles" })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            codeOf(() => registerTransition({ ...LINEAR, descriptor: { id: "test/x", plainName: " " } })),
            "E_BAD_COMMAND",
        );
    });

    it("ignores the identical registration again, and refuses a different one when strict", () => {
        registerTransition(LINEAR);
        registerTransition(LINEAR);
        assert.lengthOf(transitionDescriptors(), 1);
        assert.strictEqual(
            codeOf(() => registerTransition({ ...LINEAR, move: (_t, _f, to) => to }, { strict: true })),
            "E_DUPLICATE_PLUGIN",
        );
    });

    it("is listed by session.catalog.transitions(), and the descriptor carries the drawable", () => {
        registerTransition({ ...LINEAR, drawable: "particles" });
        const session = createGraphSession();
        assert.deepEqual(
            session.catalog.transitions().map((descriptor) => [descriptor.id, descriptor.drawable]),
            [["test/linear", "particles"]],
        );
    });
});

describe("the layoutTransition setting", () => {
    it("is absent by default, set and cleared in undoable steps", async () => {
        const session = createGraphSession();
        assert.isUndefined(session.config.layoutTransition);
        await session.config.set({ layoutTransition: { transition: "test/linear", seconds: 1.5 } });
        assert.deepEqual(session.config.layoutTransition, { transition: "test/linear", seconds: 1.5 });
        await session.undo();
        assert.isUndefined(session.config.layoutTransition);
        await session.redo();
        await session.config.set({ layoutTransition: undefined });
        assert.isUndefined(session.config.layoutTransition);
    });

    it("refuses a value that is not a transition setting", async () => {
        const session = createGraphSession();
        let code: string | undefined;
        try {
            await session.config.set({ layoutTransition: { transition: "test/linear", seconds: -1 } });
        } catch (error) {
            code = isGraphtyError(error) ? error.code : undefined;
        }

        assert.strictEqual(code, "E_BAD_COMMAND");
    });
});

/** A node the runner can move, recording where it was drawn. */
class FakeNode implements TransitionSubject {
    readonly mesh: { position: { x: number; y: number; z: number }; computeWorldMatrix: () => void };
    readonly drawnRadius = 1;
    readonly paintedColor = null;
    writes = 0;

    /**
     * A node at a place.
     * @param index - Its index.
     * @param x - X.
     * @param y - Y.
     */
    constructor(
        readonly index: number,
        x: number,
        y: number,
    ) {
        this.mesh = { position: { x, y, z: 0 }, computeWorldMatrix: () => undefined };
    }

    setMeshPosition(x: number, y: number, z: number): void {
        this.writes++;
        this.mesh.position = { x, y, z };
    }
}

describe("LayoutTransitionRunner", () => {
    let now = 0;
    let config: ReturnType<TransitionHost["config"]> = undefined;
    let motion: RenderQuality["motion"] = "on";
    let running = true;
    let selected: FakeNode[] = [];
    const a = new FakeNode(0, 0, 0);
    const b = new FakeNode(1, 10, 0);
    const c = new FakeNode(2, 20, 0);

    beforeEach(() => {
        now = 1000;
        vi.spyOn(performance, "now").mockImplementation(() => now);
        config = { transition: "test/linear", seconds: 1 };
        motion = "on";
        running = true;
        selected = [];
        for (const [node, x] of [
            [a, 0],
            [b, 10],
            [c, 20],
        ] as const) {
            node.mesh.position = { x, y: 0, z: 0 };
        }

        registerTransition(LINEAR);
    });

    const runner = (): LayoutTransitionRunner =>
        new LayoutTransitionRunner({
            scene: () => ({}) as Scene,
            config: () => config,
            quality: () => ({ level: "high", motion, pasted: "on" }),
            nodes: () => [a, b, c],
            edges: () =>
                [
                    { srcNode: a, dstNode: b },
                    { srcNode: b, dstNode: c },
                ] as never,
            selected: () => selected,
            layoutRunning: () => running,
        });

    /**
     * One frame: every node placed at its target.
     * @param subject - The runner.
     * @param targets - Each node's target.
     * @returns Where each was drawn.
     */
    function frame(subject: LayoutTransitionRunner, targets: [FakeNode, number][]): number[] {
        subject.beginPass();
        const drawn = targets.map(([node, y]) => {
            const at = subject.place(node, { x: node.mesh.position.x, y, z: 0 });
            node.setMeshPosition(at.x, at.y, at.z ?? 0);
            return at.y;
        });
        subject.endPass();
        return drawn;
    }

    it("draws the target itself when no transition is set", () => {
        config = undefined;
        const subject = runner();
        subject.begin(subject.snapshot());
        assert.isFalse(subject.active);
        assert.deepEqual(frame(subject, [[a, 5]]), [5]);
    });

    it("draws the target itself when motion is off", () => {
        motion = "still";
        const subject = runner();
        assert.isNull(subject.snapshot());
    });

    it("starts its clock on the first frame a node moves, and lands exactly on the target", () => {
        const subject = runner();
        subject.begin(subject.snapshot());
        assert.isTrue(subject.active);
        // The new layout has not answered yet: nothing moves and the clock waits.
        assert.deepEqual(frame(subject, [[a, 0]]), [0]);
        now += 5000;
        assert.deepEqual(frame(subject, [[a, 10]]), [0], "the clock starts here, at t = 0");
        now += 500;
        assert.deepEqual(frame(subject, [[a, 10]]), [5], "half way at half the duration");
        now += 500;
        assert.deepEqual(frame(subject, [[a, 10]]), [10], "the target itself at the end");
        assert.isFalse(subject.active, "and the transition is over");
    });

    it("ends without moving when the layout finishes having moved nothing", () => {
        const subject = runner();
        subject.begin(subject.snapshot());
        running = false;
        frame(subject, [[a, 0]]);
        assert.isFalse(subject.active);
    });

    it("refuses an unknown transition and parameters it does not declare", () => {
        config = { transition: "test/nothing" };
        assert.isNull(runner().snapshot());
        config = { transition: "test/linear", params: { speed: 2 } };
        assert.isNull(runner().snapshot());
    });

    it("moves a node to the layout's place for a pick, and back", () => {
        const subject = runner();
        subject.begin(subject.snapshot());
        frame(subject, [[a, 10]]);
        now += 500;
        frame(subject, [[a, 10]]);
        assert.strictEqual(a.mesh.position.y, 5);
        const seen = subject.atLayout(() => a.mesh.position.y);
        assert.strictEqual(seen, 10, "the pick sees the layout's place");
        assert.strictEqual(a.mesh.position.y, 5, "the picture is put back");
    });

    it("tells move each node's seed, hops from the selection and distance from the middle", () => {
        const seen = new Map<number, unknown>();
        registerTransition({
            descriptor: { id: "test/spy", plainName: "Spy" },
            move: (_t, _from, to, node) => {
                seen.set(node.index, node);
                return to;
            },
        });
        config = { transition: "test/spy" };
        selected = [a];
        const subject = runner();
        subject.begin(subject.snapshot());
        frame(subject, [
            [a, 1],
            [b, 1],
            [c, 1],
        ]);
        const info = [0, 1, 2].map(
            (i) => seen.get(i) as { hopFromSelection: number; distanceFromCenter: number; seed: number },
        );
        assert.deepEqual(
            info.map((node) => node.hopFromSelection),
            [0, 0.5, 1],
        );
        assert.deepEqual(
            info.map((node) => node.distanceFromCenter),
            [1, 0, 1],
        );
        assert.isTrue(info.every((node) => node.seed >= 0 && node.seed < 1));
        assert.notStrictEqual(info[0].seed, info[1].seed);
    });

    it("keeps drawing where the layout puts a node when move throws or returns NaN", () => {
        registerTransition({
            descriptor: { id: "test/broken", plainName: "Broken" },
            move: () => ({ x: Number.NaN, y: 0, z: 0 }),
        });
        config = { transition: "test/broken" };
        const subject = runner();
        subject.begin(subject.snapshot());
        assert.deepEqual(frame(subject, [[a, 4]]), [4]);
    });
});

describe("particlesPerNode", () => {
    it("caps the cloud by quality, and draws none past one per node", () => {
        assert.strictEqual(particlesPerNode(100, undefined, "high"), 8);
        assert.strictEqual(particlesPerNode(100, 64, "high"), 32);
        assert.strictEqual(particlesPerNode(5000, 32, "high"), 12);
        assert.strictEqual(particlesPerNode(5000, 32, "low"), 3);
        assert.strictEqual(particlesPerNode(100_000, 8, "high"), 0);
    });
});

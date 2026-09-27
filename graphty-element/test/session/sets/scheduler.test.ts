/**
 * @file The re-resolution scheduler (design/sets/sets-design.md section 6.2), driven by hand
 * through an injected frame source: after a freeze the work is split across frames within a
 * counted per-frame budget, a watch keeps its previous resolution until its new one is ready, a
 * second freeze mid-way adds no work twice, and dispose cancels.
 */

import { assert, describe, it } from "vitest";

import { type MovedInput, SetsNotifier, type SetWatch } from "../../../src/session/sets/notify";

/** A frame source the test steps by hand. */
class Frames {
    readonly #waiting = new Set<() => void>();

    readonly source = (callback: () => void): (() => void) => {
        this.#waiting.add(callback);
        return () => {
            this.#waiting.delete(callback);
        };
    };

    /**
     * Requests outstanding.
     * @returns how many
     */
    get requested(): number {
        return this.#waiting.size;
    }

    /** Run one frame. */
    step(): void {
        const callbacks = [...this.#waiting];
        this.#waiting.clear();
        for (const callback of callbacks) {
            callback();
        }
    }
}

/** A fake store whose serial a test moves, standing for the snapshot every signature reads. */
interface World {
    serial: number;
}

/** A watch whose resolution is the serial it resolved against. */
interface Fake {
    readonly name: string;
    readonly watch: SetWatch<number>;
    /** The resolution it holds: its last `ready`. */
    current: number;
    /** Serials it resolved against, in order. */
    readonly resolved: number[];
    /** Inputs it was handed with each `ready`. */
    readonly moved: (readonly MovedInput[])[];
}

/**
 * A watch over the world.
 * @param world - What it reads.
 * @param name - For messages.
 * @param cost - Its per-resolution work.
 * @param reads - Whether its signature includes the serial.
 * @returns It.
 */
function fake(world: World, name: string, cost: number, reads = true): Fake {
    const found: Fake = {
        name,
        current: world.serial,
        resolved: [],
        moved: [],
        watch: {
            signature: () => (reads ? `s${world.serial}` : "constant"),
            resolve: () => {
                found.resolved.push(world.serial);
                return world.serial;
            },
            ready: (resolution, moved) => {
                found.current = resolution;
                found.moved.push(moved);
            },
            cost: () => cost,
        },
    };

    return found;
}

/**
 * Freeze: move the serial and announce it.
 * @param world - The world.
 * @param notifier - The notifier.
 */
function freeze(world: World, notifier: SetsNotifier): void {
    world.serial++;
    notifier.notify({ kind: "snapshot", serial: world.serial });
}

describe("the re-resolution scheduler", () => {
    it("splits the work after a freeze across frames within the counted budget", () => {
        const world: World = { serial: 1 };
        const frames = new Frames();
        const notifier = new SetsNotifier({ frames: frames.source, budget: 1000 });
        const watches = ["a", "b", "c", "d", "e"].map((name) => fake(world, name, 400));
        for (const { watch } of watches) {
            notifier.subscribe(watch);
        }

        freeze(world, notifier);
        assert.deepStrictEqual(
            watches.map((w) => w.resolved.length),
            [0, 0, 0, 0, 0],
            "nothing resolves in the freeze's own turn",
        );
        assert.strictEqual(frames.requested, 1);

        const perFrame: number[] = [];
        while (frames.requested > 0) {
            const before = watches.reduce((sum, w) => sum + w.resolved.length, 0);
            frames.step();
            perFrame.push(watches.reduce((sum, w) => sum + w.resolved.length, 0) - before);
        }

        // 400 + 400 fits in 1000; a third would not.
        assert.deepStrictEqual(perFrame, [2, 2, 1]);
        assert.deepStrictEqual(
            watches.map((w) => w.resolved),
            watches.map(() => [2]),
        );
        assert.deepStrictEqual(watches[0].moved, [[{ kind: "snapshot", serial: 2 }]]);
    });

    it("runs one watch a frame even when it alone is over the budget", () => {
        const world: World = { serial: 1 };
        const frames = new Frames();
        const notifier = new SetsNotifier({ frames: frames.source, budget: 10 });
        const big = [fake(world, "a", 50), fake(world, "b", 50)];
        big.forEach((w) => notifier.subscribe(w.watch));

        freeze(world, notifier);
        frames.step();
        assert.deepStrictEqual(
            big.map((w) => w.resolved.length),
            [1, 0],
        );
        frames.step();
        assert.deepStrictEqual(
            big.map((w) => w.resolved.length),
            [1, 1],
        );
        assert.strictEqual(frames.requested, 0);
    });

    it("a watch keeps its previous resolution until its new one is ready", () => {
        const world: World = { serial: 1 };
        const frames = new Frames();
        const notifier = new SetsNotifier({ frames: frames.source, budget: 1 });
        const first = fake(world, "a", 1);
        const second = fake(world, "b", 1);
        notifier.subscribe(first.watch);
        notifier.subscribe(second.watch);

        freeze(world, notifier);
        frames.step();
        assert.strictEqual(first.current, 2);
        assert.strictEqual(second.current, 1, "still the previous resolution: its frame has not come");
        frames.step();
        assert.strictEqual(second.current, 2);
    });

    it("a second freeze mid-way: unfinished work runs once, against the newest snapshot", () => {
        const world: World = { serial: 1 };
        const frames = new Frames();
        const notifier = new SetsNotifier({ frames: frames.source, budget: 2 });
        const watches = ["a", "b", "c", "d", "e", "f"].map((name) => fake(world, name, 1));
        // A watch whose signature no freeze moves: done once, never queued work again.
        const steady = fake(world, "steady", 1, false);
        for (const w of [...watches, steady]) {
            notifier.subscribe(w.watch);
        }

        freeze(world, notifier);
        frames.step();
        assert.deepStrictEqual(
            watches.map((w) => w.resolved),
            [[2], [2], [], [], [], []],
        );

        freeze(world, notifier);
        while (frames.requested > 0) {
            frames.step();
        }

        // The finished two re-resolve because their signature moved again; the four unfinished
        // resolve once, never against the snapshot the second freeze replaced.
        assert.deepStrictEqual(
            watches.map((w) => w.resolved),
            [[2, 3], [2, 3], [3], [3], [3], [3]],
        );
        assert.deepStrictEqual(
            watches.map((w) => w.current),
            [3, 3, 3, 3, 3, 3],
        );
        assert.deepStrictEqual(watches[2].moved, [
            [
                { kind: "snapshot", serial: 2 },
                { kind: "snapshot", serial: 3 },
            ],
        ]);
        assert.deepStrictEqual(steady.resolved, [], "its signature never moved, so it was never asked");
    });

    it("an input on the same snapshot resolves at once, off the frame; a skipped watch costs nothing", () => {
        const world: World = { serial: 1 };
        const frames = new Frames();
        const notifier = new SetsNotifier({ frames: frames.source, budget: 1 });
        let selection = 0;
        const queued = fake(world, "queued", 1);
        const reading: Fake = fake(world, "reading", 1);
        const plain: SetWatch<number> = {
            ...reading.watch,
            signature: () => `sel${selection}`,
        };
        notifier.subscribe(plain);
        notifier.subscribe(queued.watch);

        freeze(world, notifier);
        frames.step();
        // One frame of budget 1 took both: `plain`'s signature did not move, so it cost nothing.
        assert.deepStrictEqual(queued.resolved, [2]);
        assert.deepStrictEqual(reading.resolved, []);
        selection++;
        notifier.notify({ kind: "selection" });
        assert.deepStrictEqual(reading.moved.at(-1), [{ kind: "selection" }]);
        assert.strictEqual(frames.requested, 0);
    });

    it("dispose cancels the pending frame and drops the queue", () => {
        const world: World = { serial: 1 };
        const frames = new Frames();
        const notifier = new SetsNotifier({ frames: frames.source, budget: 1 });
        const watches = ["a", "b", "c"].map((name) => fake(world, name, 1));
        watches.forEach((w) => notifier.subscribe(w.watch));

        freeze(world, notifier);
        frames.step();
        assert.strictEqual(frames.requested, 1);
        notifier.dispose();

        assert.strictEqual(frames.requested, 0);
        assert.strictEqual(notifier.pending, 0);
        freeze(world, notifier);
        frames.step();
        assert.deepStrictEqual(
            watches.map((w) => w.resolved.length),
            [1, 0, 0],
        );
    });

    it("an unsubscribed watch leaves the queue", () => {
        const world: World = { serial: 1 };
        const frames = new Frames();
        const notifier = new SetsNotifier({ frames: frames.source, budget: 1 });
        const kept = fake(world, "kept", 1);
        const gone = fake(world, "gone", 1);
        notifier.subscribe(kept.watch);
        const stop = notifier.subscribe(gone.watch);

        freeze(world, notifier);
        stop();
        while (frames.requested > 0) {
            frames.step();
        }

        assert.deepStrictEqual(kept.resolved, [2]);
        assert.deepStrictEqual(gone.resolved, []);
    });
});

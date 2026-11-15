/**
 * @file The frame guard's ladder, the quality table and the flashing count
 * (design/rendering/shader-styles.md section 5), driven by frame samples as `RenderManager` hands
 * them over.
 */

import { assert, describe, it } from "vitest";

import {
    FLASH_GRID,
    FlashCounter,
    type GuardSources,
    QUALITY_LEVELS,
    RenderTargetBudget,
    ShaderGuard,
    wantsLowDetail,
} from "../../src/managers/ShaderGuard";
import type { RenderQualityChange } from "../../src/session/shaders";

/**
 * A guard drawing at a setting, with sources that answer as told.
 * @param options - The setting and what the sources answer.
 * @param options.quality - The setting's level.
 * @param options.guard - Whether the guard runs.
 * @param options.claimed - Whether a shader holds a motion claim.
 * @param options.heavy - Whether a pasted shader is on screen.
 * @returns The guard and the changes it announced.
 */
function guarded(
    options: { quality?: "low" | "medium" | "high"; guard?: boolean; claimed?: boolean; heavy?: boolean } = {},
): { guard: ShaderGuard; changes: (RenderQualityChange | null)[]; sources: GuardSources } {
    const guard = new ShaderGuard();
    guard.configure({ quality: options.quality ?? "high", motion: "on", guard: options.guard ?? true });
    const sources: GuardSources = {
        claimed: () => options.claimed ?? true,
        heavyOnScreen: () => options.heavy ?? false,
        movingShaders: () => [],
        freeze: () => undefined,
    };
    guard.lend(sources);
    const changes: (RenderQualityChange | null)[] = [];
    guard.onChange((change) => changes.push(change));
    return { guard, changes, sources };
}

/**
 * Hand the guard frames.
 * @param guard - The guard.
 * @param count - How many.
 * @param intervalMs - Each one's interval.
 * @param gpuBehind - Whether the GPU was behind on each.
 */
function frames(guard: ShaderGuard, count: number, intervalMs: number, gpuBehind: boolean): void {
    for (let i = 0; i < count; i++) {
        guard.frame({ intervalMs, gpuBehind });
    }
}

describe("the frame guard", () => {
    it("steps down one level per second of GPU-bound 80 ms frames, and announces each step", () => {
        const { guard, changes } = guarded();
        frames(guard, 12, 80, true);
        assert.strictEqual(guard.quality.level, "high", "under a second of slow frames changes nothing");
        frames(guard, 1, 80, true);
        assert.strictEqual(guard.quality.level, "medium");
        assert.strictEqual(guard.quality.code, "guard.slow-gpu");
        assert.deepEqual(
            changes.map((change) => [change?.from.level, change?.to.level, change?.code]),
            [["high", "medium", "guard.slow-gpu"]],
        );

        frames(guard, 13, 80, true);
        assert.strictEqual(guard.quality.level, "low");
        frames(guard, 13, 80, true);
        assert.strictEqual(guard.quality.motion, "half", "at low, loops run at half rate");
        frames(guard, 13, 80, true);
        assert.strictEqual(guard.quality.heavy, "off", "then heavy shaders turn off");
        frames(guard, 13, 80, true);
        assert.strictEqual(guard.quality.motion, "paused", "then all shader motion pauses");
        assert.strictEqual(changes.at(-1)?.code, "guard.paused");
        frames(guard, 100, 80, true);
        assert.lengthOf(changes, 5, "the bottom of the ladder is the bottom");
    });

    it("steps down on slow frames the loop spent waiting for its tick, with every fence signalled", () => {
        // Chromium runs the next animation frame only once the GPU caught up, so a slow GPU shows
        // as the wait between the loop's ticks, and the fence has signalled by then.
        const { guard, changes } = guarded();
        for (let i = 0; i < 13; i++) {
            guard.frame({ intervalMs: 80, waitMs: 75, gpuBehind: false });
        }

        assert.strictEqual(guard.quality.level, "medium");
        assert.strictEqual(changes[0]?.code, "guard.slow-gpu");
    });

    it("changes nothing for slow frames spent in the loop's own work, however long", () => {
        const { guard, changes } = guarded({ heavy: true });
        for (let i = 0; i < 200; i++) {
            guard.frame({ intervalMs: 300, waitMs: 10, gpuBehind: false });
        }

        assert.lengthOf(changes, 0);
    });

    it("turns heavy shaders off after two long waits in a row, not after one", () => {
        const { guard } = guarded({ heavy: true });
        guard.frame({ intervalMs: 300, waitMs: 290, gpuBehind: false });
        guard.frame({ intervalMs: 16, waitMs: 6, gpuBehind: false });
        assert.strictEqual(guard.quality.heavy, "on", "one long wait can be the page's own script");
        guard.frame({ intervalMs: 300, waitMs: 290, gpuBehind: false });
        guard.frame({ intervalMs: 300, waitMs: 290, gpuBehind: false });
        assert.strictEqual(guard.quality.heavy, "off");
    });

    it("changes nothing for slow frames the GPU kept up with: a CPU-bound layout", () => {
        const { guard, changes } = guarded();
        frames(guard, 200, 80, false);
        assert.deepEqual({ ...guard.quality }, { level: "high", motion: "on", heavy: "on" });
        assert.lengthOf(changes, 0);
    });

    it("counts slow frames only while a shader holds a motion claim", () => {
        const { guard, changes } = guarded({ claimed: false });
        frames(guard, 200, 80, true);
        assert.lengthOf(changes, 0);
    });

    it("turns heavy shaders off at once on one 300 ms frame with one on screen, until the settings change", () => {
        const { guard, changes } = guarded({ heavy: true });
        guard.frame({ intervalMs: 300, gpuBehind: true });
        assert.strictEqual(guard.quality.heavy, "off");
        assert.strictEqual(guard.quality.level, "high", "only heavy shaders turn off");
        assert.strictEqual(changes[0]?.code, "guard.long-frame");

        frames(guard, 1000, 16, false);
        assert.strictEqual(guard.quality.heavy, "off", "fast frames do not bring them back");

        guard.configure({ quality: "high", motion: "on", guard: true });
        assert.strictEqual(guard.quality.heavy, "on");
    });

    it("leaves heavy shaders on for a long frame with none on screen, or one the CPU spent", () => {
        const none = guarded({ heavy: false });
        none.guard.frame({ intervalMs: 300, gpuBehind: true });
        assert.strictEqual(none.guard.quality.heavy, "on");
        const cpu = guarded({ heavy: true });
        cpu.guard.frame({ intervalMs: 300, gpuBehind: false });
        assert.strictEqual(cpu.guard.quality.heavy, "on");
    });

    it("changes nothing with guard: false", () => {
        const { guard, changes } = guarded({ guard: false, heavy: true });
        guard.frame({ intervalMs: 300, gpuBehind: true });
        frames(guard, 200, 80, true);
        assert.lengthOf(changes, 0);
        assert.deepEqual({ ...guard.quality }, { level: "high", motion: "on", heavy: "on" });
    });

    it("steps back up after a sustained run of fast frames, never above the setting", () => {
        const { guard, changes } = guarded({ quality: "medium" });
        frames(guard, 13, 80, true);
        assert.strictEqual(guard.quality.level, "low");
        frames(guard, 313, 16, false);
        assert.strictEqual(guard.quality.level, "medium");
        assert.strictEqual(changes.at(-1)?.code, "guard.recovered");
        assert.notProperty(guard.quality, "code", "back at the setting, nothing to explain");
        frames(guard, 3000, 16, false);
        assert.strictEqual(guard.quality.level, "medium", "never above the setting");
    });

    it("waits longer to step up each time a step up was followed by a step down", () => {
        const { guard } = guarded();
        frames(guard, 13, 80, true);
        frames(guard, 313, 16, false);
        assert.strictEqual(guard.quality.level, "high", "5 s of fast frames: back up");
        frames(guard, 13, 80, true);
        frames(guard, 313, 16, false);
        assert.strictEqual(guard.quality.level, "medium", "the second time 5 s is not enough");
        frames(guard, 313, 16, false);
        assert.strictEqual(guard.quality.level, "high", "10 s is");
    });

    it("leaves the frames after a resize, a visibility change, a compile or a restore out", () => {
        const { guard } = guarded({ heavy: true });
        guard.ignore();
        guard.frame({ intervalMs: 300, gpuBehind: true });
        guard.frame({ intervalMs: 300, gpuBehind: true });
        assert.strictEqual(guard.quality.heavy, "on");
        guard.frame({ intervalMs: 300, gpuBehind: true });
        assert.strictEqual(guard.quality.heavy, "off");
    });

    it("measures nothing until shaders draw", () => {
        const guard = new ShaderGuard();
        const changes: unknown[] = [];
        guard.onChange((change) => changes.push(change));
        frames(guard, 200, 80, true);
        assert.lengthOf(changes, 0);
    });

    it("runs loops at half rate by skipping every other tick, only while a shader claims frames", () => {
        const { guard } = guarded();
        frames(guard, 39, 80, true);
        assert.strictEqual(guard.quality.motion, "half");
        assert.deepEqual(
            [guard.skipTick(), guard.skipTick(), guard.skipTick(), guard.skipTick()],
            [true, false, true, false],
        );
        const idle = guarded({ claimed: false });
        assert.isFalse(idle.guard.skipTick());
    });

    it("draws motion still for reduced motion under motion: system, and for motion: off", () => {
        const guard = new ShaderGuard();
        guard.configure({ quality: "high", motion: "system", guard: true });
        guard.setSystemStill(true);
        assert.strictEqual(guard.quality.motion, "still");
        guard.configure({ quality: "high", motion: "on", guard: true });
        assert.strictEqual(guard.quality.motion, "on", "the reader's own choice wins");
        guard.configure({ quality: "high", motion: "off", guard: true });
        guard.setSystemStill(false);
        assert.strictEqual(guard.quality.motion, "still");
    });
});

describe("the quality table", () => {
    it("scales shader render targets by level, never past the drawing buffer", () => {
        const guard = new ShaderGuard();
        for (const [level, scale] of [
            ["low", 0.5],
            ["medium", 0.75],
            ["high", 1],
        ] as const) {
            guard.configure({ quality: level, motion: "on", guard: true });
            assert.deepEqual(guard.targetSize(1000, 800), { width: 1000 * scale, height: 800 * scale });
        }

        assert.deepEqual(guard.targetSize(1, 1), { width: 1, height: 1 });
    });

    it("caps effect squares at 128, 256 and 512 px", () => {
        assert.deepEqual(
            [QUALITY_LEVELS.low.effectCap, QUALITY_LEVELS.medium.effectCap, QUALITY_LEVELS.high.effectCap],
            [128, 256, 512],
        );
    });

    it("refuses a render target past the level's memory budget, and releases once", () => {
        let limit = QUALITY_LEVELS.low.targetBudgetBytes;
        const budget = new RenderTargetBudget(() => limit);
        const release = budget.reserve(20 * 2 ** 20);
        assert.isNotNull(release);
        assert.isNull(budget.reserve(8 * 2 ** 20), "24 MB at low");
        limit = QUALITY_LEVELS.medium.targetBudgetBytes;
        const second = budget.reserve(8 * 2 ** 20);
        assert.isNotNull(second);
        release?.();
        release?.();
        assert.strictEqual(budget.bytes, 8 * 2 ** 20);
        assert.isNull(budget.reserve(Number.NaN));
    });

    it("chooses the cheap program when the median node is under 12 px", () => {
        assert.isTrue(wantsLowDetail(Float32Array.from([4, 40, 8])));
        assert.isFalse(wantsLowDetail(Float32Array.from([4, 40, 30])));
        assert.isFalse(wantsLowDetail(new Float32Array(0)));
    });
});

/**
 * A downsample of one gray level over the whole canvas.
 * @param gray - 0..255.
 * @returns The pixels.
 */
function flat(gray: number): Uint8Array {
    return new Uint8Array(FLASH_GRID * FLASH_GRID * 4).fill(gray);
}

/**
 * Feed a counter a square wave sampled every `stepMs` for a second and a half.
 * @param hz - Flashes a second.
 * @param stepMs - The sampling interval.
 * @param low - The dark level.
 * @param high - The light level.
 * @returns Whether it called the canvas flashing.
 */
function squareWave(hz: number, stepMs: number, low = 0, high = 255): boolean {
    const counter = new FlashCounter();
    let flashing = false;
    for (let at = 0; at <= 1500; at += stepMs) {
        const on = (at / 1000) * hz - Math.floor((at / 1000) * hz) < 0.5;
        flashing = counter.add(flat(on ? high : low), at) || flashing;
    }

    return flashing;
}

describe("the flashing count", () => {
    it("calls 6 flashes a second flashing, sampled 10 or 20 times a second", () => {
        assert.isTrue(squareWave(6, 100));
        assert.isTrue(squareWave(6, 50));
    });

    it("calls 10, 15 and 20 flashes a second flashing, sampled every frame at 60 or 30 frames a second", () => {
        for (const hz of [10, 15, 20]) {
            assert.isTrue(squareWave(hz, 1000 / 60), `${String(hz)} Hz at 60 fps`);
            assert.isTrue(squareWave(hz, 1000 / 30), `${String(hz)} Hz at 30 fps`);
        }

        // Why the check samples every frame: 10 times a second, a 10 Hz strobe reads as steady.
        assert.isFalse(squareWave(10, 100));
    });

    it("leaves 2 flashes a second, a steady canvas and small swings alone", () => {
        assert.isFalse(squareWave(2, 50));
        assert.isFalse(squareWave(0, 50));
        assert.isFalse(squareWave(6, 50, 120, 128), "under a 10% luminance swing");
        assert.isFalse(squareWave(6, 50, 235, 255), "both sides lighter than 0.8");
    });
});

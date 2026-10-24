/**
 * @file The shader quality levels and the frame guard (design/rendering/shader-styles.md section 5).
 *
 * **Quality levels scale only shader work**: the `Q()` helper, shader render targets and their
 * memory budget, and the largest square an effect draws on. The main drawing buffer, the public
 * `pixelRatio`, edge tessellation and the engine's hardware scaling are never touched, so a graph
 * that names no shader is drawn the same at every level.
 *
 * **The guard steps down only when the GPU is behind.** {@link ShaderGuard.frame} is handed one
 * sample per frame drawn by `RenderManager`: how long since the frame before, how much of that the
 * loop waited between its own ticks, and whether it skipped ticks for that frame's fence (the
 * existing `gpuBehind` fence). A frame is GPU-bound when the wait alone is over the limit, or the
 * fence held it: Chromium does not run the next animation frame until the GPU has caught up, so
 * a slow GPU shows as a long wait and the fence has always signalled by then. A slow frame spent
 * in the loop's own work is the CPU's -- a 10,000-node layout step -- and changes nothing. The
 * ladder, one rung per second of GPU-bound frames over 50 ms measured while a shader holds a motion
 * claim: high, medium, low, loops at half rate, heavy shaders off, all shader motion paused. A
 * GPU-bound frame over 250 ms with a heavy shader on screen turns heavy shaders off at once --
 * one the fence held, or two waits in a row, since one long wait can be the page's own script --
 * and they stay off until the settings change. A shader is judged by its cost and its motion, never
 * by where it came from: a heavy preset steps off exactly as a heavy pasted shader does. After a
 * sustained run of fast frames the guard steps back up one rung, never above the setting.
 *
 * Also here: the render-target memory budget, the level-of-detail choice, and the flashing check
 * (a 16 x 16 downsample of the canvas read back asynchronously, WCAG 2.3.1).
 *
 * Nothing here reaches Babylon.js: the readback is raw WebGL 2, and the rest is arithmetic.
 */

import type { HostRenderSettings, RenderQuality, RenderQualityChange, RenderQualityCode } from "../session/shaders";

/** A shader quality level. */
export type QualityLevel = RenderQuality["level"];

/** What each quality level allows shader work (design section 5, the quality table). */
export const QUALITY_LEVELS: Readonly<
    Record<
        QualityLevel,
        {
            /** Shader render targets, as a multiple of the canvas's drawing buffer. */
            readonly targetScale: number;
            /** The most bytes every shader render target together may hold. */
            readonly targetBudgetBytes: number;
            /** Whether a render target may be a 16-bit float target. */
            readonly halfFloat: boolean;
            /** The largest square an effect draws on, in screen pixels across. */
            readonly effectCap: number;
            /** The most distinct shader programs drawn at once. */
            readonly programCap: number;
        }
    >
> = Object.freeze({
    low: { targetScale: 0.5, targetBudgetBytes: 24 * 2 ** 20, halfFloat: false, effectCap: 128, programCap: 8 },
    medium: { targetScale: 0.75, targetBudgetBytes: 64 * 2 ** 20, halfFloat: true, effectCap: 256, programCap: 16 },
    high: { targetScale: 1, targetBudgetBytes: 160 * 2 ** 20, halfFloat: true, effectCap: 512, programCap: 16 },
});

/** A frame the GPU was behind on and that took longer than this is slow, in milliseconds. */
export const SLOW_FRAME_MS = 50;

/** How long the slow frames must last before one step down, in milliseconds. */
export const STEP_DOWN_AFTER_MS = 1000;

/** One frame this long, the GPU behind and a heavy shader on screen, turns heavy shaders off. */
export const LONG_FRAME_MS = 250;

/** A frame the GPU kept up with, drawn within this, is fast (a 30 Hz display's frames count). */
export const FAST_FRAME_MS = 34;

/** How long the fast frames must last before the first step back up, in milliseconds. */
export const STEP_UP_AFTER_MS = 5000;

/**
 * The longest the fast run before a step up grows to. Each step down that follows a step up
 * doubles the run, so a GPU that copes at one level and not the next settles instead of
 * swinging between them.
 */
const STEP_UP_MAX_MS = 80_000;

/** Below this median node size on screen, in pixels, a heavy surface draws its cheap program. */
export const LOW_DETAIL_BELOW_PX = 12;

/**
 * The guard's ladder, top to bottom. A setting's level is where it starts, and the highest it
 * steps back up to.
 */
const RUNGS: readonly {
    readonly level: QualityLevel;
    readonly motion: "on" | "half" | "paused";
    readonly heavy: "on" | "off";
}[] = [
    { level: "high", motion: "on", heavy: "on" },
    { level: "medium", motion: "on", heavy: "on" },
    { level: "low", motion: "on", heavy: "on" },
    { level: "low", motion: "half", heavy: "on" },
    { level: "low", motion: "half", heavy: "off" },
    { level: "low", motion: "paused", heavy: "off" },
];

/** One frame drawn, as `RenderManager` measured it. */
export interface FrameSample {
    /** Milliseconds since the frame drawn before it, with only GPU waits between. */
    readonly intervalMs: number;
    /**
     * Milliseconds of the interval the loop spent waiting for its tick rather than working: the
     * interval less the frame before's update and draw (and less any tick skipped on purpose).
     * Defaults to 0, when only the fence is known.
     */
    readonly waitMs?: number;
    /** Whether the loop skipped ticks waiting for the frame before's fence. */
    readonly gpuBehind: boolean;
}

/** What the guard asks of the drawing, lent by the shader host once shaders draw. */
export interface GuardSources {
    /** Whether a shader holds a motion claim, so the loop draws every frame because of shaders. */
    claimed(): boolean;
    /** Whether a heavy shader (cost `"heavy"`, any origin) is drawn now. */
    heavyOnScreen(): boolean;
    /** The text hashes of the shaders drawn now, of any origin, that move by themselves and are not frozen. */
    movingShaders(): readonly string[];
    /**
     * Freeze shaders' time because the canvas flashed while they drew.
     * @param hashes - Their text hashes.
     */
    freeze(hashes: readonly string[]): void;
}

/** The frame guard and the quality level of one graph. */
export class ShaderGuard {
    private settings: HostRenderSettings = { quality: "high", motion: "system", guard: true };
    private systemStill = false;
    private start = 0;
    private rung = 0;
    /** Set by one long frame with a heavy shader on screen; lifted when the settings change. */
    private heavyBanned = false;
    private slowRun = 0;
    private fastRun = 0;
    private stepUpAfter = STEP_UP_AFTER_MS;
    /** Whether the last step was a step up, so the next step down lengthens the run before one. */
    private steppedUp = false;
    private ignoring = 0;
    /** Whether the last frame measured waited over {@link LONG_FRAME_MS} for its tick. */
    private lastLongWait = false;
    private halfTick = false;
    private code: RenderQualityCode | undefined;
    private current: RenderQuality;
    private readonly listeners = new Set<(change: RenderQualityChange | null) => void>();
    private sources: GuardSources | null = null;

    /** Start at high quality, with motion on. */
    constructor() {
        this.current = this.compute();
    }

    /**
     * The quality drawn now.
     * @returns The quality.
     */
    get quality(): RenderQuality {
        return this.current;
    }

    /**
     * Whether shaders draw, so the guard measures frames: a host lent it its sources.
     * @returns True while sources are lent.
     */
    get watching(): boolean {
        return this.sources !== null;
    }

    /**
     * The shaders drawn now, of any origin, that move by themselves and are not frozen, for the
     * flashing check.
     * @returns Their text hashes.
     */
    movingShaders(): readonly string[] {
        return this.sources?.movingShaders() ?? [];
    }

    /**
     * Freeze shaders' time because the canvas flashed while they drew.
     * @param hashes - Their text hashes.
     */
    flashed(hashes: readonly string[]): void {
        this.sources?.freeze(hashes);
    }

    /**
     * Draw by the reader's settings. Starts the ladder again at the setting's level and lifts a
     * long frame's ban on heavy shaders.
     * @param settings - The settings.
     */
    configure(settings: HostRenderSettings): void {
        this.settings = settings;
        this.start = RUNGS.findIndex((rung) => rung.level === settings.quality);
        this.rung = this.start;
        this.heavyBanned = false;
        this.code = undefined;
        this.resetRuns();
        this.stepUpAfter = STEP_UP_AFTER_MS;
        this.steppedUp = false;
        this.update(null);
    }

    /**
     * Follow the platform's reduced-motion preference, which `motion: "system"` obeys.
     * @param still - Whether the platform asks for reduced motion.
     */
    setSystemStill(still: boolean): void {
        if (this.systemStill !== still) {
            this.systemStill = still;
            this.update(null);
        }
    }

    /**
     * Lend the guard what it asks of the drawing.
     * @param sources - The sources, or null when no shader draws any more.
     */
    lend(sources: GuardSources | null): void {
        this.sources = sources;
    }

    /**
     * Listen for the quality changing.
     * @param listener - Called with each change the guard made; with null when the settings
     *     changed it, or when only the flashing set did.
     * @returns Stops listening.
     */
    onChange(listener: (change: RenderQualityChange | null) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Tell the listeners something changed that is not the quality (a shader frozen for flashing).
     */
    announce(): void {
        for (const listener of this.listeners) {
            listener(null);
        }
    }

    /**
     * Leave the next frames out of the measure: they follow a visibility change, a resize, a
     * shader compile or a context restore, and their time says nothing about the shaders drawn.
     * @param frames - How many.
     */
    ignore(frames = 2): void {
        this.ignoring = Math.max(this.ignoring, frames);
        this.resetRuns();
    }

    /**
     * Whether this tick is skipped to run loops at half rate: every other tick while the loop
     * draws every frame because of shader motion, at the half-rate rung.
     * @returns True to skip the tick, as a GPU wait is skipped.
     */
    skipTick(): boolean {
        if (this.current.motion !== "half" || this.sources?.claimed() !== true) {
            return false;
        }

        this.halfTick = !this.halfTick;
        return this.halfTick;
    }

    /**
     * Measure one frame drawn.
     * @param sample - The frame.
     */
    frame(sample: FrameSample): void {
        const { sources } = this;
        if (!this.settings.guard || sources === null) {
            return;
        }

        if (this.ignoring > 0) {
            this.ignoring--;
            return;
        }

        const { intervalMs, gpuBehind } = sample;
        const waitMs = sample.waitMs ?? 0;
        const longWait = waitMs > LONG_FRAME_MS;
        const long = (gpuBehind && intervalMs > LONG_FRAME_MS) || (longWait && this.lastLongWait);
        this.lastLongWait = longWait;
        if (long && !this.heavyBanned && sources.heavyOnScreen()) {
            this.heavyBanned = true;
            this.resetRuns();
            this.step("guard.long-frame");
        } else if ((gpuBehind && intervalMs > SLOW_FRAME_MS) || waitMs > SLOW_FRAME_MS) {
            this.slowFrame(intervalMs, sources.claimed());
        } else if (intervalMs <= SLOW_FRAME_MS) {
            // A slow frame the GPU kept up with is the CPU's, and counts neither for nor against
            // shaders; it does not get here.
            this.slowRun = 0;
            this.quickFrame(intervalMs, gpuBehind);
        }
    }

    /**
     * A slow frame the GPU was behind on: one step down after a second of them.
     * @param intervalMs - Its interval.
     * @param claimed - Whether a shader holds a motion claim: only frames drawn because a shader
     *     moves count against shaders.
     */
    private slowFrame(intervalMs: number, claimed: boolean): void {
        this.fastRun = 0;
        if (!claimed || this.rung === RUNGS.length - 1) {
            return;
        }

        this.slowRun += intervalMs;
        if (this.slowRun < STEP_DOWN_AFTER_MS) {
            return;
        }

        this.slowRun = 0;
        if (this.steppedUp) {
            this.stepUpAfter = Math.min(this.stepUpAfter * 2, STEP_UP_MAX_MS);
            this.steppedUp = false;
        }

        this.rung++;
        this.step(this.rung === RUNGS.length - 1 ? "guard.paused" : "guard.slow-gpu");
    }

    /**
     * A frame within the slow limit: a fast one counts toward a step up. Any fast frame does, a
     * reader's camera move too: while motion is paused nothing else draws.
     * @param intervalMs - Its interval.
     * @param gpuBehind - Whether the GPU was behind on it.
     */
    private quickFrame(intervalMs: number, gpuBehind: boolean): void {
        if (gpuBehind || intervalMs > FAST_FRAME_MS) {
            this.fastRun = 0;
            return;
        }

        this.fastRun += intervalMs;
        if (this.fastRun >= this.stepUpAfter && this.rung > this.start) {
            this.fastRun = 0;
            this.rung--;
            this.steppedUp = true;
            this.step("guard.recovered");
        }
    }

    /**
     * The shader render-target size for a drawing buffer at this level: scaled, never larger
     * than the buffer, at least 1 pixel.
     * @param width - The drawing buffer's width.
     * @param height - Its height.
     * @returns The target's size.
     */
    targetSize(width: number, height: number): { width: number; height: number } {
        const { targetScale } = QUALITY_LEVELS[this.current.level];
        return {
            width: Math.max(1, Math.min(width, Math.round(width * targetScale))),
            height: Math.max(1, Math.min(height, Math.round(height * targetScale))),
        };
    }

    /**
     * Change the rung's quality, and tell the listeners.
     * @param code - Why.
     */
    private step(code: RenderQualityCode): void {
        this.code = this.rung === this.start && !this.heavyBanned ? undefined : code;
        this.update(code);
    }

    /**
     * Recompute the quality; tell the listeners when it changed.
     * @param code - The guard's reason, or null for a settings change.
     */
    private update(code: RenderQualityCode | null): void {
        const from = this.current;
        const to = this.compute();
        if (from.level === to.level && from.motion === to.motion && from.heavy === to.heavy) {
            return;
        }

        this.current = to;
        const change = code === null ? null : { from, to, code };
        for (const listener of this.listeners) {
            listener(change);
        }
    }

    /**
     * The quality of the rung, the settings and the ban.
     * @returns The quality.
     */
    private compute(): RenderQuality {
        const rung = RUNGS[this.rung];
        const still = this.settings.motion === "off" || (this.settings.motion === "system" && this.systemStill);
        const motion = still ? "still" : rung.motion;
        const heavy = this.heavyBanned ? "off" : rung.heavy;
        return Object.freeze({
            level: rung.level,
            motion,
            heavy,
            ...(this.code === undefined ? {} : { code: this.code }),
        });
    }

    /** Forget the runs of slow and fast frames. */
    private resetRuns(): void {
        this.slowRun = 0;
        this.fastRun = 0;
        this.lastLongWait = false;
    }
}

/**
 * The render-target memory of one graph's shader work, against its level's budget. A target that
 * would pass the budget is refused, and its owner draws without it (as the layers beneath).
 */
export class RenderTargetBudget {
    private used = 0;

    /**
     * Start a budget.
     * @param limit - The level's budget now, read on every reservation.
     */
    constructor(private readonly limit: () => number) {}

    /**
     * Bytes held now.
     * @returns The bytes.
     */
    get bytes(): number {
        return this.used;
    }

    /**
     * Reserve bytes for a render target.
     * @param bytes - Its size: width x height x bytes per pixel.
     * @returns Releases the reservation (twice is a no-op), or null when it would pass the budget.
     */
    reserve(bytes: number): (() => void) | null {
        if (!Number.isFinite(bytes) || bytes < 0 || this.used + bytes > this.limit()) {
            return null;
        }

        this.used += bytes;
        let released = false;
        return () => {
            if (!released) {
                released = true;
                this.used -= bytes;
            }
        };
    }
}

/**
 * Whether a heavy surface draws its cheap program: when the median of its nodes' sizes on screen
 * is under {@link LOW_DETAIL_BELOW_PX}. Chosen for a whole batch when the camera comes to rest.
 * @param pixelSizes - The nodes' drawn radii on screen, in pixels. Reordered.
 * @returns True for the cheap program; false for none.
 */
export function wantsLowDetail(pixelSizes: Float32Array): boolean {
    if (pixelSizes.length === 0) {
        return false;
    }

    pixelSizes.sort();
    return pixelSizes[pixelSizes.length >> 1] < LOW_DETAIL_BELOW_PX;
}

/** The side of the canvas downsample the flashing check reads, in cells. */
export const FLASH_GRID = 16;

/** The side of one area the check judges, in cells: a sixteenth of the canvas. */
const FLASH_AREA = 4;

/** The luminance change of one flash transition (WCAG 2.3.1's general flash: 10%). */
const FLASH_SWING = 0.1;

/** WCAG's limit: more than this many flashes in any one second is flashing. */
const FLASHES_PER_SECOND = 3;

/** How long the check remembers transitions, in milliseconds. */
const FLASH_WINDOW_MS = 1000;

/**
 * Counts flashes in a sequence of canvas downsamples (WCAG 2.3.1): per area of a sixteenth of the
 * canvas, a transition is a change of relative luminance of at least 10% against the last
 * extreme, with the darker side under 0.8; two opposing transitions are one flash, and more than
 * three flashes in a second is flashing.
 */
export class FlashCounter {
    /** Per area, the luminance of the last extreme, NaN before the first sample. */
    private readonly extreme = new Float32Array((FLASH_GRID / FLASH_AREA) ** 2).fill(Number.NaN);
    /** Per area, the direction of the last transition: 1 up, -1 down, 0 none yet. */
    private readonly direction = new Int8Array((FLASH_GRID / FLASH_AREA) ** 2);
    /** Per area, the times of its transitions in the window. */
    private readonly transitions: number[][] = Array.from({ length: (FLASH_GRID / FLASH_AREA) ** 2 }, () => []);

    /**
     * Add one downsample.
     * @param rgba - {@link FLASH_GRID} x {@link FLASH_GRID} pixels, 8-bit RGBA.
     * @param at - When it was drawn, in milliseconds.
     * @returns True when some area flashed more than three times in the last second.
     */
    add(rgba: Uint8Array, at: number): boolean {
        const areas = FLASH_GRID / FLASH_AREA;
        let flashing = false;
        for (let area = 0; area < areas * areas; area++) {
            const luminance = areaLuminance(rgba, area % areas, Math.floor(area / areas));
            flashing = this.addArea(area, luminance, at) || flashing;
        }

        return flashing;
    }

    /**
     * Add one area's luminance.
     * @param area - The area.
     * @param luminance - Its mean relative luminance.
     * @param at - When it was drawn.
     * @returns True when the area flashed more than three times in the last second.
     */
    private addArea(area: number, luminance: number, at: number): boolean {
        const last = this.extreme[area];
        const times = this.transitions[area];
        while (times.length > 0 && times[0] <= at - FLASH_WINDOW_MS) {
            times.shift();
        }

        if (Number.isNaN(last)) {
            this.extreme[area] = luminance;
            return false;
        }

        const up = luminance > last;
        const turned = this.direction[area] !== (up ? 1 : -1);
        if (Math.abs(luminance - last) >= FLASH_SWING && Math.min(luminance, last) < 0.8) {
            if (turned) {
                times.push(at);
                this.direction[area] = up ? 1 : -1;
            }

            this.extreme[area] = luminance;
        } else if (!turned) {
            // Still moving the same way: the extreme follows it.
            this.extreme[area] = up ? Math.max(last, luminance) : Math.min(last, luminance);
        }

        // Two opposing transitions are one flash.
        return times.length / 2 > FLASHES_PER_SECOND;
    }
}

/**
 * The mean relative luminance of one area of a downsample.
 * @param rgba - The downsample.
 * @param ax - The area's column.
 * @param ay - Its row.
 * @returns 0..1.
 */
function areaLuminance(rgba: Uint8Array, ax: number, ay: number): number {
    let sum = 0;
    for (let y = ay * FLASH_AREA; y < (ay + 1) * FLASH_AREA; y++) {
        for (let x = ax * FLASH_AREA; x < (ax + 1) * FLASH_AREA; x++) {
            const at = (y * FLASH_GRID + x) * 4;
            sum += 0.2126 * linear(rgba[at]) + 0.7152 * linear(rgba[at + 1]) + 0.0722 * linear(rgba[at + 2]);
        }
    }

    return sum / (FLASH_AREA * FLASH_AREA);
}

/**
 * An sRGB channel as linear light.
 * @param channel - 0..255.
 * @returns 0..1.
 */
function linear(channel: number): number {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * How many readbacks may wait on their fences at once. The check samples every frame drawn, so a
 * strobe at any rate the canvas can show is seen (at 10 samples a second a 10 Hz strobe read as
 * steady); a GPU that finishes frames late keeps a few in flight instead of skipping frames.
 */
const FLASH_IN_FLIGHT = 3;

/**
 * Reads a {@link FLASH_GRID}-square downsample of a WebGL 2 canvas back without stalling: the
 * frame is blitted (resolved first when the canvas is multisampled) into a small target, read into
 * a pixel buffer, and fenced; the bytes are fetched on a later frame, once the fence signalled.
 * Up to {@link FLASH_IN_FLIGHT} captures wait at once, each in its own buffer.
 *
 * ponytail: WebGL 2 only; on WebGPU shaders are not checked for flashing. A mapAsync
 * readback of the swap chain would add it.
 */
export class FlashReadback {
    private small: { fbo: WebGLFramebuffer; rb: WebGLRenderbuffer } | null = null;
    private resolve: { fbo: WebGLFramebuffer; rb: WebGLRenderbuffer; w: number; h: number } | null = null;
    /** Pixel buffers no capture is using. */
    private readonly free: WebGLBuffer[] = [];
    /** The captures waiting on their fences, oldest first. */
    private readonly pending: { fence: WebGLSync; at: number; buffer: WebGLBuffer }[] = [];
    private readonly bytes = new Uint8Array(FLASH_GRID * FLASH_GRID * 4);

    /**
     * Start a readback on a context.
     * @param gl - The canvas's context.
     */
    constructor(private readonly gl: WebGL2RenderingContext) {}

    /**
     * Whether no further capture can start until one is collected.
     * @returns True while {@link FLASH_IN_FLIGHT} captures wait.
     */
    get waiting(): boolean {
        return this.pending.length >= FLASH_IN_FLIGHT;
    }

    /**
     * Capture the frame just drawn into the pixel buffer, fenced. Restores every binding it
     * changes, so the engine's state cache stays true.
     * @param at - When the frame was drawn, in milliseconds.
     */
    capture(at: number): void {
        const { gl } = this;
        if (this.waiting || gl.isContextLost()) {
            return;
        }

        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;
        const read = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
        const draw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
        const pack = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING) as WebGLBuffer | null;
        const scissor = gl.isEnabled(gl.SCISSOR_TEST);
        try {
            gl.disable(gl.SCISSOR_TEST);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
            const samples = gl.getParameter(gl.SAMPLES) as number;
            if (samples > 0) {
                const target = this.resolveTarget(width, height);
                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, target);
                gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
                gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target);
            }

            const small = this.smallTarget();
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, small);
            gl.blitFramebuffer(0, 0, width, height, 0, 0, FLASH_GRID, FLASH_GRID, gl.COLOR_BUFFER_BIT, gl.LINEAR);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, small);
            const buffer = this.free.pop() ?? gl.createBuffer();
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer);
            gl.bufferData(gl.PIXEL_PACK_BUFFER, this.bytes.byteLength, gl.STREAM_READ);
            gl.readPixels(0, 0, FLASH_GRID, FLASH_GRID, gl.RGBA, gl.UNSIGNED_BYTE, 0);
            const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            if (fence === null) {
                this.free.push(buffer);
            } else {
                this.pending.push({ fence, at, buffer });
            }
        } finally {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pack);
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, draw);
            if (scissor) {
                gl.enable(gl.SCISSOR_TEST);
            }
        }
    }

    /**
     * The oldest capture's bytes, once its fence signalled; never waits. Call it until it answers
     * null to take every capture ready, in the order drawn. The bytes are overwritten by the next
     * call.
     * @returns The downsample and when it was drawn, or null while none is ready.
     */
    collect(): { rgba: Uint8Array; at: number } | null {
        const { gl } = this;
        const oldest = this.pending.at(0);
        if (oldest === undefined) {
            return null;
        }

        if (gl.isContextLost()) {
            this.pending.length = 0;
            this.free.length = 0;
            return null;
        }

        if (gl.getSyncParameter(oldest.fence, gl.SYNC_STATUS) === gl.UNSIGNALED) {
            return null;
        }

        gl.deleteSync(oldest.fence);
        this.pending.shift();
        const pack = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING) as WebGLBuffer | null;
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, oldest.buffer);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.bytes);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pack);
        this.free.push(oldest.buffer);
        return { rgba: this.bytes, at: oldest.at };
    }

    /** Drop every capture still waiting on its fence; its buffer is free again. */
    drop(): void {
        const { gl } = this;
        for (const { fence, buffer } of this.pending.splice(0)) {
            if (!gl.isContextLost()) {
                gl.deleteSync(fence);
            }

            this.free.push(buffer);
        }
    }

    /** Release the targets, the buffer and a pending fence. */
    dispose(): void {
        const { gl } = this;
        if (gl.isContextLost()) {
            return;
        }

        for (const target of [this.small, this.resolve]) {
            if (target !== null) {
                gl.deleteFramebuffer(target.fbo);
                gl.deleteRenderbuffer(target.rb);
            }
        }

        for (const { fence, buffer } of this.pending) {
            gl.deleteSync(fence);
            gl.deleteBuffer(buffer);
        }

        for (const buffer of this.free) {
            gl.deleteBuffer(buffer);
        }

        this.small = null;
        this.resolve = null;
        this.pending.length = 0;
        this.free.length = 0;
    }

    /**
     * The small target, made once.
     * @returns Its framebuffer.
     */
    private smallTarget(): WebGLFramebuffer {
        this.small ??= this.target(FLASH_GRID, FLASH_GRID);
        return this.small.fbo;
    }

    /**
     * A single-sampled target the size of the canvas, to resolve a multisampled frame into.
     * @param width - The canvas's drawing-buffer width.
     * @param height - Its height.
     * @returns Its framebuffer.
     */
    private resolveTarget(width: number, height: number): WebGLFramebuffer {
        if (this.resolve !== null && (this.resolve.w !== width || this.resolve.h !== height)) {
            this.gl.deleteFramebuffer(this.resolve.fbo);
            this.gl.deleteRenderbuffer(this.resolve.rb);
            this.resolve = null;
        }

        this.resolve ??= { ...this.target(width, height), w: width, h: height };
        return this.resolve.fbo;
    }

    /**
     * An RGBA8 renderbuffer target.
     * @param width - Width.
     * @param height - Height.
     * @returns The framebuffer and its renderbuffer.
     */
    private target(width: number, height: number): { fbo: WebGLFramebuffer; rb: WebGLRenderbuffer } {
        const { gl } = this;
        const rb = gl.createRenderbuffer();
        const fbo = gl.createFramebuffer();
        const bound = gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null;
        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, width, height);
        gl.bindRenderbuffer(gl.RENDERBUFFER, bound);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbo);
        gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
        return { fbo, rb };
    }
}

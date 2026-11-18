import { cameraRefusal, stateProblem } from "../camera/mode.js";
import { GraphtyError } from "../errors/GraphtyError.js";
import type { Graph } from "../Graph.js";
import { captureError } from "../screenshot/captureError.js";
import { VIDEO_CONSTANTS } from "../screenshot/constants.js";
import { outputSize } from "./estimation.js";
import { type AnimationOptions, type AnimationResult, calculateDropRate } from "./VideoCapture.js";

/**
 * The error a cancelled recording rejects with: a `GraphtyError` with the code `E_CANCELLED`, so a
 * caller switches on `code` as for every other failure; its `name` stays `"AnimationCancelledError"`.
 */
export class AnimationCancelledError extends GraphtyError {
    /** Always `"AnimationCancelledError"`. */
    override readonly name: string = "AnimationCancelledError";

    /**
     * Creates a new AnimationCancelledError
     */
    constructor() {
        super({ code: "E_CANCELLED", message: "Animation capture cancelled", source: "view" });
    }
}

/** Why a recording failed on its own, as `E_CAPTURE_FAILED`'s `details.reason`. */
export type RecordingFailure = "hidden" | "resized" | "interrupted" | "replaced" | "mode-changed";

/** How the caller of `captureRealtime` follows and ends a recording it times itself. */
export interface RecordingControl {
    /** Called once, when the recorder hands over its first data: the recording's clock starts. */
    onStart?: () => void;
    /**
     * The length the recording is expected to have when `options.duration` is absent, for the
     * frames it expects; the caller then ends it with `stop()` and reports progress itself.
     */
    lengthMs?: number;
}

/**
 * Calls `onFrame` after every frame the graph draws, until the returned function is called.
 */
export type FrameSource = (onFrame: () => void) => () => void;

/**
 * MediaRecorder wrapper with codec detection, Safari support, and cancellation handling.
 *
 * This class handles the complexities of video capture using the browser's MediaRecorder API:
 * - Automatic codec detection (VP9 > VP8 > MP4/H.264)
 * - Safari/iOS compatibility with MP4 fallback
 * - Cancellation with proper race condition handling
 *
 * ## Cancellation Race Condition Handling
 *
 * The cancellation flow is designed to handle race conditions between:
 * - The `cancel()` method being called
 * - The `onstop` event firing from `MediaRecorder.stop()`
 * - The duration timeout completing
 *
 * The flow ensures:
 * 1. `isCancelled` flag is set BEFORE calling `recorder.stop()`
 * 2. The `onstop` handler checks `isCancelled` before resolving
 * 3. The reject callback is called synchronously after stopping
 * 4. References are cleared after rejection to prevent double-handling
 *
 * This guarantees that a cancelled capture will always reject with
 * AnimationCancelledError, never accidentally resolve with partial data.
 */
export class MediaRecorderCapture {
    /** The active MediaRecorder instance, null when not recording */
    private activeRecorder: MediaRecorder | null = null;
    /** Flag to track cancellation state - set BEFORE stopping recorder */
    private isCancelled = false;
    /** Stored reject callback for cancellation - cleared after use */
    private cancelReject: ((error: Error) => void) | null = null;

    /**
     * Creates a new MediaRecorderCapture instance
     * @param frames - The frames the graph draws: each is copied to a resized recording and counted.
     */
    constructor(private readonly frames: FrameSource) {}

    /**
     * Detects browser and returns best supported codec
     *
     * Browser Support:
     * - Chrome/Edge/Firefox: WebM (VP9 preferred, VP8 fallback)
     * - Safari/iOS: MP4 (H.264)
     *
     * Format priority:
     * 1. WebM VP9 (best quality, smallest size)
     * 2. WebM VP8 (good quality, good compatibility)
     * 3. MP4 H.264 (Safari, universal fallback)
     * @param requestedFormat - Requested video format or 'auto' for automatic detection
     * @returns MIME type string for the selected codec
     */
    private getSupportedCodec(requestedFormat?: "webm" | "mp4" | "auto"): string {
        // If user explicitly requested a format, try that first
        if (requestedFormat === "mp4") {
            if (MediaRecorder.isTypeSupported("video/mp4")) {
                return "video/mp4";
            }

            throw captureError("E_UNSUPPORTED", "MP4 not supported in this browser", {
                reason: "format",
                format: "mp4",
            });
        }

        if (requestedFormat === "webm") {
            if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
                return "video/webm;codecs=vp9";
            }

            if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
                return "video/webm;codecs=vp8";
            }

            throw captureError("E_UNSUPPORTED", "WebM not supported in this browser", {
                reason: "format",
                format: "webm",
            });
        }

        // Auto-detect best format (default)
        // Try WebM first (better compression, open format)
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
            return "video/webm;codecs=vp9";
        }

        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
            return "video/webm;codecs=vp8";
        }

        // Fall back to MP4 for Safari
        if (MediaRecorder.isTypeSupported("video/mp4")) {
            return "video/mp4";
        }

        // Try without codec specification (browser will choose)
        if (MediaRecorder.isTypeSupported("video/webm")) {
            return "video/webm";
        }

        throw captureError(
            "E_UNSUPPORTED",
            "No supported video formats found. Browser may not support MediaRecorder API.",
            { reason: "format" },
        );
    }

    /**
     * Captures video in realtime using MediaRecorder API.
     * Streams canvas frames to a video blob as the animation plays -- the canvas itself, or a copy
     * at the size asked for -- and counts the frames the graph draws while it records.
     * @param canvas - The HTML canvas element to capture
     * @param options - Animation capture options
     * @param onProgress - Optional callback for progress updates (0-100)
     * @param control - For a recording the caller times itself: when its clock starts, and its
     *     expected length.
     * @returns Animation result with blob and metadata
     */
    async captureRealtime(
        canvas: HTMLCanvasElement,
        options: AnimationOptions,
        onProgress?: (progress: number) => void,
        control: RecordingControl = {},
    ): Promise<AnimationResult> {
        // Reset cancellation state for new capture
        this.isCancelled = false;
        this.cancelReject = null;

        // A hidden tab draws no frames, so nothing would be recorded.
        if (document.visibilityState === "hidden") {
            throw recordingFailure("hidden");
        }

        const codec = this.getSupportedCodec(options.format);
        const fps = options.fps ?? VIDEO_CONSTANTS.DEFAULT_FPS;
        const output = outputCanvas(canvas, options);
        const context = output === canvas ? null : output.getContext("2d");
        const { width, height } = output;
        // Fitted inside the output with the canvas's aspect, centered; the margins left are black.
        const scale = Math.min(width / canvas.width, height / canvas.height);
        const drawWidth = canvas.width * scale;
        const drawHeight = canvas.height * scale;
        const left = (width - drawWidth) / 2;
        const top = (height - drawHeight) / 2;
        if (context) {
            context.fillStyle = "#000";
            context.fillRect(0, 0, width, height);
        }
        const stream = output.captureStream(fps);
        // Timed by `duration`, or by the caller, who stops it.
        const timed = options.duration;
        const expectedFrames = Math.floor(((timed ?? control.lengthMs ?? 0) / 1000) * fps);
        // The copy's fit is computed once, so the source keeps its pixel size or the recording fails.
        const sourceWidth = canvas.width;
        const sourceHeight = canvas.height;
        const counter = frameCounter(fps, expectedFrames);

        // Create MediaRecorder
        const recorderOptions: MediaRecorderOptions = {
            mimeType: codec,
        };

        if (options.videoBitrate) {
            recorderOptions.videoBitsPerSecond = options.videoBitrate;
        }

        const recorder = new MediaRecorder(stream, recorderOptions);
        this.activeRecorder = recorder;

        // Collect chunks
        const chunks: Blob[] = [];

        return new Promise<AnimationResult>((resolve, reject) => {
            // Store reject for cancellation
            this.cancelReject = reject;

            // Check if already cancelled before starting
            if (this.isCancelled) {
                this.activeRecorder = null;
                this.cancelReject = null;
                reject(new AnimationCancelledError());
                return;
            }

            const stopFrames = this.frames(() => {
                if (canvas.width !== sourceWidth || canvas.height !== sourceHeight) {
                    this.fail("resized");
                    return;
                }
                // Copied in the same task the graph drew in, while the drawing buffer still holds it.
                context?.drawImage(canvas, left, top, drawWidth, drawHeight);
                counter.frame();
            });
            const onVisibility = (): void => {
                if (document.visibilityState === "hidden") {
                    this.fail("hidden");
                }
            };
            document.addEventListener("visibilitychange", onVisibility);
            let startedAt = 0;
            let progressInterval: ReturnType<typeof setInterval> | undefined;
            let durationTimer: ReturnType<typeof setTimeout> | undefined;
            let started = false;

            // Ended with the recording: a canvas capture track left live keeps the browser copying
            // every frame of the canvas for a recorder that is gone.
            const finish = (): void => {
                clearInterval(progressInterval);
                clearTimeout(durationTimer);
                clearTimeout(startTimer);
                stopFrames();
                document.removeEventListener("visibilitychange", onVisibility);
                stream.getTracks().forEach((track) => {
                    track.stop();
                });
            };

            // THE DURATION IS COUNTED FROM THE RECORDER'S FIRST DATA, NOT FROM start(). The
            // browser's encoder takes hundreds of milliseconds to start on a slow machine, and a
            // frame drawn before it has is never recorded: a half-second recording counted from
            // start() was a 110-byte file holding no frame at all on a two-core CI runner.
            const startClock = (): void => {
                if (started) {
                    return;
                }

                started = true;
                clearTimeout(startTimer);

                const startTime = Date.now();
                counter.start();
                control.onStart?.();
                if (timed === undefined) {
                    return;
                }

                progressInterval = setInterval(() => {
                    // Stop progress tracking if cancelled
                    if (this.isCancelled) {
                        clearInterval(progressInterval);
                        return;
                    }

                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(100, (elapsed / timed) * 100);
                    onProgress?.(progress);

                    if (elapsed >= timed) {
                        clearInterval(progressInterval);
                    }
                }, VIDEO_CONSTANTS.PROGRESS_INTERVAL_MS);

                durationTimer = setTimeout(() => {
                    clearInterval(progressInterval);
                    // Only stop if not already cancelled
                    if (!this.isCancelled && recorder.state !== "inactive") {
                        recorder.stop();
                        onProgress?.(100);
                    }
                }, timed);
            };

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                    startClock();
                }
            };

            recorder.onstop = () => {
                finish();
                this.activeRecorder = null;
                this.cancelReject = null;

                // If cancelled, don't resolve - the rejection has already happened
                if (this.isCancelled) {
                    return;
                }

                const blob = new Blob(chunks, { type: recorder.mimeType });
                // Determine format from MIME type
                // Safari/iOS sometimes returns empty blob.type, so we fall back to requested codec
                const actualMimeType = blob.type || codec; // Use requested codec if blob.type is empty
                const mimeType = actualMimeType.toLowerCase();
                const format =
                    mimeType.includes("mp4") || mimeType.includes("mpeg") || mimeType.includes("quicktime")
                        ? "mp4"
                        : "webm";

                const { framesCaptured } = counter;

                resolve({
                    blob,
                    metadata: {
                        duration: timed ?? Math.round(performance.now() - startedAt),
                        fps,
                        format,
                        width,
                        height,
                        framesCaptured,
                        framesDropped: expectedFrames - framesCaptured,
                        dropRate: calculateDropRate(framesCaptured, expectedFrames),
                    },
                });
            };

            recorder.onerror = (e: Event) => {
                finish();
                this.activeRecorder = null;
                this.cancelReject = null;
                const errorMsg = e instanceof ErrorEvent ? e.message : "Unknown error";
                reject(captureError("E_CAPTURE_FAILED", `MediaRecorder error: ${errorMsg}`, { media: "video" }));
            };

            const startTimer = setTimeout(() => {
                if (started || this.isCancelled) {
                    return;
                }

                // Rejected before stop(), so the onstop that follows finds the promise settled.
                this.isCancelled = true;
                finish();
                reject(
                    captureError(
                        "E_CAPTURE_FAILED",
                        `MediaRecorder produced no data in ${String(VIDEO_CONSTANTS.RECORDER_START_TIMEOUT_MS)} ms`,
                        { media: "video" },
                    ),
                );
                if (recorder.state !== "inactive") {
                    recorder.stop();
                }
            }, VIDEO_CONSTANTS.RECORDER_START_TIMEOUT_MS);

            // A timeslice, so the recorder reports its first data as soon as the encoder runs
            // rather than only at stop(); that first data starts the clock.
            startedAt = performance.now();
            recorder.start(VIDEO_CONSTANTS.PROGRESS_INTERVAL_MS);
        });
    }

    /**
     * End a recording the caller times (no `duration`): the recording resolves with what it holds.
     */
    stop(): void {
        if (this.activeRecorder && this.activeRecorder.state !== "inactive") {
            this.activeRecorder.stop();
        }
    }

    /**
     * Fail an ongoing capture: it rejects with `E_CANCELLED` (an `AnimationCancelledError`) or with
     * `E_CAPTURE_FAILED` `{ media: "video", reason }`, and never resolves with what it recorded.
     *
     * The flow is ordered to avoid race conditions:
     * 1. Set `isCancelled` first, so the `onstop` that follows does not resolve
     * 2. Stop the recorder (may trigger onstop asynchronously)
     * 3. Reject synchronously, before onstop can run
     * 4. Clear state, so nothing handles it twice
     * @param reason - `"cancelled"`, or why the recording failed.
     * @returns True if a capture was failed, false if none was in progress.
     */
    fail(reason: "cancelled" | RecordingFailure): boolean {
        const recorder = this.activeRecorder;
        if (!recorder) {
            return false;
        }

        this.isCancelled = true;
        this.activeRecorder = null;
        if (recorder.state !== "inactive") {
            recorder.stop();
        }

        const reject = this.cancelReject;
        this.cancelReject = null;
        reject?.(reason === "cancelled" ? new AnimationCancelledError() : recordingFailure(reason));
        return true;
    }

    /**
     * Cancel an ongoing capture: it rejects with `E_CANCELLED`.
     * @returns true if a capture was cancelled, false if no capture was in progress
     */
    cancel(): boolean {
        return this.fail("cancelled");
    }

    /**
     * Check if a capture is currently in progress
     * @returns True if actively recording, false otherwise
     */
    isCapturing(): boolean {
        return this.activeRecorder !== null && this.activeRecorder.state === "recording";
    }

    /**
     * Get the MIME type that will be used for the given format option
     * @param format - Requested video format or 'auto' for automatic detection
     * @returns MIME type string for the selected codec
     */
    getMimeType(format?: "webm" | "mp4" | "auto"): string {
        return this.getSupportedCodec(format);
    }
}

/**
 * The error a recording fails with for a reason of its own.
 * @param reason - Why it failed.
 * @returns The `E_CAPTURE_FAILED` error.
 */
function recordingFailure(reason: RecordingFailure): GraphtyError {
    return captureError("E_CAPTURE_FAILED", `the recording failed: ${reason}`, { media: "video", reason });
}

/**
 * The canvas a recording takes its frames from: the graph's own, or a copy at the size asked for.
 * One side given keeps the canvas's aspect; both given fit the picture inside them.
 * @param canvas - The graph's canvas.
 * @param options - The capture's options.
 * @returns The canvas to record.
 */
function outputCanvas(canvas: HTMLCanvasElement, options: AnimationOptions): HTMLCanvasElement {
    const { width, height } = outputSize(canvas, options);
    if (width === canvas.width && height === canvas.height) {
        return canvas;
    }
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    return output;
}

/**
 * Counts the frames a recording receives: of the frames the graph draws after `start()`, at most
 * one in each 1/fps slot, and no more than the recording expects. Slots are centered on the first
 * frame counted, so a graph drawing at the recording's own rate is not counted as dropping frames
 * for a millisecond's jitter.
 * @param fps - The recording's frame rate.
 * @param expectedFrames - The frames the recording expects.
 * @returns The counter.
 */
function frameCounter(
    fps: number,
    expectedFrames: number,
): { start: () => void; frame: () => void; readonly framesCaptured: number } {
    const interval = 1000 / fps;
    let started = false;
    let origin: number | undefined;
    let lastSlot = -1;
    let framesCaptured = 0;
    return {
        start: () => {
            started = true;
        },
        frame: () => {
            if (!started) {
                return;
            }
            const now = performance.now();
            origin ??= now;
            const slot = Math.round((now - origin) / interval);
            if (slot !== lastSlot && slot < expectedFrames) {
                lastSlot = slot;
                framesCaptured++;
            }
        },
        get framesCaptured() {
            return framesCaptured;
        },
    };
}

/**
 * Stand the camera where a stationary recording asked, with zoom-to-fit held off, until the
 * returned function puts it back. The camera is there for the recording, not placed by the reader,
 * so the element's own framing goes on as before afterwards.
 * @param graph - The graph being recorded.
 * @param camera - The camera state or named view to record from.
 * @returns Puts the camera, its placement and zoom-to-fit back.
 */
export async function holdCameraForCapture(
    graph: Graph,
    camera: NonNullable<AnimationOptions["camera"]>,
): Promise<() => Promise<void>> {
    // While immersive the headset owns the camera: refused before anything is changed.
    const immersive = stateProblem({}, graph.getViewMode());
    if (immersive !== null) {
        throw cameraRefusal(immersive);
    }
    const updateManager = graph.getUpdateManager();
    const zoomToFitWasEnabled = updateManager.isZoomToFitEnabled();
    if (zoomToFitWasEnabled) {
        updateManager.disableZoomToFit();
    }
    const original = graph.getCameraState();
    const restorePlacement = graph.saveCameraPlacement();
    const restore = async (): Promise<void> => {
        await graph.setCameraState(original);
        restorePlacement();
        if (zoomToFitWasEnabled) {
            updateManager.enableZoomToFit();
        }
    };
    try {
        await graph.setCameraState("view" in camera ? { preset: camera.view } : camera);
    } catch (error: unknown) {
        await restore();
        throw error;
    }
    return restore;
}

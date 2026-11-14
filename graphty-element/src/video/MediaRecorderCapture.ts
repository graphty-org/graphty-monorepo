import type { Graph } from "../Graph.js";
import { captureError } from "../screenshot/captureError.js";
import { VIDEO_CONSTANTS } from "../screenshot/constants.js";
import { type AnimationOptions, type AnimationResult, calculateDropRate } from "./VideoCapture.js";

/**
 * Error thrown when animation capture is cancelled by the user
 */
export class AnimationCancelledError extends Error {
    /**
     * Creates a new AnimationCancelledError
     */
    constructor() {
        super("Animation capture cancelled");
        this.name = "AnimationCancelledError";
    }
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
     * @returns Animation result with blob and metadata
     */
    async captureRealtime(
        canvas: HTMLCanvasElement,
        options: AnimationOptions,
        onProgress?: (progress: number) => void,
    ): Promise<AnimationResult> {
        // Reset cancellation state for new capture
        this.isCancelled = false;
        this.cancelReject = null;

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
        const expectedFrames = Math.floor((options.duration / 1000) * fps);
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
                // Copied in the same task the graph drew in, while the drawing buffer still holds it.
                context?.drawImage(canvas, left, top, drawWidth, drawHeight);
                counter.frame();
            });
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
                progressInterval = setInterval(() => {
                    // Stop progress tracking if cancelled
                    if (this.isCancelled) {
                        clearInterval(progressInterval);
                        return;
                    }

                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(100, (elapsed / options.duration) * 100);
                    onProgress?.(progress);

                    if (elapsed >= options.duration) {
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
                }, options.duration);
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
                        duration: options.duration,
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
            recorder.start(VIDEO_CONSTANTS.PROGRESS_INTERVAL_MS);
        });
    }

    /**
     * Cancel an ongoing capture.
     *
     * The cancellation flow is carefully ordered to avoid race conditions:
     * 1. Set `isCancelled` flag first (prevents onstop from resolving)
     * 2. Stop the recorder (may trigger onstop asynchronously)
     * 3. Reject the promise synchronously (guarantees cancellation error)
     * 4. Clear state (prevents double-handling)
     * @returns true if a capture was cancelled, false if no capture was in progress
     */
    cancel(): boolean {
        if (!this.activeRecorder) {
            return false;
        }

        // Step 1: Set flag BEFORE stopping - onstop handler checks this
        this.isCancelled = true;

        // Step 2: Stop the recorder (may trigger onstop asynchronously)
        if (this.activeRecorder.state !== "inactive") {
            this.activeRecorder.stop();
        }

        // Step 3: Reject synchronously - this happens before onstop can check isCancelled
        if (this.cancelReject) {
            this.cancelReject(new AnimationCancelledError());
            this.cancelReject = null;
        }

        // Step 4: Clear state to prevent any further handling
        this.activeRecorder = null;
        return true;
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
 * The canvas a recording takes its frames from: the graph's own, or a copy at the size asked for.
 * One side given keeps the canvas's aspect; both given fit the picture inside them.
 * @param canvas - The graph's canvas.
 * @param options - The capture's options.
 * @returns The canvas to record.
 */
function outputCanvas(canvas: HTMLCanvasElement, options: AnimationOptions): HTMLCanvasElement {
    const width = Math.round(options.width ?? (options.height ?? canvas.height) * (canvas.width / canvas.height));
    const height = Math.round(options.height ?? width * (canvas.height / canvas.width));
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
        await graph.setCameraState(camera);
    } catch (error: unknown) {
        await restore();
        throw error;
    }
    return restore;
}

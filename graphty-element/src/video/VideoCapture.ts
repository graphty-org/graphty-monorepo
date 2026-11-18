import type { CameraState } from "../screenshot/types.js";

/**
 * The formats a recording comes out in: what `AnimationResult.metadata.format` names.
 * @since 3.40.0
 */
export type VideoFormat = "webm" | "mp4";

/**
 * Every {@link VideoFormat}, for a caller that lists the formats or checks a value against them.
 * @since 3.40.0
 */
export const VIDEO_FORMATS: readonly VideoFormat[] = Object.freeze(["webm", "mp4"]);

/**
 * One stop of a camera path given as a 3D position and target, flown as `setCameraState` would place
 * the camera. It is used only in 3D: in 2D it is refused with `E_UNSUPPORTED`; give a
 * {@link ViewWaypoint} with a zoom and pan there.
 */
export interface CameraWaypoint {
    /** Where the camera stands, in world units. */
    position: { x: number; y: number; z: number };
    /** What the camera looks at, in world units. */
    target: { x: number; y: number; z: number };
    /** Time to reach this waypoint from the previous one (ms) */
    duration?: number;
    /**
     * How long the camera stays at this waypoint once it arrives, in milliseconds, counted in the
     * time of the frames drawn. Makes the path a tour.
     * @default 0
     */
    hold?: number;
}

/**
 * One stop of a camera tour given as a view: where the camera goes, how long it takes to get there
 * and how long it stays. A path holding any of these, or any `hold`, is a tour, flown with the
 * element's own camera moves, so it works the same in 2D and in 3D.
 * @example
 * ```typescript
 * await element.playTour([
 *     { view: "overview", hold: 2000 },
 *     { view: "cluster-a", duration: 1500, hold: 3000 },
 *     { view: { zoom: 2, pan: { x: 40, y: 0 } }, duration: 1500, hold: 3000 },
 * ]);
 * ```
 */
export interface ViewWaypoint {
    /**
     * Where to go: the name of a view -- a camera view (`catalog.cameras()` ids, such as
     * `"fitToGraph"`) or a view saved in `session.views` -- or a camera state. A name nothing
     * answers to is refused with `E_UNKNOWN_CAMERA` before the tour starts; a view with nothing the
     * current drawing mode can use (a 2D view in 3D, a 3D view in 2D) with `E_UNSUPPORTED`.
     */
    view: string | CameraState;
    /**
     * Time to reach this stop from the previous one (ms). The first stop's duration is the flight
     * from wherever the camera is; 0 or absent jumps there.
     */
    duration?: number;
    /**
     * How long the camera stays at this stop once it arrives, in milliseconds, counted in the time
     * of the frames drawn.
     * @default 0
     */
    hold?: number;
}

/**
 * Options for capturing animation/video from the graph.
 *
 * Video capture uses the browser's MediaRecorder API for hardware-accelerated
 * real-time capture. This provides excellent performance but operates in real-time,
 * meaning the video is captured as the animation plays. Frame timing depends on
 * system performance; on slower systems, some frames may be dropped.
 *
 * For guaranteed frame-perfect capture (e.g., for production video rendering),
 * consider using external screen recording software or frame-by-frame export
 * with a third-party video encoding library like ffmpeg.
 * @see src/screenshot/constants.ts for default values (VIDEO_CONSTANTS)
 */
export interface AnimationOptions {
    /** Total duration of the video capture in milliseconds */
    duration: number;
    /**
     * Target frames per second.
     * @default 30 (VIDEO_CONSTANTS.DEFAULT_FPS)
     */
    fps?: number;
    /** Video format: 'webm', 'mp4', or 'auto' to detect best format for browser */
    format?: VideoFormat | "auto";
    /**
     * Video bitrate in bits per second.
     * Higher values = better quality but larger file size.
     * @default 5000000 (VIDEO_CONSTANTS.DEFAULT_VIDEO_BITRATE - 5 Mbps)
     */
    videoBitrate?: number;
    /**
     * Output width in pixels. Given alone, the height follows the canvas's aspect; given with
     * `height`, the picture is fitted inside the two, centered, with black margins.
     * @default the canvas width
     */
    width?: number;
    /**
     * Output height in pixels; see `width`.
     * @default the canvas height
     */
    height?: number;
    /** Camera behavior during capture: 'stationary' or 'animated' */
    cameraMode: "stationary" | "animated";
    /**
     * Stationary mode: where the camera stands while recording -- a camera state, or a named view
     * (`catalog.cameras()` ids or views saved in `session.views`). The camera is put back afterwards.
     * @default the camera as it is
     */
    camera?: CameraState | { preset: string };
    /**
     * Waypoints for camera animation path (animated mode), flown with the same camera moves as
     * `playTour`; see {@link ViewWaypoint}. Two or more, unless a stop has a `view` or a `hold`. The
     * recording lasts `duration`, and ends the flight if it is still under way, so `duration` is
     * best the sum of the stops' durations and holds.
     */
    cameraPath?: (CameraWaypoint | ViewWaypoint)[];
    /**
     * A tour, in animated mode, in place of `cameraPath`: the names of the views to visit in
     * order -- camera views (`catalog.cameras()` ids, such as `"fitToGraph"`) or views saved in
     * `session.views` -- with the duration split evenly between them, starting at the first. Two or
     * more names; works in 2D and in 3D. A view with nothing the current drawing mode can use is
     * refused with `E_UNSUPPORTED`. For holds or uneven legs, give `cameraPath` stops with `view`
     * and `hold` instead.
     */
    tour?: readonly string[];
    /** Easing function for camera animations (default: 'easeInOut') */
    easing?: "linear" | "easeInOut" | "easeIn" | "easeOut";
    /** Whether to automatically download the video after capture */
    download?: boolean;
    /** Filename for downloaded video (default: 'graphty-animation.{format}') */
    downloadFilename?: string;
}

export interface AnimationResult {
    blob: Blob;
    metadata: {
        duration: number;
        fps: number;
        /** The format the recording came out in; with `"auto"`, the one the browser could record. */
        format: VideoFormat;
        /** The recorded video's width in pixels. */
        width: number;
        /** The recorded video's height in pixels. */
        height: number;
        /**
         * Frames the graph drew while recording, at most one in each 1/fps interval: the frames
         * the recording received.
         */
        framesCaptured: number;
        /** Frames expected (duration times fps) that the graph did not draw in time. */
        framesDropped: number;
        /** `framesDropped` as a percentage of the frames expected, 0 to 100. */
        dropRate: number;
    };
}

/**
 * Calculate frame drop rate as a percentage
 * @param framesCaptured - Number of frames successfully captured
 * @param expectedFrames - Total number of frames expected
 * @returns Drop rate as a percentage (0-100)
 */
export function calculateDropRate(framesCaptured: number, expectedFrames: number): number {
    if (expectedFrames === 0) {
        return 0;
    }

    const dropped = expectedFrames - framesCaptured;
    return Math.round((dropped / expectedFrames) * 100);
}

import type { EasingName, TourInput } from "../camera/tour.js";
import type { CameraState } from "../screenshot/types.js";

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
    /**
     * How long to record, in milliseconds. Required for a still recording and for the older
     * `string[]` form of `tour`. With a tour it is optional: absent, the recording lasts as long as
     * the tour does (`planTour(tour).totalMs`); given, it keeps its own length, cutting a longer
     * tour short or holding the last stop of a shorter one. Not to be confused with a tour stop's
     * `duration`, which is the flight to that stop.
     */
    duration?: number;
    /**
     * Target frames per second.
     * @default 30 (VIDEO_CONSTANTS.DEFAULT_FPS)
     */
    fps?: number;
    /** Video format: 'webm', 'mp4', or 'auto' to detect best format for browser */
    format?: "webm" | "mp4" | "auto";
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
    /**
     * Camera behavior during capture: `"stationary"` (a still recording) or `"animated"`. Optional:
     * `tour` or `cameraPath` means `"animated"`, and neither means `"stationary"`. Giving
     * `"stationary"` with a `tour` or `cameraPath` is refused with `E_BAD_COMMAND`
     * `{ reason: "conflict", options }`.
     */
    cameraMode?: "stationary" | "animated";
    /**
     * Stationary mode: where the camera stands while recording -- a camera state, or a named view
     * (`{ view }`: `catalog.cameras()` ids or views saved in `session.views`; `preset` is the older
     * spelling). The camera is put back afterwards. A state or saved view that does not fit the
     * drawing mode is refused as `setCameraState` refuses it.
     * @default the camera as it is
     */
    camera?: CameraState | { view: string } | { preset: string };
    /**
     * Waypoints for camera animation path (animated mode), flown with the same camera moves as
     * `playTour`; see {@link ViewWaypoint}.
     * @deprecated Give the same stops as `tour`.
     */
    cameraPath?: (CameraWaypoint | ViewWaypoint)[];
    /**
     * The tour to record: a saved tour's name (`session.tours`), a tour, or stops given inline --
     * everything `playTour` takes, so a tour previewed with `playTour` records unchanged. The
     * recording opens on the first stop, lasts as long as the tour unless `duration` is given, and
     * puts the camera back afterwards. It is checked first, as `planTour` checks it, and refused
     * with the problem the plan reports.
     *
     * The older form, an array of view names (`["topView", "frontView"]`), is NOT a list of stops:
     * it splits `duration` (then required) evenly between the views, starting at the first. That
     * form is deprecated: give stops, `[{ view: "topView" }, { view: "frontView", duration: 1000 }]`.
     */
    tour?: TourInput | readonly string[];
    /**
     * What a tour recording shows of each flight. `"follow-view"` records what the view shows, so
     * under reduced motion (`setReducedMotion`) each flight is a cut held for the flight's time.
     * `"authored"` records each flight as the tour gives it whatever the reduced-motion setting;
     * the canvas on screen moves with it, and covering it while recording is the caller's choice.
     * @default "follow-view"
     */
    motion?: "follow-view" | "authored";
    /** Easing function for camera animations (default: 'easeInOut') */
    easing?: EasingName;
    /**
     * Where the recording goes besides the returned blob: `download` saves it as a file, named
     * `filename` (the extension follows the format recorded). Wins over the top-level `download`
     * and `downloadFilename`.
     */
    destination?: { download?: boolean; filename?: string };
    /**
     * Cancels the recording when it aborts, as `cancelAnimationCapture()` does: the call rejects
     * with `E_CANCELLED` and no file is made.
     */
    signal?: AbortSignal;
    /**
     * Whether to automatically download the video after capture.
     * @deprecated Use `destination: { download: true }`.
     */
    download?: boolean;
    /**
     * Filename for downloaded video (default: 'graphty-animation.{format}').
     * @deprecated Use `destination: { filename }`.
     */
    downloadFilename?: string;
}

export interface AnimationResult {
    blob: Blob;
    metadata: {
        duration: number;
        fps: number;
        format: string; // Actual format used (e.g., "webm", "mp4")
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

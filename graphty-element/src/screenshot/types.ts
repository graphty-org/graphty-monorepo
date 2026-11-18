import type { EasingName } from "../camera/tour.js";
import type { CameraState } from "../camera/types.js";

/**
 * What happened to a capture's clipboard copy. `"not-requested"` when the clipboard was not one of
 * the capture's destinations.
 */
export type ClipboardStatus =
    "success" | "not-requested" | "not-supported" | "permission-denied" | "not-secure-context" | "failed";

/**
 * Options for quality enhancement during screenshot capture.
 */
export interface QualityEnhancementOptions {
    /**
     * Supersampling factor - renders at this multiple of the target resolution
     * then downscales for smoother edges. Higher values = better quality but slower.
     * @default 2
     */
    supersampleFactor?: number;

    /**
     * MSAA (Multi-Sample Anti-Aliasing) sample count.
     * Values: 1 (off), 2, 4, 8, 16 (hardware dependent).
     * Combined with supersampling for even better results.
     * @default 4
     */
    msaaSamples?: number;

    /**
     * Enable FXAA as a final pass after other AA methods.
     * Generally not needed when using supersampling, but can help smooth
     * any remaining jaggies.
     * @default false
     */
    fxaa?: boolean;
}

export interface ScreenshotOptions {
    format?: "png" | "jpeg" | "webp";
    quality?: number;
    multiplier?: number;
    width?: number;
    height?: number;
    strictAspectRatio?: boolean;
    transparentBackground?: boolean;
    /**
     * A solid color painted behind the graph in place of the canvas background, in any CSS color
     * syntax (`"#ffffff"`, `"white"`, `"rgb(255 255 255)"`). Honored by every format. Takes
     * precedence over `transparentBackground`. Left out, the image has the canvas's background.
     * A color that cannot be read fails the capture with the `GraphtyError` `E_OPTION_RANGE` (`details.option` `"backgroundColor"`).
     * @example
     * backgroundColor: "#ffffff"
     */
    backgroundColor?: string;
    /**
     * Cancels the capture. Aborted while the capture waits (for earlier captures and operations,
     * or for the layout to settle), it rejects with the signal's reason (an `AbortError` `DOMException` by default) and draws, downloads and
     * copies nothing. Aborted once the picture has been read, it changes nothing.
     */
    signal?: AbortSignal;
    /**
     * Enable quality enhancement for the screenshot.
     * Can be a boolean (true = default settings) or an object with specific settings.
     *
     * Quality enhancement uses supersampling (rendering at higher resolution then downscaling)
     * which provides the highest quality anti-aliasing for screenshots.
     * @example
     * // Use default settings (2x supersampling)
     * enhanceQuality: true
     * @example
     * // Custom settings
     * enhanceQuality: {
     *   supersampleFactor: 4,  // 4x supersampling (very high quality, slower)
     *   msaaSamples: 4,        // Also add MSAA
     * }
     */
    enhanceQuality?: boolean | QualityEnhancementOptions;
    destination?: {
        blob?: boolean;
        download?: boolean;
        clipboard?: boolean;
    };
    downloadFilename?: string;
    preset?: "print" | "web-share" | "thumbnail" | "documentation";
    /**
     * The camera to capture from, restored afterwards: a state, or a named view (a camera view's
     * id or a saved view's name) with its own options, e.g.
     * `{ view: "fitToGraph", params: { keepAngle: true } }` to frame every node from the angle on
     * screen. `preset` is the older spelling of `view`. A state or saved view that does not fit
     * the drawing mode, or any camera while immersive, is refused as `setCameraState` refuses it.
     */
    camera?:
        | CameraState
        | { view: string; params?: Readonly<Record<string, unknown>> }
        | { preset: string; params?: Readonly<Record<string, unknown>> };
    timing?: {
        waitForSettle?: boolean;
        waitForOperations?: boolean;
        /**
         * How long `waitForSettle` waits for a moving layout to come to rest before the capture
         * fails with `E_NOT_SETTLED`, in milliseconds. Default 30,000.
         */
        settleTimeoutMs?: number;
        /**
         * Abort this signal to stop waiting and capture the frame on screen now: a capture still
         * queued behind earlier work starts at once, and one waiting for the layout to settle stops
         * waiting. Already aborted, the capture waits for nothing.
         * @example
         * const now = new AbortController();
         * const shot = graph.captureScreenshot({ timing: { captureNow: now.signal } });
         * // later, from a "Capture now" button:
         * now.abort();
         */
        captureNow?: AbortSignal;
    };
    /**
     * A key drawn into the image, sized as it would be on the canvas and scaled with the capture.
     *
     * - `true` draws the element's own legend (`session.styles.legend()`): one section per bound
     *   channel, headed by the field's name, with a chip per value or a ramp between the domain's
     *   ends. It writes no words of its own -- only the data's values and names.
     * - `"auto"` does the same, and only when a layer binds a value.
     * - `{ position, title }` is `true` with a corner (default `"bottom-right"`) and a heading line
     *   in the caller's words (none by default).
     * - An array draws exactly the sections passed, at the top left -- every word is the caller's.
     *
     * Absent, `false` or an empty array, the image has no key.
     * @example
     * legend: true
     * @example
     * legend: { position: "top-left", title: "Degree" }
     * @example
     * legend: [{ title: "Color: Louvain", rows: [{ label: "1", color: "#4e79a7", value: "17" }] }]
     */
    legend?: boolean | "auto" | ScreenshotLegendOptions | readonly ScreenshotLegendSection[];
    /**
     * Whether the selection highlight is drawn into the image. `false` leaves it out of this
     * capture only: the selection stays as it is on screen and no selection event fires.
     * @default true -- the image shows what the canvas shows
     */
    showSelection?: boolean;

    // -------------------------------------------------------------------------
    // Future Features (Not Yet Implemented)
    // -------------------------------------------------------------------------

    /**
     * PNG metadata embedding.
     *
     * NOTE: This feature is not yet implemented. PNG metadata embedding
     * requires binary format manipulation and external libraries.
     * See design/screen-capture-design-review.md for details.
     *
     * When implemented, this will allow embedding custom metadata into PNG files
     * such as graph information, capture settings, or application data.
     * @deprecated Not yet implemented - Phase 3+ feature
     */
    // embedMetadata?: boolean;

    /**
     * Custom metadata to embed in the PNG file.
     *
     * NOTE: This feature is not yet implemented. Requires embedMetadata support.
     * @deprecated Not yet implemented - Phase 3+ feature
     */
    // metadata?: Record<string, string>;
}

/** A corner of the image a capture's key sits in. */
export type ScreenshotLegendPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** Where the element's own legend goes in a capture, and an optional heading for it. */
export interface ScreenshotLegendOptions {
    /** The corner the key sits in. @default "bottom-right" */
    position?: ScreenshotLegendPosition;
    /** A heading line above the key, in the caller's words. Absent, the key has no heading. */
    title?: string;
}

/** One section of the key a capture draws (`ScreenshotOptions.legend`), in the caller's words. */
export interface ScreenshotLegendSection {
    /** The section's heading. */
    title: string;
    /** A line per value: its words, an optional color chip, and an optional value at the right. */
    rows?: readonly { label: string; color?: string; value?: string }[];
    /** A continuous scale from `min` to `max`: a bar painted with `colors`, or a size wedge without them. */
    ramp?: { min: string; max: string; colors?: readonly string[] };
    /** A line under the section, such as how many values were left out. */
    note?: string;
}

export interface ScreenshotResult {
    blob: Blob;
    downloaded: boolean;
    clipboardStatus: ClipboardStatus;
    clipboardError?: Error;
    errors?: Error[];
    metadata: {
        width: number;
        height: number;
        format: string;
        byteSize: number;
        captureTime: number;
        /** Time spent on quality enhancement (FXAA), only present if enhanceQuality was true */
        enhancementTime?: number;
    };
}

/*
 * CAMERA STATE IS DECLARED IN `src/camera/types.ts` and re-exported here.
 *
 * A registered camera view returns one, and a view has to be writable against a Node-safe entry
 * point -- so the declaration lives in a module `./extend` and `./catalog` can reach, and this
 * file keeps publishing the name every screenshot caller already imports.
 */
export type { CameraState } from "../camera/types.js";

// Camera animation options (extends QueueableOptions for operation queue integration)
export interface CameraAnimationOptions {
    animate?: boolean;
    duration?: number;
    easing?: EasingName;

    // Operation queue options
    skipQueue?: boolean;
    description?: string;
}

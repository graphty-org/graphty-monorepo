import type { EasingName } from "../camera/tour.js";
import type { CameraState } from "../camera/types.js";
import type { GraphtyError } from "../errors/index.js";
import type { PendingWorkProgress } from "../managers/OperationQueueManager.js";

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

/** What `captureScreenshot` takes: every option is optional, and `{}` captures the canvas as a PNG. */
export interface ScreenshotOptions {
    /** The image format. @default "png" */
    format?: "png" | "jpeg" | "webp";
    /** The encoder quality for JPEG and WebP, 0 to 1. Default 0.92 for JPEG, 1 for the others. */
    quality?: number;
    /**
     * The image size as a multiple of the canvas's size in device pixels. Ignored when `width` or
     * `height` is given.
     * @default 1
     */
    multiplier?: number;
    /**
     * The image width in pixels. Given alone, the height follows the canvas's aspect ratio. Takes
     * precedence over `multiplier`.
     */
    width?: number;
    /**
     * The image height in pixels. Given alone, the width follows the canvas's aspect ratio. Takes
     * precedence over `multiplier`.
     */
    height?: number;
    /**
     * With both `width` and `height` given, fail the capture with `E_OPTION_RANGE` (`details.option`
     * `"strictAspectRatio"`) when their ratio differs from the canvas's by more than 1%, rather than
     * stretching the picture.
     * @default false
     */
    strictAspectRatio?: boolean;
    /**
     * Leave the background transparent. PNG and WebP only: with JPEG the capture fails with
     * `E_BAD_COMMAND`. `backgroundColor` wins over it.
     * @default false
     */
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
     * Told how much queued work -- loads, layouts, algorithm runs, earlier captures, this one
     * among them -- the capture is waiting behind, now and on every change, until it is taken.
     * Not called when `timing.waitForOperations` is false.
     */
    onProgress?: (fact: PendingWorkProgress) => void;
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
    /** Where the image goes besides `result.blob`, which every result carries. */
    destination?: {
        /** Save the image as a file the browser downloads, named by `downloadFilename`. */
        download?: boolean;
        /** Copy the image to the clipboard; `result.clipboardStatus` says how that went. */
        clipboard?: boolean;
    };
    /** The downloaded file's name. Default `graph-<milliseconds since 1970>.<format>`. */
    downloadFilename?: string;
    /**
     * A named set of options (`session.catalog.screenshotPresets()` lists what each sets). Options
     * given beside it win over the preset's, and the two `destination`s merge.
     */
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
        | {
              /** The id of a registered camera view, such as `"fitToGraph"`, or a saved view's name. */
              view: string;
              /** The view's own options, checked against the ones its descriptor declares. */
              params?: Readonly<Record<string, unknown>>;
          }
        | {
              /** The older spelling of `view`. */
              preset: string;
              /** The view's own options, checked against the ones its descriptor declares. */
              params?: Readonly<Record<string, unknown>>;
          };
    /**
     * What the capture waits for before it reads the canvas. Whatever these say, it also waits for
     * pictures still loading -- a background, a node's image or 3D model, a label's font, the map --
     * and a frame drawn once they have landed, as `waitForStableFrame()` does; `captureNow` ends that wait too.
     */
    timing?: {
        /** Wait for a moving layout to come to rest, failing with `E_NOT_SETTLED` after `settleTimeoutMs`. @default true */
        waitForSettle?: boolean;
        /** Wait for the operations queued before the capture (data loads, layout and style changes) to finish. @default true */
        waitForOperations?: boolean;
        /**
         * How long `waitForSettle` waits for a moving layout to come to rest before the capture
         * fails with `E_NOT_SETTLED`, in milliseconds. Default 30,000.
         */
        settleTimeoutMs?: number;
        /**
         * Abort this signal to stop waiting and capture the frame on screen now: a capture still
         * queued behind earlier work starts at once, and one waiting for the layout to settle or for
         * a picture to load stops waiting. Already aborted, the capture waits for nothing.
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
     *   in the caller's words (none by default); with `sections`, it draws those in place of the
     *   element's own legend.
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
    /**
     * The sections to draw in place of the element's own legend, every word the caller's (as the
     * array form, but in `position`'s corner). Drawn below `title` when both are given.
     * @since 3.58.0
     */
    sections?: readonly ScreenshotLegendSection[];
}

/** One section of the key a capture draws (`ScreenshotOptions.legend`), in the caller's words. */
export interface ScreenshotLegendSection {
    /** The section's heading. */
    title: string;
    /** A line per value: its words, an optional color chip, and an optional value at the right. */
    rows?: readonly {
        /** The value's words. */
        label: string;
        /** The chip's color, in any CSS color syntax; absent, the row has no chip. */
        color?: string;
        /** Text at the right of the row, such as a count. */
        value?: string;
    }[];
    /** A continuous scale from `min` to `max`: a bar painted with `colors`, or a size wedge without them. */
    ramp?: {
        /** The words at the low end. */
        min: string;
        /** The words at the high end. */
        max: string;
        /** The colors painted from low to high, in any CSS color syntax. */
        colors?: readonly string[];
    };
    /** A line under the section, such as how many values were left out. */
    note?: string;
}

/** What a capture resolves to: the image, what happened to each destination, and facts about it. */
export interface ScreenshotResult {
    /** The image, encoded in the capture's format. */
    blob: Blob;
    /** Whether the download was started; false when it was not asked for or the browser refused it. */
    downloaded: boolean;
    /** What happened to the clipboard copy. */
    clipboardStatus: ClipboardStatus;
    /** Why the clipboard copy failed, when it did. */
    clipboardError?: Error;
    /**
     * What went wrong with a destination the capture still finished without: a failed download or
     * clipboard copy, each a `GraphtyError` whose `code` and `details` say what failed. Empty when
     * every destination asked for went.
     */
    errors: GraphtyError[];
    /** Facts about the image. */
    metadata: {
        /** The image width in pixels. */
        width: number;
        /** The image height in pixels. */
        height: number;
        /** The image format, `"png"`, `"jpeg"` or `"webp"`. */
        format: string;
        /** The size of `blob` in bytes. */
        byteSize: number;
        /** How long the capture took, waiting included, in milliseconds. */
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

/** How a camera change moves: at once, or animated over time. */
export interface CameraAnimationOptions {
    /** Move the camera there over `duration`. Left out or false, it jumps. */
    animate?: boolean;
    /**
     * How long the move takes, in milliseconds; 0 jumps. Reduced motion, or a camera transition
     * time set in the graph's configuration, wins over it.
     * @default 1000
     */
    duration?: number;
    /** How the move speeds up and slows down: a cubic curve, or constant speed for `"linear"`. Default constant speed. */
    easing?: EasingName;
    /**
     * Jump at once, ahead of queued work, instead of animating in turn after it. Also cancels a
     * camera animation still running.
     * @default false
     */
    skipQueue?: boolean;
    /** What the queued move is called in the operation queue's progress reports. */
    description?: string;
}

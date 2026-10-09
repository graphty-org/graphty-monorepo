import type { CameraState } from "../camera/types.js";

export type ClipboardStatus = "success" | "not-supported" | "permission-denied" | "not-secure-context" | "failed";

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
     * The camera to capture from, restored afterwards: a state, or a named view with its own
     * options, e.g. `{ preset: "fitToGraph", params: { keepAngle: true } }` to frame every node
     * from the angle on screen.
     */
    camera?: CameraState | { preset: string; params?: Readonly<Record<string, unknown>> };
    timing?: {
        waitForSettle?: boolean;
        waitForOperations?: boolean;
    };
    /**
     * A key drawn into the image at its top left, sized as it would be on the canvas. The element
     * draws exactly what is passed -- every word is the caller's -- so a consumer builds the
     * sections from the same `session.styles.legend()` blocks it shows on screen. Absent or empty,
     * the image has no key.
     * @example
     * legend: [{ title: "Color: Louvain", rows: [{ label: "1", color: "#4e79a7", value: "17" }] }]
     */
    legend?: readonly ScreenshotLegendSection[];
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
export type { CameraState };

// Camera animation options (extends QueueableOptions for operation queue integration)
export interface CameraAnimationOptions {
    animate?: boolean;
    duration?: number;
    easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";

    // Operation queue options
    skipQueue?: boolean;
    description?: string;
}

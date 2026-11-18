import { VIDEO_CONSTANTS } from "../screenshot/constants.js";

/** What `estimateAnimationCapture` predicts for a recording. */
export interface CaptureEstimate {
    /** The frames the recording expects: its length times its frame rate. */
    totalFrames: number;
    /** True when the size and frame rate together are likely more than the browser can record. */
    likelyToDropFrames: boolean;
    /** A frame rate to record at instead, when frames are likely to drop. */
    recommendedFps?: number;
    /**
     * A size to record at instead, when frames are likely to drop: the same aspect, scaled down to
     * about 1920x1080's pixel count.
     */
    recommendedResolution?: { width: number; height: number };
    /** The file's approximate size in bytes, from the bitrate and the length. */
    estimatedFileSize?: number;
}

/** What the estimate is computed from: every size and length already known. */
export interface CaptureEstimateInput {
    /** The recording's length, ms. */
    duration: number;
    fps?: number;
    width: number;
    height: number;
    videoBitrate?: number;
}

/**
 * The size a recording is made at: the canvas's own, or the size asked for. One side given keeps
 * the canvas's aspect; both given fit the picture inside them.
 * @param canvas - The canvas's pixel size.
 * @param canvas.width - Its width.
 * @param canvas.height - Its height.
 * @param options - The width and height asked for.
 * @param options.width - The width asked for.
 * @param options.height - The height asked for.
 * @returns The recording's width and height in pixels.
 */
export function outputSize(
    canvas: { width: number; height: number },
    options: { width?: number; height?: number },
): { width: number; height: number } {
    const width = Math.round(options.width ?? (options.height ?? canvas.height) * (canvas.width / canvas.height));
    const height = Math.round(options.height ?? width * (canvas.height / canvas.width));
    return { width, height };
}

/** 1920x1080: the pixel count above which a high frame rate is likely to drop frames. */
const FULL_HD_PIXELS = 1920 * 1080;

/**
 * Estimates performance and potential issues for animation capture.
 * Predicts frame drops and provides recommendations based on resolution and FPS.
 * @param options - The recording's length, frame rate, size and bitrate.
 * @returns Capture estimate with warnings and recommendations
 */
export function estimateAnimationCapture(options: CaptureEstimateInput): CaptureEstimate {
    const fps = options.fps ?? VIDEO_CONSTANTS.DEFAULT_FPS;
    const { width, height } = options;

    const totalFrames = Math.floor((options.duration / 1000) * fps);
    const pixelCount = width * height;

    // Above 1920x1080 at more than 30 fps is likely to drop frames; either alone is usually safe.
    const likelyToDropFrames = pixelCount > FULL_HD_PIXELS && fps > 30;

    const result: CaptureEstimate = { totalFrames, likelyToDropFrames };

    if (likelyToDropFrames) {
        result.recommendedFps = 30;
        const scale = Math.sqrt(FULL_HD_PIXELS / pixelCount);
        result.recommendedResolution = { width: Math.round(width * scale), height: Math.round(height * scale) };
    }

    const bitrate = options.videoBitrate ?? VIDEO_CONSTANTS.DEFAULT_VIDEO_BITRATE;
    result.estimatedFileSize = Math.ceil((bitrate * (options.duration / 1000)) / 8);

    return result;
}

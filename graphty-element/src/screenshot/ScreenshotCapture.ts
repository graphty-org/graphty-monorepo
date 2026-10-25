import {
    type AbstractMesh,
    type Camera,
    CreateScreenshotAsync,
    CreateScreenshotUsingRenderTarget,
    DefaultRenderingPipeline,
    EncodeArrayBufferToBase64,
    EncodeImageAsync,
    type Engine,
    FxaaPostProcess,
    type Mesh,
    type RenderTargetTexture,
    type Scene,
    type WebGPUEngine,
} from "@babylonjs/core";

import type { ViewInsets } from "../camera/types.js";
import { type Graph, operationQueueOf } from "../Graph.js";
import { CustomLineRenderer } from "../meshes/CustomLineRenderer.js";
import { RichTextLabel } from "../meshes/RichTextLabel.js";
import { SELECTION_HALO_MESH } from "../Node.js";
import { downloadBlob } from "../utils/download.js";
import { copyToClipboard } from "./clipboard.js";
import { SCREENSHOT_CONSTANTS } from "./constants.js";
import { calculateDimensions } from "./dimensions.js";
import { drawLegend, legendBox } from "./drawLegend.js";
import { resolvePreset } from "./presets.js";
import { ScreenshotError, ScreenshotErrorCode } from "./ScreenshotError.js";
import { enableTransparentBackground, restoreBackground } from "./transparency.js";
import type {
    CameraState,
    ClipboardStatus,
    QualityEnhancementOptions,
    ScreenshotLegendSection,
    ScreenshotOptions,
    ScreenshotResult,
} from "./types.js";

/**
 * Handles screenshot capture for graph visualizations using Babylon.js rendering engine.
 * Supports quality enhancement, transparent backgrounds, format conversion, and multiple output destinations.
 */
export class ScreenshotCapture {
    /**
     * Common mesh names used for skybox/PhotoDome meshes.
     * PhotoDome creates "testdome" by default; other common names are also included.
     */
    private readonly skyboxMeshNames = ["testdome", "skybox", "skyBox", "Skybox"];

    /**
     * Creates a new ScreenshotCapture instance
     * @param engine - The Babylon.js rendering engine
     * @param scene - The Babylon.js scene to capture
     * @param canvas - The HTML canvas element being rendered to
     * @param graph - The graph instance for accessing layout and camera state
     * @param requestFrame - Asks the render loop to draw the next frame, even when the picture
     *     looks final: a graph drawn on demand draws none for a background cleared for a moment
     */
    constructor(
        private readonly engine: Engine | WebGPUEngine,
        private readonly scene: Scene,
        private readonly canvas: HTMLCanvasElement,
        private readonly graph: Graph,
        private readonly requestFrame: () => void = () => undefined,
    ) {}

    /**
     * Find the skybox mesh in the scene.
     * Searches for common skybox mesh names and patterns.
     * @returns The skybox mesh if found, null otherwise
     */
    private findSkyboxMesh(): Mesh | null {
        // Check common skybox mesh names
        for (const name of this.skyboxMeshNames) {
            const mesh = this.scene.getMeshByName(name) as Mesh | null;
            if (mesh) {
                return mesh;
            }
        }

        // Fallback: look for PhotoDome or common skybox patterns
        const fallbackMesh = this.scene.meshes.find(
            (m) => m.name.toLowerCase().includes("dome") || m.name.toLowerCase().includes("skybox"),
        ) as Mesh | null;

        return fallbackMesh ?? null;
    }

    /**
     * Captures a screenshot of the current scene with the specified options.
     * Handles timing, camera state, quality enhancement, and output destinations.
     * @param options - Screenshot configuration options
     * @returns Screenshot result with blob, metadata, and destination status
     */
    async captureScreenshot(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
        // Check if we should wait for other operations (default: true)
        const waitForOperations = options.timing?.waitForOperations ?? true;

        if (waitForOperations) {
            // Enqueue the screenshot operation to ensure sequential execution
            // Store the result in a variable and return it after the queue completes
            let result: ScreenshotResult | null = null;

            await operationQueueOf(this.graph).queueOperationAsync(
                "render-update",
                async () => {
                    result = await this.doScreenshotCapture(options);
                },
                { description: "capture screenshot" },
            );

            // Result will always be set by the queued operation
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return result!;
        }

        // Execute immediately without waiting for other operations
        return this.doScreenshotCapture(options);
    }

    /**
     * The view insets that keep the key's own box clear: on the side that costs the canvas the
     * smaller share, left of a tall key or above a wide one.
     * @param legend - The key the capture draws.
     * @returns The insets to frame the capture with, in CSS pixels.
     */
    private reserveLegend(legend: readonly ScreenshotLegendSection[]): ViewInsets {
        const { right, bottom } = legendBox(legend);
        const width = this.canvas.clientWidth || this.canvas.width;
        const height = this.canvas.clientHeight || this.canvas.height;

        return right / width <= bottom / height ? { left: right } : { top: bottom };
    }

    /**
     * Performs the actual screenshot capture logic.
     * Handles timing options, camera overrides, quality enhancement, format conversion,
     * and destinations (blob, download, clipboard). Ensures proper cleanup of temporary
     * state (camera position, quality enhancement, transparent background) even on failure.
     * @param options - Screenshot configuration options
     * @returns Promise resolving to the ScreenshotResult
     * @internal
     */
    private async doScreenshotCapture(options: ScreenshotOptions): Promise<ScreenshotResult> {
        const startTime = Date.now();

        // Check engine configuration
        const gl = (this.engine as Engine)._gl;

        if (gl && !gl.getContextAttributes()?.preserveDrawingBuffer) {
            throw new ScreenshotError(
                "Screenshot requires Engine to be created with preserveDrawingBuffer: true",
                ScreenshotErrorCode.ENGINE_NOT_CONFIGURED,
            );
        }

        // Get timing options with defaults
        const timing = {
            waitForSettle: true,
            waitForOperations: true,
            ...options.timing,
        };

        // 1. Wait for pending operations if requested
        if (timing.waitForOperations) {
            await this.waitForOperations();
        }

        // 2. Wait for layout to settle if requested
        if (timing.waitForSettle) {
            await this.waitForLayoutSettle(timing.settleTimeoutMs ?? SCREENSHOT_CONSTANTS.LAYOUT_SETTLE_TIMEOUT_MS);
        }

        // 3. Handle camera override
        const cameraOverride = options.camera ? await this.overrideCamera(options, options.camera) : undefined;

        // Left out of the picture only: the selection itself, and its events, are untouched. A
        // frame is drawn without the halos before the capture reads one, because the capture
        // reads the canvas at the end of the next tick and a tick can skip drawing.
        const hiddenHalos = options.showSelection === false ? this.hideSelectionHalos() : [];

        try {
            if (hiddenHalos.length > 0) {
                await this.waitForRender();
            }

            return await this.captureFramed(options, startTime);
        } finally {
            this.showSelectionHalos(hiddenHalos);
            if (cameraOverride) {
                await this.restoreCamera(cameraOverride);
            }
        }
    }

    /**
     * Point the camera where a capture asked, holding zoom-to-fit off and, for a named view, the
     * screen's margins replaced by the key's, until {@link restoreCamera}.
     * @param options - Screenshot configuration options.
     * @param camera - The camera the capture asked for.
     * @returns What to put back afterwards.
     */
    private async overrideCamera(
        options: ScreenshotOptions,
        camera: NonNullable<ScreenshotOptions["camera"]>,
    ): Promise<CameraOverride> {
        // Temporarily disable zoom-to-fit to prevent camera from being reset
        const updateManager = this.graph.getUpdateManager();
        const zoomToFitWasEnabled = updateManager.isZoomToFitEnabled();
        if (zoomToFitWasEnabled) {
            updateManager.disableZoomToFit();
        }

        const override: CameraOverride = {
            original: this.graph.getCameraState(),
            // A named view frames the graph for the picture, and the picture has none of the
            // screen's chrome in it: the only thing over it is the key this capture draws, so that
            // is the one margin the framing keeps clear.
            insets: "preset" in camera ? this.graph.getViewInsets() : undefined,
            // The capture's camera is there for a moment, not placed by the reader, so the
            // element's own framing goes on as before once the capture puts the camera back.
            restorePlacement: this.graph.saveCameraPlacement(),
            zoomToFitWasEnabled,
        };

        try {
            const cameraState = "preset" in camera ? this.captureView(options, camera) : camera;
            await this.graph.setCameraState(cameraState);
            await this.waitForRender();
        } catch (error: unknown) {
            await this.restoreCamera(override);
            throw error;
        }

        return override;
    }

    /**
     * Swap the screen's margins for the capture's key and resolve the named view inside them.
     * @param options - Screenshot configuration options.
     * @param camera - The named view the capture asked for.
     * @returns Where the camera stands for the picture.
     */
    private captureView(
        options: ScreenshotOptions,
        camera: Extract<NonNullable<ScreenshotOptions["camera"]>, { preset: string }>,
    ): CameraState {
        const legend = options.legend ?? [];
        this.graph.setViewInsets(legend.length > 0 ? this.reserveLegend(legend) : {});
        const { params } = camera;
        return this.graph.resolveCameraPreset(camera.preset, params === undefined ? undefined : { params });
    }

    /**
     * Put back what {@link overrideCamera} changed: the screen's margins first, since in 3D they
     * decide where the restored camera centers, then the camera and whether it counts as placed,
     * then zoom-to-fit.
     * @param override - What the override replaced.
     */
    private async restoreCamera(override: CameraOverride): Promise<void> {
        if (override.insets) {
            this.graph.setViewInsets(override.insets);
        }

        await this.graph.setCameraState(override.original);
        override.restorePlacement();
        if (override.zoomToFitWasEnabled) {
            this.graph.getUpdateManager().enableZoomToFit();
        }
    }

    /**
     * Hide every enabled selection halo, for a capture without the selection.
     * @returns The halos hidden.
     */
    private hideSelectionHalos(): AbstractMesh[] {
        const halos = this.scene.meshes.filter((m) => m.name.startsWith(SELECTION_HALO_MESH) && m.isEnabled(false));
        for (const halo of halos) {
            halo.setEnabled(false);
        }
        if (halos.length > 0) {
            this.graph.getUpdateManager().meshesShownOrHidden();
        }

        return halos;
    }

    /**
     * Show again the halos {@link hideSelectionHalos} hid, those not disposed meanwhile.
     * @param halos - The halos hidden.
     */
    private showSelectionHalos(halos: readonly AbstractMesh[]): void {
        for (const halo of halos) {
            if (!halo.isDisposed()) {
                halo.setEnabled(true);
            }
        }
        if (halos.length > 0) {
            this.graph.getUpdateManager().meshesShownOrHidden();
        }
    }

    /**
     * Capture the framed view: size it, clear the background and enhance it when asked, and hand
     * the picture to its destinations, putting the background and enhancement back afterwards.
     * @param options - Screenshot configuration options.
     * @param startTime - When the capture started.
     * @returns The capture's result.
     */
    private async captureFramed(options: ScreenshotOptions, startTime: number): Promise<ScreenshotResult> {
        // Resolve preset if specified
        const finalOptions = options.preset ? resolvePreset(options.preset, options) : options;

        // Calculate dimensions
        const dimensions = calculateDimensions(this.canvas, finalOptions);

        // Determine format and quality
        const format = finalOptions.format ?? "png";
        const quality =
            finalOptions.quality ??
            (format === "jpeg" ? SCREENSHOT_CONSTANTS.DEFAULT_JPEG_QUALITY : SCREENSHOT_CONSTANTS.DEFAULT_PNG_QUALITY);

        // Validate format-specific options
        if (finalOptions.transparentBackground && format !== "png" && format !== "webp") {
            throw new ScreenshotError(
                "Transparent background requires PNG or WebP format",
                ScreenshotErrorCode.TRANSPARENT_REQUIRES_PNG,
            );
        }

        // Handle transparent background
        let backgroundState;
        if (finalOptions.transparentBackground) {
            const skyboxMesh = this.findSkyboxMesh();
            backgroundState = enableTransparentBackground(this.scene, skyboxMesh);
            // A graph drawn on demand would hand back its last frame, background and all:
            // draw one with the background cleared before reading the canvas.
            this.requestFrame();
            await this.waitForRender();
        }

        // Handle quality enhancement (supersampling + optional MSAA/FXAA)
        let enhancement: Enhancement | undefined;
        if (finalOptions.enhanceQuality) {
            const enhancementStartTime = Date.now();
            this.graph.eventManager.emit("screenshot-enhancing", {});

            // Normalize enhanceQuality to options object
            const enhancementOptions: QualityEnhancementOptions =
                typeof finalOptions.enhanceQuality === "boolean"
                    ? {} // Use defaults
                    : finalOptions.enhanceQuality;

            enhancement = {
                state: this.enableQualityEnhancement(enhancementOptions, dimensions),
                startTime: enhancementStartTime,
            };
            // Wait for renders with the enhancement applied
            await this.waitForRender();
            await this.waitForRender(); // Extra frame for pipeline to stabilize
        }

        try {
            return await this.deliver(finalOptions, { format, quality }, dimensions, enhancement, startTime);
        } finally {
            // Restore background state if it was modified
            if (backgroundState) {
                const skyboxMesh = this.findSkyboxMesh();
                restoreBackground(this.scene, skyboxMesh, backgroundState);
            }

            // Remove quality enhancement if it was added
            if (enhancement) {
                this.disableQualityEnhancement(enhancement.state);
            }
        }
    }

    /**
     * Read the picture and hand it to its destinations: a blob always, a download and the
     * clipboard when asked.
     * @param finalOptions - Screenshot options, preset resolved.
     * @param encoding - The image format and quality.
     * @param encoding.format - The image format.
     * @param encoding.quality - The encoder quality.
     * @param dimensions - The output size.
     * @param enhancement - The quality enhancement applied, if any.
     * @param startTime - When the capture started.
     * @returns The capture's result.
     */
    private async deliver(
        finalOptions: ScreenshotOptions,
        encoding: { format: NonNullable<ScreenshotOptions["format"]>; quality: number },
        dimensions: ReturnType<typeof calculateDimensions>,
        enhancement: Enhancement | undefined,
        startTime: number,
    ): Promise<ScreenshotResult> {
        const { format, quality } = encoding;
        const enhancementState = enhancement?.state;
        // Handle destinations
        const destinations = finalOptions.destination ?? { blob: true };
        let clipboardStatus: ClipboardStatus = "success";
        let clipboardError: Error | undefined;

        // Start capturing the blob (this promise will be shared)
        const captured = this.captureBlob(
            format,
            quality,
            // Capture dimensions (may be supersampled)
            enhancementState?.supersampledWidth ?? dimensions.width,
            enhancementState?.supersampledHeight ?? dimensions.height,
            enhancementState?.supersampleFactor,
            dimensions.width,
            dimensions.height,
        );
        // The key goes on after any downscale, sized as on the canvas: output pixels per CSS pixel.
        const legend = finalOptions.legend ?? [];
        const scale = dimensions.width / (this.canvas.clientWidth || this.canvas.width);
        const blobPromise =
            legend.length === 0 ? captured : captured.then((blob) => drawLegend(blob, legend, scale, quality));

        // If clipboard is requested, start clipboard write immediately (before blob is ready)
        // This preserves the user gesture context
        const clipboardPromise = destinations.clipboard ? copyToClipboard(blobPromise) : undefined;

        // Wait for the blob to be ready
        const blob = await blobPromise;

        // Handle download
        const downloaded = destinations.download
            ? tryDownload(blob, finalOptions.downloadFilename ?? `graph-${Date.now()}.${format}`)
            : false;

        // Wait for clipboard operation to complete
        if (clipboardPromise) {
            const result = await clipboardPromise;
            clipboardStatus = result.status;
            clipboardError = result.error;
        }

        const captureTime = Date.now() - startTime;
        const enhancementTime = enhancement?.startTime ? Date.now() - enhancement.startTime : undefined;

        // Emit screenshot-ready event with enhancement info
        if (finalOptions.enhanceQuality) {
            this.graph.eventManager.emit("screenshot-ready", { enhancementTime });
        }

        return {
            blob,
            downloaded,
            clipboardStatus,
            clipboardError,
            metadata: {
                width: dimensions.width,
                height: dimensions.height,
                format,
                byteSize: blob.size,
                captureTime,
                enhancementTime,
            },
        };
    }

    /**
     * Waits for any pending operations in the operation queue to complete.
     * Since the screenshot operation is queued, this is handled automatically
     * by the queue - all previous operations complete before this one starts.
     * @returns Promise that resolves when all operations are complete
     * @internal
     */
    private async waitForOperations(): Promise<void> {
        // The operation queue automatically handles waiting for previous operations
        // Since we're already inside a queued operation, we don't need to do anything special
        // All previous operations will have completed before this one starts
        return Promise.resolve();
    }

    /**
     * Waits for the layout engine to settle before capturing a screenshot.
     * If no layout engine is active or it's already settled, returns immediately.
     * Throws ScreenshotError with LAYOUT_SETTLE_TIMEOUT if the layout doesn't settle
     * within the given timeout.
     * @param timeoutMs - How long to wait, in milliseconds.
     * @returns Promise that resolves when layout has settled
     * @internal
     */
    private async waitForLayoutSettle(timeoutMs: number): Promise<void> {
        const layoutManager = this.graph.getLayoutManager();

        if (!layoutManager.layoutEngine) {
            return Promise.resolve();
        }

        // NOT MOVING is what a capture waits for, which is not the same as settled: a layout the
        // consumer paused part-way is still, and never emits `graph-settled`, so waiting for it to
        // converge would time out on every capture of a paused graph.
        const atRest = (): boolean => !layoutManager.running || layoutManager.isSettled;

        if (atRest()) {
            return Promise.resolve();
        }

        // Wait for layout to settle (with timeout)
        return new Promise((resolve, reject) => {
            let completed = false;
            let listenerId: symbol | null = null;

            const cleanup = (): void => {
                clearTimeout(timeout);
                if (listenerId) {
                    this.graph.eventManager.removeListener(listenerId);
                    listenerId = null;
                }
            };

            const timeout = setTimeout(() => {
                if (!completed) {
                    completed = true;
                    cleanup();
                    reject(
                        new ScreenshotError(
                            "Layout did not settle within timeout",
                            ScreenshotErrorCode.LAYOUT_SETTLE_TIMEOUT,
                        ),
                    );
                }
            }, timeoutMs);

            const handler = (): void => {
                if (!completed && atRest()) {
                    completed = true;
                    cleanup();
                    resolve();
                }
            };

            listenerId = this.graph.eventManager.addListener("graph-settled", handler);

            // Check immediately in case it's already settled

            if (!completed && atRest()) {
                completed = true;
                cleanup();
                resolve();
            }
        });
    }

    /**
     * Waits for a single render frame to complete.
     * Used to ensure the scene state is fully rendered before capture.
     * @internal
     */
    private async waitForRender(): Promise<void> {
        return new Promise((resolve) => {
            this.scene.onAfterRenderObservable.addOnce(() => {
                resolve();
            });
        });
    }

    /**
     * Captures the current scene as a Blob image.
     * Handles supersampling if enabled, capturing at higher resolution and downscaling.
     * @param format - Image format ('png', 'jpeg', or 'webp')
     * @param quality - Image quality (0.0 to 1.0)
     * @param captureWidth - Width to capture (may be supersampled)
     * @param captureHeight - Height to capture (may be supersampled)
     * @param supersampleFactor - Optional supersampling factor for downscaling
     * @param targetWidth - Final output width (if downscaling)
     * @param targetHeight - Final output height (if downscaling)
     * @returns Promise resolving to the captured image Blob
     * @internal
     */
    private async captureBlob(
        format: string,
        quality: number,
        captureWidth: number,
        captureHeight: number,
        supersampleFactor?: number,
        targetWidth?: number,
        targetHeight?: number,
    ): Promise<Blob> {
        try {
            // Map our format names to MIME types
            let mimeType: string;
            if (format === "png") {
                mimeType = "image/png";
            } else if (format === "jpeg") {
                mimeType = "image/jpeg";
            } else {
                mimeType = "image/webp";
            }

            // Use Babylon.js CreateScreenshotAsync
            if (!this.scene.activeCamera) {
                throw new ScreenshotError("No active camera in scene", ScreenshotErrorCode.SCREENSHOT_CAPTURE_FAILED);
            }

            // A copy of the canvas is only as sharp as the canvas: one of any other size is the
            // scene drawn again at that size, so 4x has four times the detail rather than four
            // times the blur. A different shape still gets the canvas, fitted in, since drawing
            // the scene at another aspect would show a different part of the graph.
            // ponytail: a mismatched aspect stays an enlarged copy; render it at the fitted size
            // and pad it if anyone asks for sharp output there.
            // Babylon's precision scales the size; quality is only the encoder's, below.
            const size = { width: captureWidth, height: captureHeight, precision: 1 };
            const camera = this.scene.activeCamera;
            const sameSize = captureWidth === this.canvas.width && captureHeight === this.canvas.height;
            const sameShape =
                Math.abs(captureWidth / captureHeight - this.canvas.width / this.canvas.height) <=
                1 / Math.min(this.canvas.width, this.canvas.height);
            let dataUrl: string;
            if (sameSize || !sameShape) {
                dataUrl = await CreateScreenshotAsync(this.engine, camera, size);
            } else {
                const scale = captureWidth / this.canvas.width;
                CustomLineRenderer.setPixelScale(this.scene, scale);
                // the words too: a label's texture is sized for the screen, so it is drawn again with
                // as many pixels as the capture shows it at
                RichTextLabel.setCaptureScale(this.scene, scale);
                try {
                    dataUrl = await renderTargetCapture(
                        this.engine,
                        camera,
                        size,
                        this.engine.getCreationOptions().antialias ? 4 : 1,
                    );
                } finally {
                    CustomLineRenderer.setPixelScale(this.scene, 1);
                    RichTextLabel.setCaptureScale(this.scene, 1);
                }
            }

            // Convert data URL to blob
            let blob = await this.dataUrlToBlob(dataUrl, mimeType, quality);

            // If supersampling was used, downscale to target size
            if (supersampleFactor && supersampleFactor > 1 && targetWidth && targetHeight) {
                blob = await this.downscaleBlob(blob, targetWidth, targetHeight, mimeType, quality);
            }

            return blob;
        } catch (error) {
            throw new ScreenshotError(
                "Screenshot capture failed",
                ScreenshotErrorCode.SCREENSHOT_CAPTURE_FAILED,
                error,
            );
        }
    }

    /**
     * Converts a data URL to a Blob, optionally converting the image format.
     * Since Babylon.js CreateScreenshotAsync always returns PNG, this method
     * handles conversion to JPEG or WebP formats as needed.
     * @param dataUrl - The data URL from CreateScreenshotAsync
     * @param mimeType - Target MIME type for the output
     * @param quality - Image quality for lossy formats (0.0 to 1.0)
     * @returns Promise resolving to the image Blob
     * @internal
     */
    private async dataUrlToBlob(dataUrl: string, mimeType: string, quality: number): Promise<Blob> {
        const response = await fetch(dataUrl);
        const arrayBuffer = await response.arrayBuffer();

        // If we need a different format, convert it
        // For now, CreateScreenshotAsync always returns PNG, so we need to convert
        if (mimeType !== "image/png") {
            return this.convertBlobFormat(new Blob([arrayBuffer], { type: "image/png" }), mimeType, quality);
        }

        return new Blob([arrayBuffer], { type: mimeType });
    }

    /**
     * Converts a Blob from one image format to another using canvas rendering.
     * Loads the blob into an Image, draws it to a canvas, and exports in the target format.
     * @param blob - Source image Blob
     * @param targetMimeType - Target MIME type (e.g., 'image/jpeg')
     * @param quality - Image quality for lossy formats (0.0 to 1.0)
     * @returns Promise resolving to the converted Blob
     * @internal
     */
    private async convertBlobFormat(blob: Blob, targetMimeType: string, quality: number): Promise<Blob> {
        // Create an image element to load the blob
        const img = new Image();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            throw new ScreenshotError(
                "Failed to get 2D context for format conversion",
                ScreenshotErrorCode.CANVAS_ALLOCATION_FAILED,
            );
        }

        const imgUrl = URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(imgUrl);

                canvas.toBlob(
                    (convertedBlob) => {
                        if (convertedBlob) {
                            resolve(convertedBlob);
                        } else {
                            reject(
                                new ScreenshotError(
                                    "Failed to convert image format",
                                    ScreenshotErrorCode.SCREENSHOT_CAPTURE_FAILED,
                                ),
                            );
                        }
                    },
                    targetMimeType,
                    quality,
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(imgUrl);
                reject(
                    new ScreenshotError(
                        "Failed to load image for format conversion",
                        ScreenshotErrorCode.SCREENSHOT_CAPTURE_FAILED,
                    ),
                );
            };

            img.src = imgUrl;
        });
    }

    /**
     * Downscales an image Blob to target dimensions using high-quality bilinear filtering.
     * Used when supersampling is enabled to create the final output at the requested resolution.
     * @param blob - Source image Blob (at supersampled resolution)
     * @param targetWidth - Final output width
     * @param targetHeight - Final output height
     * @param mimeType - Output MIME type
     * @param quality - Image quality for lossy formats (0.0 to 1.0)
     * @returns Promise resolving to the downscaled Blob
     * @internal
     */
    private async downscaleBlob(
        blob: Blob,
        targetWidth: number,
        targetHeight: number,
        mimeType: string,
        quality: number,
    ): Promise<Blob> {
        const img = new Image();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            throw new ScreenshotError(
                "Failed to get 2D context for downscaling",
                ScreenshotErrorCode.CANVAS_ALLOCATION_FAILED,
            );
        }

        const imgUrl = URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
            img.onload = () => {
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Enable high-quality image scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                // Draw the supersampled image scaled down
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                URL.revokeObjectURL(imgUrl);

                canvas.toBlob(
                    (downscaledBlob) => {
                        if (downscaledBlob) {
                            resolve(downscaledBlob);
                        } else {
                            reject(
                                new ScreenshotError(
                                    "Failed to downscale image",
                                    ScreenshotErrorCode.SCREENSHOT_CAPTURE_FAILED,
                                ),
                            );
                        }
                    },
                    mimeType,
                    quality,
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(imgUrl);
                reject(
                    new ScreenshotError(
                        "Failed to load image for downscaling",
                        ScreenshotErrorCode.SCREENSHOT_CAPTURE_FAILED,
                    ),
                );
            };

            img.src = imgUrl;
        });
    }

    /**
     * Enable quality enhancement using supersampling and optional MSAA/FXAA.
     * Returns the enhancement state so it can be removed after capture.
     * @param options - Quality enhancement configuration
     * @param dimensions - Target output dimensions
     * @param dimensions.width - Target width in pixels
     * @param dimensions.height - Target height in pixels
     * @returns Enhancement state object for cleanup
     */
    private enableQualityEnhancement(
        options: QualityEnhancementOptions,
        dimensions: { width: number; height: number },
    ): EnhancementState {
        const camera = this.scene.activeCamera;
        if (!camera) {
            throw new ScreenshotError(
                "No active camera for quality enhancement",
                ScreenshotErrorCode.SCREENSHOT_CAPTURE_FAILED,
            );
        }

        // Default values
        const supersampleFactor = options.supersampleFactor ?? 2;
        const msaaSamples = options.msaaSamples ?? 4;
        const useFxaa = options.fxaa ?? false;

        const state: EnhancementState = {
            supersampleFactor,
            supersampledWidth: dimensions.width * supersampleFactor,
            supersampledHeight: dimensions.height * supersampleFactor,
        };

        // Create DefaultRenderingPipeline for MSAA support
        if (msaaSamples > 1) {
            const pipeline = new DefaultRenderingPipeline(
                "screenshotPipeline",
                false, // hdr - not needed for screenshots
                this.scene,
                [camera],
            );
            pipeline.samples = msaaSamples;
            pipeline.fxaaEnabled = useFxaa;
            state.pipeline = pipeline;
        } else if (useFxaa) {
            // FXAA only, no pipeline needed
            const fxaa = new FxaaPostProcess("screenshotFxaa", 1, camera);
            state.fxaaPostProcess = fxaa;
        }

        return state;
    }

    /**
     * Remove quality enhancement after capture and clean up resources
     * @param state - Enhancement state to dispose
     */
    private disableQualityEnhancement(state: EnhancementState): void {
        if (state.pipeline) {
            state.pipeline.dispose();
        }

        if (state.fxaaPostProcess) {
            state.fxaaPostProcess.dispose();
        }
    }
}

/**
 * State for quality enhancement that needs to be cleaned up after capture
 */
/** What a capture's camera override replaced, to put back afterwards. */
interface CameraOverride {
    readonly original: CameraState;
    readonly insets: Required<ViewInsets> | undefined;
    readonly restorePlacement: () => void;
    readonly zoomToFitWasEnabled: boolean;
}

/** A quality enhancement applied for one capture, and when it started. */
interface Enhancement {
    readonly state: EnhancementState;
    readonly startTime: number;
}

/**
 * Download a blob, reporting whether it went.
 * @param blob - The picture.
 * @param filename - The file name.
 * @returns true when the download started; a failed download does not fail the capture.
 */
function tryDownload(blob: Blob, filename: string): boolean {
    try {
        downloadBlob(blob, filename);
        return true;
    } catch {
        // Download failed, but we continue
        return false;
    }
}

interface EnhancementState {
    supersampleFactor: number;
    supersampledWidth: number;
    supersampledHeight: number;
    pipeline?: DefaultRenderingPipeline;
    fxaaPostProcess?: FxaaPostProcess;
}

/**
 * Babylon's render-target capture, with its encode step owned here. Babylon encodes the pixels in a
 * promise nobody awaits, on a shared engine it disposes when the last scene engine goes; a graph
 * torn down mid-capture then threw an unhandled rejection and left the capture pending forever.
 * Here a failed encode rejects the capture instead.
 * @param engine - the scene's engine
 * @param camera - the camera to draw from
 * @param size - the image size in pixels
 * @param size.width - the width
 * @param size.height - the height
 * @param samples - multisample count
 * @param customize - sets the render target up before it renders (its clear color)
 * @returns the PNG as a data URL
 */
export async function renderTargetCapture(
    engine: Engine | WebGPUEngine,
    camera: Camera,
    size: { width: number; height: number },
    samples: number,
    customize?: (texture: RenderTargetTexture) => void,
): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
        const encode = (
            width: number,
            height: number,
            data: ArrayBufferView,
            done?: (result: string) => void,
        ): void => {
            EncodeImageAsync(data, width, height, "image/png", true)
                .then(async (blob) => {
                    done?.(`data:image/png;base64,${EncodeArrayBufferToBase64(await blob.arrayBuffer())}`);
                })
                .catch(reject);
        };
        CreateScreenshotUsingRenderTarget(
            engine,
            camera,
            size,
            (data) => {
                resolve(data);
            },
            "image/png",
            samples,
            false,
            undefined,
            true,
            false,
            true,
            undefined,
            customize,
            encode,
            undefined,
            () => {
                reject(new Error("render-target capture timed out"));
            },
        );
    });
}

import { DynamicTexture, type ICanvas, type ISize, type Scene } from "@babylonjs/core";

/** The fields of Babylon's DynamicTexture this subclass works with, which Babylon declares private. */
interface DynamicTextureFields {
    /** What `update` uploads. */
    _canvas: ICanvas | null;
    _generateMipMaps: boolean;
}

/**
 * A label's texture: drawn on a canvas at the font's own pixels, and uploaded at the pixels the label covers on
 * screen (issue #3239).
 *
 * A label drawn many times smaller than its canvas was shrunk on the GPU through mipmaps, which average a whole
 * neighborhood of texels and blend two mip levels, so its letters were soft. Shrunk once on the CPU to the size
 * it is drawn at, with the browser's best image smoothing, the GPU then samples it about one to one.
 *
 * The canvas the label draws on is unchanged: `getContext()` and {@link getSize} are the drawing's, as on any
 * dynamic texture, so what reads a label's drawing (its ink, its colors) reads the same thing at any zoom. Only
 * what is uploaded changes, and only after {@link showAt}.
 */
export class LabelTexture extends DynamicTexture {
    /** The canvas the label is drawn on. Babylon's own `_canvas` is what is uploaded: this, or a smaller copy. */
    private readonly drawing: ICanvas;

    /**
     * Make the texture over the canvas the label is drawn on, uploaded whole until {@link showAt}.
     * @param name - The texture's name.
     * @param drawing - The canvas the label is drawn on, at its full size.
     * @param scene - The scene.
     */
    constructor(name: string, drawing: ICanvas, scene: Scene) {
        super(name, drawing, scene, true);
        this.drawing = drawing;
    }

    /**
     * The size of the canvas the label is drawn on.
     * @returns Its width and height.
     */
    override getSize(): ISize {
        // Babylon's constructor asks before `drawing` is set, when the drawing is all `_canvas` can be.
        const drawing = (this.drawing as ICanvas | undefined) ?? this.fields()._canvas;
        return drawing ? { width: drawing.width, height: drawing.height } : super.getSize();
    }

    /**
     * Upload the drawing at this many pixels, or at its own size; it is copied over on the next {@link update}.
     * @param size - The size, at most the drawing's; null uploads the drawing itself.
     * @returns Whether the uploaded size changed.
     */
    showAt(size: ISize | null): boolean {
        const engine = this._getEngine();
        const fields = this.fields();
        const own = size === null || (size.width >= this.drawing.width && size.height >= this.drawing.height);
        if (own) {
            if (fields._canvas === this.drawing) {
                return false;
            }

            fields._canvas = this.drawing;
        } else {
            let width = Math.max(1, Math.ceil(size.width));
            let height = Math.max(1, Math.ceil(size.height));
            // A device without non-power-of-two mipmaps (WebGL 1) is given the next power of two up.
            if (engine?.needPOTTextures === true) {
                width = 2 ** Math.ceil(Math.log2(width));
                height = 2 ** Math.ceil(Math.log2(height));
            }

            const current = fields._canvas;
            if (current !== null && current !== this.drawing && current.width === width && current.height === height) {
                return false;
            }

            if (current !== null && current !== this.drawing) {
                fields._canvas = current;
            } else {
                const copy = engine?.createCanvas(1, 1) ?? null;
                if (copy === null) {
                    return false;
                }

                // On the CPU, as the drawing is (see RichTextLabel's _createTexture): a GPU canvas's
                // smoothing can differ by a level at scattered pixels from one page load to the next. A canvas
                // has one context for life, so `update` gets this one.
                copy.getContext("2d", { willReadFrequently: true });
                fields._canvas = copy;
            }

            fields._canvas.width = width;
            fields._canvas.height = height;
        }

        this.releaseInternalTexture();
        this._texture =
            engine?.createDynamicTexture(
                fields._canvas.width,
                fields._canvas.height,
                fields._generateMipMaps,
                this.samplingMode,
            ) ?? null;
        return true;
    }

    /**
     * Upload the drawing: first shrunk onto the smaller canvas, when it is shown smaller.
     * @param invertY - Flip it vertically.
     * @param premulAlpha - Multiply its colors by their alpha.
     * @param allowGPUOptimization - See Babylon's `DynamicTexture.update`.
     */
    override update(invertY?: boolean, premulAlpha = false, allowGPUOptimization = false): void {
        const shown = this.fields()._canvas;
        if (shown !== null && shown !== this.drawing) {
            const context = shown.getContext("2d") as CanvasRenderingContext2D;
            context.clearRect(0, 0, shown.width, shown.height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
            context.drawImage(this.drawing as unknown as CanvasImageSource, 0, 0, shown.width, shown.height);
        }

        super.update(invertY, premulAlpha, allowGPUOptimization);
    }

    /** Dispose the texture, and empty the smaller copy it uploads; the drawing is the label's. */
    override dispose(): void {
        const shown = this.fields()._canvas;
        super.dispose();
        if (shown !== null && shown !== this.drawing) {
            shown.width = 0;
            shown.height = 0;
        }
    }

    /**
     * Babylon's private fields of this texture.
     * @returns This, typed with them.
     */
    private fields(): DynamicTextureFields {
        return this as unknown as DynamicTextureFields;
    }
}

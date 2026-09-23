/**
 * A 2D canvas for Node that records every drawing call made on it.
 *
 * WHY THIS EXISTS. `RichTextLabel` measures text with `document.createElement("canvas")` and
 * draws through the 2D context Babylon's `DynamicTexture` hands it, so in a plain Node process it
 * throws `ReferenceError: document is not defined` before it has drawn anything. The tests in this
 * directory used to answer that by not calling it at all: they drove a mock in this same directory
 * that copied the style values it was handed onto a fake mesh's metadata, so 522 of them passed
 * while executing zero lines of `src/meshes/`.
 *
 * The old label assertions had the right SHAPE -- `texture.getDrawingOperations("fillText")`, "a
 * label is only real if something was drawn" -- they were just pointed at a mock that recorded
 * operations nobody performed. This module gives the real class a canvas and records what it
 * really did, so the same assertions now read `RichTextLabel._drawContent` and
 * `RichTextRenderer.drawText`.
 *
 * TWO THINGS TO KNOW BEFORE WRITING AN ASSERTION AGAINST IT.
 *
 * `measureText` is an approximation, not a font engine: it returns a width proportional to the
 * pixel size parsed out of `ctx.font` and the length of the string. Assertions built on it must be
 * relational ("96px is wider than 24px", "two lines are taller than one") and never an absolute
 * pixel count. The real canvas in the browser project is where absolute geometry is checked.
 *
 * The `document` installed here defines `querySelectorAll` and `body.style`. Both are load-bearing:
 * `test/setup.ts` touches them in a global `afterEach` guarded only by
 * `typeof document !== "undefined"`, so a partial `document` fails every test in the file during
 * teardown rather than in its body.
 */

/** One recorded call on a 2D canvas context. */
export interface DrawOp {
    op: string;
    args: unknown[];
    /** The context state that was in force when the call was made. */
    state: {
        fillStyle: unknown;
        strokeStyle: unknown;
        font: string;
        lineWidth: number;
        globalAlpha: number;
    };
}

/** A canvas created while the polyfill was installed, with everything drawn on it. */
export interface RecordedCanvas {
    width: number;
    height: number;
    ops: DrawOp[];
}

const recordedCanvases: RecordedCanvas[] = [];

/** Parses the pixel size out of a CSS font shorthand, defaulting to 10px as the spec does. */
function fontPixelSize(font: string): number {
    const match = /(\d+(?:\.\d+)?)px/.exec(font);
    return match ? Number(match[1]) : 10;
}

interface MockGradient {
    __gradient: true;
    stops: { offset: number; color: string }[];
    addColorStop: (offset: number, color: string) => void;
}

function createGradient(): MockGradient {
    const gradient: MockGradient = {
        __gradient: true,
        stops: [],
        addColorStop(offset: number, color: string) {
            gradient.stops.push({ offset, color });
        },
    };
    return gradient;
}

/**
 * Builds a 2D context that records every call made on it.
 * @param canvas - The recorded canvas this context draws into.
 * @returns A context object shaped like CanvasRenderingContext2D.
 */
function createRecordingContext(canvas: RecordedCanvas): unknown {
    const state = {
        fillStyle: "#000000" as unknown,
        strokeStyle: "#000000" as unknown,
        lineWidth: 1,
        font: "10px sans-serif",
        globalAlpha: 1,
    };

    const record = (op: string, ...args: unknown[]): void => {
        canvas.ops.push({
            op,
            args,
            state: {
                fillStyle: state.fillStyle,
                strokeStyle: state.strokeStyle,
                font: state.font,
                lineWidth: state.lineWidth,
                globalAlpha: state.globalAlpha,
            },
        });
    };

    const noop = (op: string) => (...args: unknown[]) => record(op, ...args);

    const ctx = {
        canvas,

        get fillStyle() {
            return state.fillStyle;
        },
        set fillStyle(value: unknown) {
            state.fillStyle = value;
        },
        get strokeStyle() {
            return state.strokeStyle;
        },
        set strokeStyle(value: unknown) {
            state.strokeStyle = value;
        },
        get lineWidth() {
            return state.lineWidth;
        },
        set lineWidth(value: number) {
            state.lineWidth = value;
        },
        get font() {
            return state.font;
        },
        set font(value: string) {
            state.font = value;
        },
        get globalAlpha() {
            return state.globalAlpha;
        },
        set globalAlpha(value: number) {
            state.globalAlpha = value;
        },

        textAlign: "start",
        textBaseline: "alphabetic",
        shadowColor: "rgba(0, 0, 0, 0)",
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        globalCompositeOperation: "source-over",
        lineCap: "butt",
        lineJoin: "miter",
        miterLimit: 10,
        lineDashOffset: 0,
        imageSmoothingEnabled: true,
        filter: "none",
        direction: "ltr",

        fillRect: noop("fillRect"),
        strokeRect: noop("strokeRect"),
        clearRect: noop("clearRect"),
        fillText: noop("fillText"),
        strokeText: noop("strokeText"),
        beginPath: noop("beginPath"),
        closePath: noop("closePath"),
        moveTo: noop("moveTo"),
        lineTo: noop("lineTo"),
        arc: noop("arc"),
        arcTo: noop("arcTo"),
        quadraticCurveTo: noop("quadraticCurveTo"),
        bezierCurveTo: noop("bezierCurveTo"),
        ellipse: noop("ellipse"),
        rect: noop("rect"),
        roundRect: noop("roundRect"),
        fill: noop("fill"),
        stroke: noop("stroke"),
        clip: noop("clip"),
        save: noop("save"),
        restore: noop("restore"),
        scale: noop("scale"),
        rotate: noop("rotate"),
        translate: noop("translate"),
        transform: noop("transform"),
        setTransform: noop("setTransform"),
        resetTransform: noop("resetTransform"),
        drawImage: noop("drawImage"),
        putImageData: noop("putImageData"),
        setLineDash: noop("setLineDash"),
        getLineDash: () => [],
        createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        createPattern: () => null,
        isPointInPath: () => false,
        isPointInStroke: () => false,
        drawFocusIfNeeded: noop("drawFocusIfNeeded"),
        scrollPathIntoView: noop("scrollPathIntoView"),

        createLinearGradient(...args: unknown[]) {
            record("createLinearGradient", ...args);
            return createGradient();
        },
        createRadialGradient(...args: unknown[]) {
            record("createRadialGradient", ...args);
            return createGradient();
        },

        measureText(text: string) {
            const size = fontPixelSize(state.font);
            // 0.55em per character is the rough average advance width of a proportional face; the
            // exact number does not matter as long as it scales with the font size and the string
            // length, which is what every assertion built on this relies on.
            const width = text.length * size * 0.55;
            return {
                width,
                actualBoundingBoxLeft: 0,
                actualBoundingBoxRight: width,
                actualBoundingBoxAscent: size * 0.8,
                actualBoundingBoxDescent: size * 0.2,
                fontBoundingBoxAscent: size * 0.8,
                fontBoundingBoxDescent: size * 0.2,
                alphabeticBaseline: 0,
                emHeightAscent: size * 0.8,
                emHeightDescent: size * 0.2,
                hangingBaseline: size * 0.7,
                ideographicBaseline: -size * 0.2,
            };
        },
    };

    return ctx;
}

class RecordingCanvas {
    width: number;
    height: number;
    style: Record<string, string> = {};
    private readonly recorded: RecordedCanvas;
    private context: unknown;

    constructor(width = 300, height = 150) {
        this.width = width;
        this.height = height;
        this.recorded = { width, height, ops: [] };
        recordedCanvases.push(this.recorded);
    }

    getContext(kind: string): unknown {
        if (kind !== "2d") {
            return null;
        }

        // The recorded canvas reports the size the caller set AFTER construction -- Babylon's
        // `_createCanvas` assigns width and height as properties on the returned object.
        this.recorded.width = this.width;
        this.recorded.height = this.height;
        this.context ??= createRecordingContext(this.recorded);
        return this.context;
    }

    toDataURL(): string {
        return "data:image/png;base64,";
    }

    remove(): void {
        // Nothing to detach: this canvas was never in a document tree.
    }

    addEventListener(): void {
        // No events are dispatched in this environment.
    }

    removeEventListener(): void {
        // No events are dispatched in this environment.
    }
}

let installed = false;

/**
 * Installs the minimum browser surface `RichTextLabel` and Babylon's `DynamicTexture` need in
 * Node, if it is not already there. Safe to call repeatedly and a no-op in a real browser.
 */
export function installCanvasPolyfills(): void {
    if (installed || typeof document !== "undefined") {
        installed = true;
        return;
    }

    const globals = globalThis as Record<string, unknown>;

    globals.HTMLCanvasElement ??= RecordingCanvas;
    globals.OffscreenCanvas ??= RecordingCanvas;

    globals.document = {
        createElement: (tagName: string): unknown => {
            if (tagName === "canvas") {
                return new RecordingCanvas();
            }

            return {
                tagName: tagName.toUpperCase(),
                style: {},
                appendChild: () => undefined,
                removeChild: () => undefined,
            };
        },
        // test/setup.ts's global afterEach calls both of these, guarded only by
        // `typeof document !== "undefined"`. Omit either and every test in the file fails in
        // teardown rather than in its body.
        querySelectorAll: () => [] as unknown[],
        body: {
            style: {} as Record<string, string>,
            appendChild: () => undefined,
            removeChild: () => undefined,
        },
    };

    installed = true;
}

installCanvasPolyfills();


/** Drops every canvas recorded so far. Call before the code under test draws. */
export function resetRecordedCanvases(): void {
    recordedCanvases.length = 0;
}

/**
 * Every drawing call made on any canvas since the last reset.
 * @param op - Optional operation name to filter by, e.g. "fillText".
 * @returns The matching calls in the order they were made.
 */
export function drawOps(op?: string): DrawOp[] {
    const all = recordedCanvases.flatMap((canvas) => canvas.ops);
    return op ? all.filter((entry) => entry.op === op) : all;
}

/** The concatenated text of every `fillText` call since the last reset. */
export function drawnText(): string[] {
    return drawOps("fillText").map((entry) => String(entry.args[0]));
}


/**
 * @file The close button a label draws when its style sets `closeButton`: how big the x is, where
 * it sits on the label's canvas, how it is drawn, and where on screen a click reaches it.
 *
 * ONE PLACE FOR THE GEOMETRY. The drawing, the room the label keeps free for it, the public
 * `NodeLabel.closeRect` and the click test all read the rectangles below, so what a reader sees,
 * what a test reads and what a click hits cannot drift apart.
 */

import { type AbstractMesh, type Scene, Vector3 } from "@babylonjs/core";

/** A rectangle: on the label's canvas, or in CSS pixels on the graph's canvas. */
export interface CloseRect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** The x's side, as a multiple of the font size: a little smaller than a capital letter. */
const GLYPH_SIZE = 0.6;
/** The gap between the x and the words, as a multiple of the x's side. */
const GLYPH_GAP = 0.6;
/** How far a click may land outside the x and still reach it, as a multiple of its side. */
const HIT_SLOP = 0.4;
/** How thick the x's strokes are, as a multiple of its side. */
const STROKE = 0.14;

/**
 * The x's side on the label's canvas.
 * @param fontSize - The label's font size, in canvas units.
 * @returns The side, in canvas units.
 */
export function closeGlyphSize(fontSize: number): number {
    return fontSize * GLYPH_SIZE;
}

/**
 * How much room the words give up on their right so the x never covers them, added to the
 * label's right margin.
 * @param fontSize - The label's font size, in canvas units.
 * @returns The room, in canvas units.
 */
export function closeReserve(fontSize: number): number {
    return closeGlyphSize(fontSize) * (1 + GLYPH_GAP);
}

/**
 * Where the x is drawn: in the panel's top-right corner, inside its padding and clear of a
 * rounded corner.
 * @param panel - The panel inside its borders, on the label's canvas.
 * @param fontSize - The label's font size, in canvas units.
 * @param padding - The label's padding, in canvas units.
 * @param cornerRadius - The panel's corner radius, in canvas units.
 * @returns The x's box, on the label's canvas.
 */
export function closeGlyphRect(panel: CloseRect, fontSize: number, padding: number, cornerRadius: number): CloseRect {
    const size = closeGlyphSize(fontSize);
    // 0.3 of the radius keeps the box's corner inside a rounded corner's arc (1 - 1/sqrt(2)).
    const inset = Math.max(padding, cornerRadius * 0.3, size * 0.4);
    return { x: panel.x + panel.width - inset - size, y: panel.y + inset, width: size, height: size };
}

/**
 * Draw the x.
 * @param ctx - The label's canvas, in canvas units.
 * @param rect - Where, from {@link closeGlyphRect}.
 * @param color - The stroke colour: the label's text colour.
 */
export function drawCloseGlyph(ctx: CanvasRenderingContext2D, rect: CloseRect, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = rect.width * STROKE;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
    ctx.moveTo(rect.x + rect.width, rect.y);
    ctx.lineTo(rect.x, rect.y + rect.height);
    ctx.stroke();
    ctx.restore();
}

/**
 * The part of the label a click reaches the x in: its box and a little slop around it, kept on
 * the canvas, as fractions of the canvas (`left` and `right` across from its left edge, `top` and
 * `bottom` down from its top edge).
 * @param glyph - The x's box, from {@link closeGlyphRect}.
 * @param canvas - The label canvas's size, in canvas units.
 * @param canvas.width - Its width.
 * @param canvas.height - Its height.
 * @returns The hit area as fractions of the canvas.
 */
export function closeHitFractions(
    glyph: CloseRect,
    canvas: { width: number; height: number },
): { left: number; right: number; top: number; bottom: number } {
    const slop = glyph.width * HIT_SLOP;
    const clamp = (v: number): number => Math.min(1, Math.max(0, v));
    return {
        left: clamp((glyph.x - slop) / canvas.width),
        right: clamp((glyph.x + glyph.width + slop) / canvas.width),
        top: clamp((glyph.y - slop) / canvas.height),
        bottom: clamp((glyph.y + glyph.height + slop) / canvas.height),
    };
}

const corner = new Vector3();
const projected = new Vector3();

/**
 * Where a part of a label's plane is on screen, in CSS pixels from the graph canvas's top-left
 * corner: the box around its four projected corners.
 *
 * FROM THE PLANE'S OWN WORLD MATRIX, so it follows everything that places the label -- its node,
 * its billboard turn, a declutter move, a scale -- without knowing about any of them.
 * @param mesh - The label's plane.
 * @param part - The part, as fractions of the plane (see {@link closeHitFractions}).
 * @param part.left - Its left edge.
 * @param part.right - Its right edge.
 * @param part.top - Its top edge.
 * @param part.bottom - Its bottom edge.
 * @returns The box, or undefined when there is no camera or the part is behind it.
 */
export function planePartOnScreen(
    mesh: AbstractMesh,
    part: { left: number; right: number; top: number; bottom: number },
): CloseRect | undefined {
    const scene = mesh.getScene();
    const camera = scene.activeCamera;
    const engine = scene.getEngine();
    const canvas = engine.getRenderingCanvas();
    if (!camera || !canvas) {
        return undefined;
    }

    const world = mesh.computeWorldMatrix(true);
    const { extendSize } = mesh.getBoundingInfo().boundingBox;
    const renderWidth = engine.getRenderWidth();
    const renderHeight = engine.getRenderHeight();
    const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);
    const transform = scene.getTransformMatrix();
    // Render pixels to CSS pixels: the canvas is drawn at the device pixel ratio.
    const toCssX = canvas.clientWidth / renderWidth;
    const toCssY = canvas.clientHeight / renderHeight;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const u of [part.left, part.right]) {
        for (const v of [part.top, part.bottom]) {
            corner.set((u - 0.5) * 2 * extendSize.x, (0.5 - v) * 2 * extendSize.y, 0);
            Vector3.ProjectToRef(corner, world, transform, viewport, projected);
            if (projected.z < 0 || projected.z > 1) {
                return undefined;
            }

            minX = Math.min(minX, projected.x * toCssX);
            maxX = Math.max(maxX, projected.x * toCssX);
            minY = Math.min(minY, projected.y * toCssY);
            maxY = Math.max(maxY, projected.y * toCssY);
        }
    }

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Whether a point is inside a rectangle.
 * @param rect - The rectangle.
 * @param x - The point's x.
 * @param y - The point's y.
 * @returns True when inside or on its edge.
 */
export function inRect(rect: CloseRect, x: number, y: number): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** What a label with a close button keeps on its plane's `metadata`. */
interface CloseMetadata {
    /** The hit area as fractions of the plane, read when asked: new words resize the label. */
    labelClose: () => { left: number; right: number; top: number; bottom: number } | undefined;
}

/** How many labels with a close button each scene has, so a scene with none never looks. */
const closeLabels = new WeakMap<Scene, number>();

/**
 * Mark a label's plane as one with a close button.
 * @param mesh - The plane.
 * @param bounds - Its hit area, as {@link CloseMetadata.labelClose} reads it.
 * @returns A function that unmarks it, for when the label is disposed.
 */
export function markCloseLabel(mesh: AbstractMesh, bounds: CloseMetadata["labelClose"]): () => void {
    const scene = mesh.getScene();
    mesh.metadata = { labelClose: bounds } satisfies CloseMetadata;
    closeLabels.set(scene, (closeLabels.get(scene) ?? 0) + 1);
    let marked = true;
    return () => {
        if (marked) {
            marked = false;
            closeLabels.set(scene, (closeLabels.get(scene) ?? 1) - 1);
        }
    };
}

/**
 * Whether a scene has any label with a close button.
 * @param scene - The scene.
 * @returns True when one exists.
 */
export function hasCloseLabels(scene: Scene): boolean {
    return (closeLabels.get(scene) ?? 0) > 0;
}

/**
 * Whether a mesh is the plane of a label with a close button.
 * @param mesh - The mesh.
 * @returns True when it is.
 */
export function isCloseLabel(mesh: AbstractMesh | null | undefined): boolean {
    const metadata = mesh?.metadata as Partial<CloseMetadata> | null | undefined;
    return typeof metadata?.labelClose === "function";
}

/**
 * Where a label's close button is on screen, in CSS pixels from the graph canvas's top-left
 * corner.
 * @param mesh - The label's plane.
 * @returns The hit area, or undefined when the mesh is no label with a close button or is not
 *     in front of the camera.
 */
export function closeRectOnScreen(mesh: AbstractMesh): CloseRect | undefined {
    if (!isCloseLabel(mesh)) {
        return undefined;
    }

    const bounds = (mesh.metadata as CloseMetadata).labelClose();
    return bounds === undefined ? undefined : planePartOnScreen(mesh, bounds);
}

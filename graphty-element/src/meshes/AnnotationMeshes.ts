/**
 * @file The annotations a file draws beside its graph -- shapes, text notes and arrows that are
 * not nodes or edges -- drawn as flat planes in the graph's plane. Each annotation is painted
 * onto a canvas texture once, at the file's coordinates times the scale the stored node
 * positions are drawn at, so it stays where the file put it relative to the nodes. A background
 * annotation sits just behind the graph; a foreground one is drawn on top of it.
 */

import {
    Color3,
    DynamicTexture,
    Engine,
    Mesh,
    MeshBuilder,
    type Scene,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import type {
    AnnotationPoint,
    ArrowAnnotation,
    GraphAnnotation,
    ShapeAnnotation,
    TextAnnotation,
} from "@graphty/graph-io/styles";

import { drawnAnnotationsOf } from "../session/styles/fileStyles/annotations";

/** What a drawn annotation mesh carries in its `metadata`. */
export interface AnnotationMeshMetadata {
    /** Which annotation the mesh draws, and where its geometry is. */
    readonly annotation: {
        readonly kind: GraphAnnotation["kind"];
        readonly text?: string;
        /** The drawn geometry's box in world units (not the padded plane's). */
        readonly box: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
    };
}

/** A box in file units, y up. */
interface Box {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

/** Canvas pixels per file unit, at most; fewer when that would pass the texture limit. */
const PX_PER_UNIT = 4;
const MAX_TEXTURE = 2048;
/** How far behind the graph's plane a background annotation sits, in world units. */
const BEHIND = 0.05;

let measureContext: CanvasRenderingContext2D | null = null;

/** Draws a graph's annotations and replaces them when the graph value changes. */
export class AnnotationMeshes {
    /** The scene drawn into. */
    readonly scene: Scene;
    private meshes: Mesh[] = [];
    private drawn: unknown = undefined;

    /**
     * Draw nothing yet.
     * @param scene - The scene to draw into.
     */
    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Draw the annotations a graph value holds, replacing the ones drawn before; nothing when the
     * value is the one already drawn.
     * @param value - The graph value.
     */
    update(value: unknown): void {
        if (value === this.drawn) {
            return;
        }

        this.drawn = value;
        this.clear();
        const read = drawnAnnotationsOf(value);
        if (read === null) {
            return;
        }

        for (const a of read.annotations) {
            const mesh = this.draw(a, read.scale);
            if (mesh !== null) {
                this.meshes.push(mesh);
            }
        }
    }

    /** Remove every drawn annotation. */
    dispose(): void {
        this.clear();
        this.drawn = undefined;
    }

    private clear(): void {
        for (const mesh of this.meshes) {
            mesh.material?.getActiveTextures().forEach((t) => {
                t.dispose();
            });
            mesh.material?.dispose();
            mesh.dispose();
        }

        this.meshes = [];
    }

    /**
     * One annotation as a textured plane.
     * @param a - The annotation.
     * @param scale - Scene units per file unit.
     * @returns The mesh, or null when it has no area.
     */
    private draw(a: GraphAnnotation, scale: number): Mesh | null {
        const geometry = boxOf(a);
        const pad = padOf(a);
        const plane: Box = {
            x0: geometry.x0 - pad,
            y0: geometry.y0 - pad,
            x1: geometry.x1 + pad,
            y1: geometry.y1 + pad,
        };
        const w = plane.x1 - plane.x0;
        const h = plane.y1 - plane.y0;
        if (!(w > 0 && h > 0)) {
            return null;
        }

        const k = Math.min(PX_PER_UNIT, MAX_TEXTURE / Math.max(w, h));
        const texture = new DynamicTexture(
            `annotation_${a.id}`,
            { width: Math.max(1, Math.ceil(w * k)), height: Math.max(1, Math.ceil(h * k)) },
            this.scene,
            true,
        );
        texture.hasAlpha = true;
        const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
        // file units, y up, to canvas pixels, y down
        ctx.setTransform(k, 0, 0, -k, -plane.x0 * k, plane.y1 * k);
        paint(ctx, a);
        texture.update();

        const material = new StandardMaterial(`annotation_${a.id}`, this.scene);
        material.diffuseTexture = texture;
        material.useAlphaFromDiffuseTexture = true;
        material.emissiveColor = new Color3(1, 1, 1);
        material.specularColor = new Color3(0, 0, 0);
        material.disableLighting = true;
        material.backFaceCulling = false;
        material.alphaMode = Engine.ALPHA_COMBINE;

        const mesh = MeshBuilder.CreatePlane(
            `annotation_${a.id}`,
            { width: w * scale, height: h * scale, sideOrientation: Mesh.DOUBLESIDE },
            this.scene,
        );
        mesh.material = material;
        mesh.isPickable = false;
        const background = a.layer === "background";
        mesh.position = new Vector3(((plane.x0 + plane.x1) / 2) * scale, ((plane.y0 + plane.y1) / 2) * scale, 0);
        // the camera looks along +z: behind the graph is +z
        mesh.position.z = background ? BEHIND : 0;
        // group 0 is the graph; group 1 is drawn after it with the depth buffer cleared, as on-top labels are
        mesh.renderingGroupId = background ? 0 : 1;
        mesh.alphaIndex = a.z;
        const metadata: AnnotationMeshMetadata = {
            annotation: {
                kind: a.kind,
                ...(a.kind === "text" ? { text: a.text } : {}),
                box: {
                    x0: geometry.x0 * scale,
                    y0: geometry.y0 * scale,
                    x1: geometry.x1 * scale,
                    y1: geometry.y1 * scale,
                },
            },
        };
        mesh.metadata = metadata;
        return mesh;
    }
}

/**
 * The box an annotation's own geometry covers, in file units, y up.
 * @param a - The annotation.
 * @returns The box.
 */
function boxOf(a: GraphAnnotation): Box {
    switch (a.kind) {
        case "shape":
            return {
                x0: a.center.x - a.width / 2,
                x1: a.center.x + a.width / 2,
                y0: a.center.y - a.height / 2,
                y1: a.center.y + a.height / 2,
            };
        case "text": {
            const width = measure(a);
            const x0 = a.anchor === "center" ? a.at.x - width / 2 : a.at.x;
            const y1 = a.anchor === "center" ? a.at.y + a.fontSize / 2 : a.at.y;
            return { x0, x1: x0 + width, y0: y1 - a.fontSize, y1 };
        }
        case "arrow":
            return {
                x0: Math.min(a.from.x, a.to.x),
                x1: Math.max(a.from.x, a.to.x),
                y0: Math.min(a.from.y, a.to.y),
                y1: Math.max(a.from.y, a.to.y),
            };
        default:
            return { x0: 0, x1: 0, y0: 0, y1: 0 };
    }
}

/**
 * The room drawn around an annotation's geometry: half an outline, an arrowhead.
 * @param a - The annotation.
 * @returns The padding in file units.
 */
function padOf(a: GraphAnnotation): number {
    switch (a.kind) {
        case "shape":
            return a.borderWidth / 2 + 1;
        case "arrow":
            return headLength(a, Math.max(a.sourceSize, a.targetSize)) + a.width;
        default:
            return 1;
    }
}

/**
 * The canvas font of a text annotation, in file units.
 * @param a - The text.
 * @returns The CSS font.
 */
function fontOf(a: TextAnnotation): string {
    return `${a.italic ? "italic " : ""}${a.bold ? "bold " : ""}${String(a.fontSize)}px ${a.fontFamily}, sans-serif`;
}

/**
 * A text annotation's width in file units.
 * @param a - The text.
 * @returns The width.
 */
function measure(a: TextAnnotation): number {
    measureContext ??= document.createElement("canvas").getContext("2d");
    if (measureContext === null) {
        return a.text.length * a.fontSize * 0.6;
    }

    measureContext.font = fontOf(a);
    return measureContext.measureText(a.text).width;
}

/**
 * An arrowhead's length in file units.
 * @param a - The arrow.
 * @param size - The head's size factor.
 * @returns The length.
 */
function headLength(a: ArrowAnnotation, size: number): number {
    return (8 + 2 * a.width) * size;
}

/**
 * Paint one annotation, in file units with y up (the context is transformed).
 * @param ctx - The canvas context.
 * @param a - The annotation.
 */
function paint(ctx: CanvasRenderingContext2D, a: GraphAnnotation): void {
    switch (a.kind) {
        case "shape":
            paintShape(ctx, a);
            break;
        case "text":
            paintText(ctx, a);
            break;
        case "arrow":
            paintArrow(ctx, a);
            break;
        default:
            break;
    }
}

/**
 * A shape annotation's outline as a path.
 * @param ctx - The canvas context.
 * @param a - The shape.
 */
function shapePath(ctx: CanvasRenderingContext2D, a: ShapeAnnotation): void {
    const { x, y } = a.center;
    const hw = a.width / 2;
    const hh = a.height / 2;
    ctx.beginPath();
    switch (a.shape) {
        case "ellipse":
            ctx.ellipse(x, y, hw, hh, 0, 0, 2 * Math.PI);
            break;
        case "round-rectangle":
            ctx.roundRect(x - hw, y - hh, a.width, a.height, Math.min(hw, hh) * 0.3);
            break;
        case "diamond":
            ctx.moveTo(x, y + hh);
            ctx.lineTo(x + hw, y);
            ctx.lineTo(x, y - hh);
            ctx.lineTo(x - hw, y);
            ctx.closePath();
            break;
        case "triangle":
            ctx.moveTo(x, y + hh);
            ctx.lineTo(x + hw, y - hh);
            ctx.lineTo(x - hw, y - hh);
            ctx.closePath();
            break;
        default:
            // ponytail: other outlines draw as their box; add the polygons when a file needs them
            ctx.rect(x - hw, y - hh, a.width, a.height);
    }
}

/**
 * Paint a shape annotation.
 * @param ctx - The canvas context.
 * @param a - The shape.
 */
function paintShape(ctx: CanvasRenderingContext2D, a: ShapeAnnotation): void {
    shapePath(ctx, a);
    if (a.fill !== null && a.fillOpacity > 0) {
        ctx.globalAlpha = a.fillOpacity;
        ctx.fillStyle = a.fill;
        ctx.fill();
    }

    if (a.borderWidth > 0 && a.borderOpacity > 0) {
        ctx.globalAlpha = a.borderOpacity;
        ctx.strokeStyle = a.borderColor;
        ctx.lineWidth = a.borderWidth;
        ctx.stroke();
    }
}

/**
 * Paint a text annotation.
 * @param ctx - The canvas context.
 * @param a - The text.
 */
function paintText(ctx: CanvasRenderingContext2D, a: TextAnnotation): void {
    const box = boxOf(a);
    ctx.save();
    // text is drawn y down: flip back about its top-left corner
    ctx.translate(box.x0, box.y1);
    ctx.scale(1, -1);
    ctx.globalAlpha = a.opacity;
    ctx.fillStyle = a.color;
    ctx.font = fontOf(a);
    ctx.textBaseline = "top";
    ctx.fillText(a.text, 0, 0);
    ctx.restore();
}

/**
 * Paint an arrow annotation: its line, then its heads.
 * @param ctx - The canvas context.
 * @param a - The arrow.
 */
function paintArrow(ctx: CanvasRenderingContext2D, a: ArrowAnnotation): void {
    ctx.globalAlpha = a.opacity;
    ctx.strokeStyle = a.color;
    ctx.fillStyle = a.color;
    ctx.lineWidth = a.width;
    ctx.beginPath();
    ctx.moveTo(a.from.x, a.from.y);
    ctx.lineTo(a.to.x, a.to.y);
    ctx.stroke();
    paintHead(ctx, a, a.to, a.from, a.targetArrow, a.targetSize);
    paintHead(ctx, a, a.from, a.to, a.sourceArrow, a.sourceSize);
}

/**
 * Paint one arrowhead.
 * @param ctx - The canvas context.
 * @param a - The arrow.
 * @param tip - Where the head points.
 * @param tail - The other end of the line.
 * @param shape - The head's shape.
 * @param size - The head's size factor.
 */
function paintHead(
    ctx: CanvasRenderingContext2D,
    a: ArrowAnnotation,
    tip: AnnotationPoint,
    tail: AnnotationPoint,
    shape: ArrowAnnotation["targetArrow"],
    size: number,
): void {
    if (shape === "none") {
        return;
    }

    const len = headLength(a, size);
    const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x);
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(angle);
    ctx.beginPath();
    switch (shape) {
        case "circle":
        case "circle-open":
            ctx.arc(-len / 2, 0, len / 2, 0, 2 * Math.PI);
            break;
        case "tee":
            ctx.rect(-a.width, -len / 2, a.width, len);
            break;
        case "diamond":
        case "diamond-open":
            ctx.moveTo(0, 0);
            ctx.lineTo(-len / 2, len / 3);
            ctx.lineTo(-len, 0);
            ctx.lineTo(-len / 2, -len / 3);
            ctx.closePath();
            break;
        case "vee":
            ctx.moveTo(0, 0);
            ctx.lineTo(-len, len / 2);
            ctx.lineTo(-len * 0.7, 0);
            ctx.lineTo(-len, -len / 2);
            ctx.closePath();
            break;
        default:
            ctx.moveTo(0, 0);
            ctx.lineTo(-len, len / 2);
            ctx.lineTo(-len, -len / 2);
            ctx.closePath();
    }

    if (shape.endsWith("-open")) {
        ctx.stroke();
    } else {
        ctx.fill();
    }

    ctx.restore();
}

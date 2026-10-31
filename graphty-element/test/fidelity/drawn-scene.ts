/**
 * What graphty-element DREW, read off the Babylon.js scene graph behind a mounted element: mesh
 * bounding boxes projected through the active camera, the colors in the materials and the
 * per-instance color buffers, the effect layers that outline or glow a mesh, the label planes and
 * the edge line batches. Test code only: it reaches renderer internals (private fields of Node,
 * Edge, the line batches and Babylon's effect layers) that no consumer can, so nothing here is an
 * API. Each internal read is a candidate for a public "drawn" read-back; see
 * `DRAWN_API_CANDIDATES`.
 *
 * Every length is in render pixels (the canvas's drawing buffer; CSS pixels at a device pixel
 * ratio of 1). The comparer turns them into reference units with the one scale it fits on node
 * centers.
 */
import {
    AbstractMesh,
    type Camera,
    Color3,
    InstancedMesh,
    type Material,
    Mesh,
    type Scene,
    ShaderMaterial,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";

import type { NodeStyleConfig } from "../../src/config/NodeStyle";
import type { Edge, EdgeCapEnd } from "../../src/Edge";
import type { Graph } from "../../src/Graph";
import type { AnnotationMeshMetadata } from "../../src/meshes/AnnotationMeshes";
import type { ArrowCap, ArrowCapBatch } from "../../src/meshes/ArrowCapBatch";
import { JOIN_FLOATS_PER_PIECE } from "../../src/meshes/edgeJoinShader";
import type { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import type { NodeDecorationPiece } from "../../src/meshes/NodeDecorationMesh";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import { PatternedLineRenderer } from "../../src/meshes/PatternedLineRenderer";
import type { RichTextLabel, TextSegment } from "../../src/meshes/RichTextLabel";
import { pixelsPerUnit } from "../../src/meshes/screenSize";
import { piecesThickness, type WaveShape } from "../../src/meshes/shapeOutlines";
import type { Node } from "../../src/Node";
import { spansAlongCenters } from "./pattern-spans";

/**
 * Drawn values a third-party consumer cannot read through the public API today, so cannot check
 * the way this harness does. Candidates for a public read-back, not added here.
 */
export const DRAWN_API_CANDIDATES: readonly string[] = [
    "a node's drawn screen box (width and height), not one radius (nodeScreenPosition)",
    "a node's drawn fill color, its instance color multiplied into its material",
    "whether an outline or glow is drawn around a node, its color and its reach in pixels",
    "a node's drawn border ring: its color, its width in pixels and its line style",
    "a label's drawn font height in pixels, color, place relative to its node and whether the node hides it",
    "an edge's drawn kind (flat line, screen-space line, curve, pattern), thickness in pixels and path",
    "the arrowheads drawn at each end of an edge and their size in pixels",
    "drawing order (view depth) of nodes",
];

/** A box on screen in render pixels, y down, with its nearest and farthest view depth. */
export interface ScreenBox {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    near: number;
    far: number;
}

/** The end cap at the other end of its line. */
const OTHER_END: Readonly<Record<string, "arrowHead" | "arrowTail">> = {
    arrowHead: "arrowTail",
    arrowTail: "arrowHead",
};

/** The cap that points the other way along its line, for a cap read at the other end (`ArrowStyle.position`). */
const POINTS_BACK: Readonly<Record<string, string>> = {
    normal: "inverted",
    inverted: "normal",
    vee: "crow",
    crow: "vee",
};

/**
 * A cap's name with its type turned to the one pointing the other way along its line (`POINTS_BACK`).
 * @param name - the cap's name, its type within it
 * @returns the name
 */
function pointingBack(name: string): string {
    const type = Object.keys(POINTS_BACK).find((t) => name.includes(t));
    return type === undefined ? name : name.replace(type, POINTS_BACK[type]);
}

/** Projects world points to render pixels through the active camera. */
export class Projector {
    readonly width: number;
    readonly height: number;
    private readonly scene: Scene;
    private readonly camera: Camera;

    constructor(scene: Scene) {
        const camera = scene.activeCamera;
        if (camera === null) {
            throw new Error("the scene has no active camera");
        }
        this.scene = scene;
        this.camera = camera;
        this.width = scene.getEngine().getRenderWidth();
        this.height = scene.getEngine().getRenderHeight();
    }

    /**
     * A world point on screen.
     * @param p - the point
     * @returns render pixels, the view depth (larger is farther) and the clip w
     */
    point(p: Vector3): { x: number; y: number; depth: number; w: number } {
        const view = this.scene.getViewMatrix();
        const vp = view.multiply(this.scene.getProjectionMatrix());
        const { m } = vp;
        const w = p.x * m[3] + p.y * m[7] + p.z * m[11] + m[15];
        const clip = Vector3.TransformCoordinates(p, vp);
        const v = view.m;
        return {
            x: (clip.x + 1) * 0.5 * this.width,
            y: (1 - clip.y) * 0.5 * this.height,
            depth: p.x * v[2] + p.y * v[6] + p.z * v[10] + v[14],
            w,
        };
    }

    /**
     * A mesh's world bounding box (its eight local corners through its world matrix) on screen.
     * @param mesh - the mesh
     * @returns the screen box
     */
    box(mesh: AbstractMesh): ScreenBox {
        const world = mesh.computeWorldMatrix(true);
        const { minimum: a, maximum: b } = mesh.getBoundingInfo().boundingBox;
        const out: ScreenBox = {
            x0: Infinity,
            y0: Infinity,
            x1: -Infinity,
            y1: -Infinity,
            near: Infinity,
            far: -Infinity,
        };
        for (const x of [a.x, b.x]) {
            for (const y of [a.y, b.y]) {
                for (const z of [a.z, b.z]) {
                    const s = this.point(Vector3.TransformCoordinates(new Vector3(x, y, z), world));
                    out.x0 = Math.min(out.x0, s.x);
                    out.x1 = Math.max(out.x1, s.x);
                    out.y0 = Math.min(out.y0, s.y);
                    out.y1 = Math.max(out.y1, s.y);
                    out.near = Math.min(out.near, s.depth);
                    out.far = Math.max(out.far, s.depth);
                }
            }
        }
        return out;
    }

    /**
     * Pixels per world unit at a point, across the screen: one unit along the camera's up axis.
     * @param at - the world point
     * @returns pixels
     */
    pxPerWorld(at: Vector3): number {
        const up = this.camera.getDirection(Vector3.Up());
        const a = this.point(at);
        const b = this.point(at.add(up));
        return Math.hypot(b.x - a.x, b.y - a.y);
    }
}

const hex = (c: { r: number; g: number; b: number }): string =>
    `#${[c.r, c.g, c.b]
        .map((v) =>
            Math.round(Math.min(1, Math.max(0, v)) * 255)
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;

let colorContext: CanvasRenderingContext2D | null = null;

/**
 * A CSS color as the browser parses it, as `#rrggbb` and an alpha.
 * @param css - any CSS color
 * @returns the color and alpha
 */
export function cssColor(css: string): { hex: string; alpha: number } {
    colorContext ??= document.createElement("canvas").getContext("2d");
    if (colorContext === null) {
        return { hex: "#000000", alpha: 1 };
    }
    colorContext.fillStyle = "#000000";
    colorContext.fillStyle = css;
    const v = colorContext.fillStyle;
    if (v.startsWith("#")) {
        return { hex: v.toLowerCase(), alpha: 1 };
    }
    const m = /rgba?\(([^)]+)\)/.exec(v);
    const [r, g, b, a] = (m?.[1] ?? "0,0,0,1").split(",").map(Number);
    return { hex: hex({ r: r / 255, g: g / 255, b: b / 255 }), alpha: Number.isFinite(a) ? a : 1 };
}

/** The renderer's own internals this reader takes, typed for test code. */
interface EdgeInternals {
    lineBatch: EdgeLineBatch | null;
    lineSlots: number[];
    outlineBatch: EdgeLineBatch | null;
    outlineSlots: number[];
    haloBands: { kind: "underlay" | "overlay"; batch: EdgeLineBatch; slots: number[] }[];
    lineIsCurve: boolean;
    drawnStyle: {
        line?: { bezier?: boolean; gradient?: { kind?: string } };
        arrowHead?: { gap?: number; position?: number };
        arrowTail?: { gap?: number; position?: number };
    } | null;
}
interface PatternInternals {
    width: number;
    color: string;
    opacity: number;
    wave: WaveShape | undefined;
}
interface NodeInternals {
    border: AbstractMesh | null;
    outerBorder: AbstractMesh | null;
    drawnStyle: NodeStyleConfig | null;
    decorationPieces: readonly NodeDecorationPiece[];
    tableTexts: readonly unknown[] | null;
}

/**
 * The label of a node that draws it as a table (`shape.labelTable`), whose words are drawn in its cells, the last of
 * its further texts, as Graphviz's scene records them: the cells' words in order, one line each, in a box round them
 * all, in the first cell's font and color.
 * @param node - the node
 * @param p - the projector
 * @returns the label, or null for a node whose label is not a table
 */
function readTableLabel(node: Node, p: Projector): DrawnLabel | null {
    const count = (node as unknown as NodeInternals).tableTexts?.length ?? 0;
    const cells = count === 0 ? [] : node.shapeTextLabels.slice(-count).flatMap((l) => readLabel(l, p) ?? []);
    const [first] = cells;
    if (first === undefined) {
        return null;
    }
    const edge = (key: keyof ScreenBox, pick: (...v: number[]) => number): number => pick(...cells.map((c) => c.box[key]));
    return {
        ...first,
        text: cells.map((c) => c.text).join("\n"),
        box: {
            x0: edge("x0", Math.min),
            y0: edge("y0", Math.min),
            x1: edge("x1", Math.max),
            y1: edge("y1", Math.max),
            near: edge("near", Math.min),
            far: edge("far", Math.max),
        },
        textBox: null,
        lineCount: cells.reduce((sum, c) => sum + c.lineCount, 0),
        background: null,
    };
}

/**
 * What a node draws over its face (its pie slices, stripes and image), each piece's screen box.
 * @param node - the node
 * @param p - the projector
 * @returns the pieces
 */
function readPieces(node: Node, p: Projector): { kind: "shape" | "image" | "body"; box: ScreenBox }[] {
    const pieces = (node as unknown as NodeInternals).decorationPieces;
    if (pieces.length === 0 || !node.mesh.isEnabled()) {
        return [];
    }
    const world = node.mesh.computeWorldMatrix(true);
    const z = 0;
    return pieces.map((piece) => {
        const { x0, y0, x1, y1 } = piece.box;
        const corners = [
            [x0, y0],
            [x1, y0],
            [x0, y1],
            [x1, y1],
        ].map(([x, y]) => p.point(Vector3.TransformCoordinates(new Vector3(x, y, z), world)));
        return {
            kind: piece.kind,
            box: {
                x0: Math.min(...corners.map((c) => c.x)),
                x1: Math.max(...corners.map((c) => c.x)),
                y0: Math.min(...corners.map((c) => c.y)),
                y1: Math.max(...corners.map((c) => c.y)),
                near: Math.min(...corners.map((c) => c.depth)),
                far: Math.max(...corners.map((c) => c.depth)),
            },
        };
    });
}
interface LabelInternals {
    actualDimensions: { width: number; height: number };
    /** The area inside the borders (the background), in label units. */
    contentArea: { x: number; y: number; width: number; height: number };
    /** The words' own extent, in label units. */
    textSize: { width: number; height: number };
    options: {
        textAlign?: string;
        marginLeft?: number;
        marginTop?: number;
        backgroundPadding?: number;
        backgroundColor?: unknown;
        cornerRadius?: number;
        borders?: { width: number; color?: string }[];
        textOutline?: boolean;
        textOutlineColor?: string;
        textOutlineWidth?: number;
    };
}
interface BlurInternals {
    _kernel?: number;
}
interface EffectLayerInternals {
    _thinEffectLayer?: EffectLayerInternals;
    _options?: { mainTextureRatio?: number; blurTextureSizeRatio?: number; blurHorizontalSize?: number };
    _horizontalBlurPostprocess?: BlurInternals;
    _horizontalBlurPostprocess2?: BlurInternals;
    _meshes?: Record<number, { color?: Color3 } | undefined>;
    innerGlow?: boolean;
    hasMesh?: (mesh: AbstractMesh) => boolean;
    blurKernelSize?: number;
}

/** A layer drawn around (and, with an inner glow, over the rim of) the meshes it includes. */
interface Ring {
    kind: "outline" | "glow";
    /** How far the blurred stroke reaches from the mesh's edge, in render pixels. */
    reachPx: number;
    /** Whether it also draws inward over the mesh's rim (the highlight layer's inner glow). */
    inner: boolean;
    color: (source: AbstractMesh) => string | null;
    has: (source: AbstractMesh) => boolean;
}

/**
 * Babylon's best blur kernel for a requested size (ThinBlurPostProcess._nearestBestKernel), used
 * when the post-process's own chosen kernel cannot be read.
 * @param ideal - the requested kernel
 * @returns the kernel in texels
 */
function nearestBestKernel(ideal: number): number {
    const v = Math.round(ideal);
    for (const k of [v, v - 1, v + 1, v - 2, v + 2]) {
        if (k % 2 !== 0 && Math.floor(k / 2) % 2 === 0 && k > 0) {
            return Math.max(k, 3);
        }
    }
    return Math.max(v, 3);
}

/**
 * The outline (highlight layer) and glow (glow layer) the scene draws, with their reach in render
 * pixels: half the blur kernel, in texels of the blur texture, times how many render pixels one
 * of its texels covers. The highlight layer's stroke shows wherever the blurred mask is above
 * zero, so the reach is the drawn stroke width; the glow layer's widest blur is its half-size
 * second pass.
 * @param scene - the scene
 * @param width - the render width
 * @returns the rings
 */
function ringsOf(scene: Scene, width: number): Ring[] {
    const meta = (scene.metadata ?? {}) as {
        highlightLayer?: EffectLayerInternals;
        glowLayer?: EffectLayerInternals;
        glowColors?: Map<number, Color3>;
    };
    const rings: Ring[] = [];
    const hl = meta.highlightLayer;
    if (hl && scene.effectLayers.includes(hl as never)) {
        const thin = hl._thinEffectLayer ?? hl;
        const o = thin._options ?? {};
        const kernel = thin._horizontalBlurPostprocess?._kernel ?? nearestBestKernel((o.blurHorizontalSize ?? 1) / 2);
        const texel = 1 / ((o.mainTextureRatio ?? 0.5) * (o.blurTextureSizeRatio ?? 0.5));
        rings.push({
            kind: "outline",
            reachPx: ((kernel - 1) / 2) * texel,
            inner: hl.innerGlow !== false,
            has: (m) => hl.hasMesh?.(m) === true,
            color: (m) => {
                const c = thin._meshes?.[m.uniqueId]?.color;
                return c ? hex(c) : null;
            },
        });
    }
    const glow = meta.glowLayer;
    if (glow && scene.effectLayers.includes(glow as never)) {
        const thin = glow._thinEffectLayer ?? glow;
        const o = thin._options ?? {};
        const kernel = thin._horizontalBlurPostprocess2?._kernel ?? nearestBestKernel(glow.blurKernelSize ?? 32);
        const mainWidth = width * (o.mainTextureRatio ?? 0.5);
        const texel = width / Math.max(1, Math.floor(mainWidth / 2));
        rings.push({
            kind: "glow",
            reachPx: ((kernel - 1) / 2) * texel,
            inner: true,
            has: (m) => glow.hasMesh?.(m) === true,
            color: (m) => {
                const c = meta.glowColors?.get(m.uniqueId);
                return c ? hex(c) : null;
            },
        });
    }
    return rings;
}

/**
 * The color a material draws: its emissive color when lighting is off (every 2D mesh), else its
 * diffuse; for a shader material, its `color` vector. Alpha is the material's own.
 * @param material - the material
 * @returns the color, or null when it carries none this reader knows
 */
function materialColor(material: Material | null): { rgb: Color3; alpha: number; texture: boolean } | null {
    if (material instanceof StandardMaterial) {
        return {
            rgb: material.disableLighting ? material.emissiveColor : material.diffuseColor,
            alpha: material.alpha,
            texture: material.diffuseTexture !== null || material.emissiveTexture !== null,
        };
    }
    if (material instanceof ShaderMaterial) {
        const v = (material as unknown as { _vectors3?: Record<string, Vector3> })._vectors3?.color;
        const opacity = (material as unknown as { _floats?: Record<string, number> })._floats?.opacity ?? 1;
        return v ? { rgb: new Color3(v.x, v.y, v.z), alpha: material.alpha * opacity, texture: false } : null;
    }
    return null;
}

const runsText = (runs: readonly (readonly TextSegment[])[]): string =>
    runs.map((line) => line.map((run) => run.text).join("")).join("\n");

/** What a label drew. */
export interface DrawnLabel {
    text: string;
    box: ScreenBox;
    fontPx: number;
    color: string;
    enabled: boolean;
    /** Drawn in a later rendering group, over everything in the graph (depth cleared). */
    onTop: boolean;
    /** The first run's font family, CSS weight (400 normal, 700 bold) and style. */
    family: string;
    weight: number;
    style: string;
    /** Degrees, clockwise on screen, of the label plane's x axis. */
    rotation: number;
    /** The words' own box on screen (the plane less its margins, padding and borders), or null when not read. */
    textBox: { x0: number; y0: number; x1: number; y1: number } | null;
    /** The words' opacity: their color's alpha times the plane's. */
    opacity: number;
    /**
     * A label shown only while its node is drawn at least `min` px across (`minNodeScreenSize`, sigma's
     * labelRenderedSizeThreshold): the node's size across on screen now, and whether that rule alone hides it.
     */
    nodeSizeRule?: { acrossPx: number; min: number; hidden: boolean };
    /** How many lines the words are drawn on. */
    lineCount: number;
    /** How the lines are aligned. */
    align: "start" | "middle" | "end";
    /** The outline stroked round the letters, its width outside them on screen, or null. */
    outline: { color: string; opacity: number; width: number } | null;
    /** The box drawn behind the words, or null when none shows. */
    background: {
        box: { x0: number; y0: number; x1: number; y1: number };
        color: string | null;
        opacity: number;
        rounded: boolean;
        border: { color: string; opacity: number; width: number } | null;
    } | null;
}

/**
 * A CSS font weight as a number.
 * @param weight - "normal", "bold", "600", ...
 * @returns the numeric weight
 */
export function cssWeight(weight: string | undefined): number {
    if (weight === undefined || weight === "normal") {
        return 400;
    }
    if (weight === "bold") {
        return 700;
    }
    if (weight === "bolder") {
        return 900;
    }
    if (weight === "lighter") {
        return 300;
    }
    const n = Number(weight);
    return Number.isFinite(n) ? n : 400;
}

/**
 * A label's node-size rule as drawn (`RichTextLabel.tooSmall`'s second half): its node's size across on screen, the
 * least that shows the label, and whether the rule alone hides it now (the mesh otherwise shown).
 * @param label - the label
 * @returns `{ nodeSizeRule }`, or nothing for a label under no such rule
 */
function nodeSizeRuleOf(label: RichTextLabel): Pick<DrawnLabel, "nodeSizeRule"> {
    const { minNodeScreenSize: min, attachTo } = (
        label as unknown as { options: { minNodeScreenSize?: number; attachTo?: unknown } }
    ).options;
    const mesh = label.labelMesh;
    const camera = mesh?.getScene().activeCamera;
    if (min === undefined || min <= 0 || !(attachTo instanceof AbstractMesh) || !mesh || !camera) {
        return {};
    }
    const { extendSizeWorld, centerWorld } = attachTo.getBoundingInfo().boundingBox;
    const acrossPx = 2 * Math.min(extendSizeWorld.x, extendSizeWorld.y) * pixelsPerUnit(camera, centerWorld);
    const hidden = acrossPx < min && mesh.isEnabled() && mesh.isVisible && mesh.visibility === 0;
    return { nodeSizeRule: { acrossPx, min, hidden } };
}

/**
 * A label as drawn: its words, its plane on screen, the font height in pixels (the run's font
 * size in texture pixels times screen pixels per texture pixel of the plane) and its color.
 * @param label - the label
 * @param p - the projector
 * @returns the drawn label, or null when it has no mesh
 */
export function readLabel(label: RichTextLabel | null | undefined, p: Projector): DrawnLabel | null {
    const mesh = label?.labelMesh;
    if (!label || !mesh || mesh.isDisposed()) {
        return null;
    }
    const box = p.box(mesh);
    const textureHeight = (label as unknown as LabelInternals).actualDimensions.height;
    const run = label.textRuns[0]?.[0];
    const material = materialColor(mesh.material);
    const world = mesh.computeWorldMatrix(true);
    const o = p.point(Vector3.TransformCoordinates(Vector3.Zero(), world));
    const x = p.point(Vector3.TransformCoordinates(new Vector3(1, 0, 0), world));
    // the plane's own height on screen, along its y axis: a turned label's box is taller than its letters
    const half = mesh.getBoundingInfo().boundingBox.extendSize.y;
    const top = p.point(Vector3.TransformCoordinates(new Vector3(0, half, 0), world));
    const bottom = p.point(Vector3.TransformCoordinates(new Vector3(0, -half, 0), world));
    const planePx = Math.hypot(top.x - bottom.x, top.y - bottom.y);
    const fontPx = run && textureHeight > 0 ? (run.style.size * planePx) / textureHeight : 0;
    const inner = label as unknown as LabelInternals;
    const dims = inner.actualDimensions;
    const opt = inner.options;
    // a rectangle in label units (x right, y down from the plane's top left) on screen, through the plane's matrix
    const ext = mesh.getBoundingInfo().boundingBox.extendSize;
    const onScreen = (
        x: number,
        y: number,
        w: number,
        h: number,
    ): { x0: number; y0: number; x1: number; y1: number } => {
        const pts = [
            [x, y],
            [x + w, y],
            [x, y + h],
            [x + w, y + h],
        ].map(([u, v]) =>
            p.point(
                Vector3.TransformCoordinates(
                    new Vector3((u / dims.width - 0.5) * 2 * ext.x, (0.5 - v / dims.height) * 2 * ext.y, 0),
                    world,
                ),
            ),
        );
        return {
            x0: Math.min(...pts.map((q) => q.x)),
            y0: Math.min(...pts.map((q) => q.y)),
            x1: Math.max(...pts.map((q) => q.x)),
            y1: Math.max(...pts.map((q) => q.y)),
        };
    };
    const known = dims.width > 0 && dims.height > 0 && inner.contentArea !== undefined && inner.textSize !== undefined;
    const pad = opt.backgroundPadding ?? 0;
    const textBox = known
        ? onScreen(
              inner.contentArea.x + (opt.marginLeft ?? 0) + pad,
              inner.contentArea.y + (opt.marginTop ?? 0) + pad,
              inner.textSize.width,
              inner.textSize.height,
          )
        : null;
    // screen pixels per label unit, along the plane's height
    const unitPx = dims.height > 0 ? planePx / dims.height : 0;
    const textColor = cssColor(run?.style.color ?? "#000000");
    const planeAlpha = (material?.alpha ?? 1) * mesh.visibility;
    const bgCss = typeof opt.backgroundColor === "string" ? cssColor(opt.backgroundColor) : null;
    const border = (opt.borders ?? []).find((b) => b.width > 0);
    const borderCss = border === undefined ? null : cssColor(border.color ?? "#000000");
    const outlineCss = opt.textOutline === true ? cssColor(opt.textOutlineColor ?? "#000000") : null;
    const lineCount = label.textRuns.filter((line) => line.some((r) => r.text.trim() !== "")).length;
    const align = ({ left: "start", right: "end" } as const)[opt.textAlign as "left" | "right"] ?? "middle";
    return {
        text: runsText(label.textRuns),
        box,
        fontPx,
        color: cssColor(run?.style.color ?? "#000000").hex,
        enabled: mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0 && (material === null || material.alpha > 0),
        onTop: mesh.renderingGroupId > 0,
        family: run?.style.font ?? "",
        weight: cssWeight(run?.style.weight),
        style: run?.style.style ?? "normal",
        rotation: (Math.atan2(x.y - o.y, x.x - o.x) * 180) / Math.PI,
        textBox,
        opacity: textColor.alpha * planeAlpha,
        ...nodeSizeRuleOf(label),
        lineCount,
        align,
        outline:
            outlineCss === null || outlineCss.alpha <= 0 || !((opt.textOutlineWidth ?? 0) > 0)
                ? null
                : {
                      color: outlineCss.hex,
                      opacity: outlineCss.alpha * planeAlpha,
                      width: (opt.textOutlineWidth ?? 0) * unitPx,
                  },
        background:
            !known || ((bgCss === null || bgCss.alpha <= 0) && borderCss === null)
                ? null
                : {
                      box: onScreen(0, 0, dims.width, dims.height),
                      color: bgCss !== null && bgCss.alpha > 0 ? bgCss.hex : null,
                      opacity: (bgCss?.alpha ?? 0) * planeAlpha,
                      rounded: (opt.cornerRadius ?? 0) > 0,
                      border:
                          border === undefined || borderCss === null
                              ? null
                              : {
                                    color: borderCss.hex,
                                    opacity: borderCss.alpha * planeAlpha,
                                    width: border.width * unitPx,
                                },
                  },
    };
}

/** What a node drew. */
export interface DrawnNode {
    x: number;
    y: number;
    box: ScreenBox;
    meshName: string;
    /** The shape the mesh was built as (the node's own record of it). */
    shapeType: string | undefined;
    /** A polygon's corners as it was built (`shape.points`), else undefined. */
    polygon: string | undefined;
    /** The fill color as drawn (material times instance color), before any precedence rule. */
    fillDrawn: string | null;
    fillOpacity: number;
    /** The fill is a texture (a gradient ramp), not one flat color. */
    gradient: boolean;
    /**
     * The ramp the texture is painted with, as the node's style asked its renderer for it (NodeMesh paints its stops
     * evenly, a linear one along `direction` degrees on the upright texture, clockwise from +x on screen), or null.
     */
    ramp: { kind: "linear" | "radial"; colors: string[]; direction: number | null; stops?: number[] } | null;
    instanceColor: boolean;
    visible: boolean;
    /**
     * Whether the node is drawn at all, its fill aside: an unfilled group region (fill opacity 0)
     * still draws its outline and its label.
     */
    shown: boolean;
    ring: { kind: Ring["kind"]; color: string | null; reachPx: number; inner: boolean } | null;
    /** How far the node's border position drew its fill in from its size, per side, in screen pixels. */
    insetPx: number;
    /** The border ring drawn outside the fill, or null when the node has none. */
    border: DrawnBorder | null;
    /**
     * Where the node also draws an outer ring (`outer`), its own border ring at the fill, else null: `border` and the
     * box are then the outer ring's.
     */
    innerBorder?: DrawnBorder | null;
    /** The outer ring (Cytoscape.js's outline) and how far its inner edge is out from the fill, or null for none. */
    outer?: { border: DrawnBorder; gapPx: number; ringsPx?: number } | null;
    /** What the node draws over its face: its pie slices, stripes and image, each piece's screen box. */
    pieces: { kind: "shape" | "image"; box: ScreenBox }[];
    /** The image a node with no body draws as itself (vis-network's image nodes), its screen box; absent for none. */
    picture?: ScreenBox;
    label: DrawnLabel | null;
    /**
     * The label of a node that draws it as a table (`shape.labelTable`), read off the table's cells, or null for
     * none; the cells are also among its `texts`.
     */
    tableLabel?: DrawnLabel | null;
    /** The further texts it draws over its face (`shape.texts`). */
    texts?: DrawnLabel[];
    /**
     * A node with no body (shape "none") that asks for no image: it draws only its label and its glyph, as a program
     * draws a text-only or an icon-only node (vis-network's `text` and `icon` shapes).
     */
    faceless?: boolean;
    /** The character or short text the node draws over its face, and its color, or null for none. */
    glyph?: { text: string; color: string | null } | null;
}

/** A node's border ring as drawn. */
export interface DrawnBorder {
    color: string | null;
    /** How far the ring reaches past the node's outline, in render pixels. */
    widthPx: number;
    /**
     * A zigzag or sine wave with a swing of its own: how thick its waving line is, in render pixels (as an outline
     * painted as a fill is read); null for any other border.
     */
    lineWidthPx?: number | null;
    /** The line style the ring was built in (the node's own record of it). */
    style: string;
    /** Whether its width is in screen pixels at every zoom (`border.screenWidth`), not a length. */
    screen: boolean;
    /** The opacity it is drawn at: its material's alpha times the ring's visibility. */
    opacity: number;
}

/**
 * A node's border ring: its material's color, and its width as the node's border reach on screen.
 * @param node - the node
 * @param p - the projector
 * @returns the drawn border, or null when none is drawn
 */
function readBorder(node: Node, p: Projector): DrawnBorder | null {
    const { border, drawnStyle } = node as unknown as NodeInternals;
    if (border === null || border.isDisposed() || !border.isEnabled() || !border.isVisible) {
        return null;
    }
    // How far the ring reaches past the outline, in screen pixels: the node's own border reach, measured along the
    // screen. Not the ring's box against the fill's: a pointed outline's mitred corners push its box out further
    // than its width (a triangle's apex by twice the width).
    const at = node.mesh.getAbsolutePosition();
    const o = p.point(at);
    const x = p.point(at.add(new Vector3(node.borderReach, 0, 0)));
    const widthPx = Math.hypot(x.x - o.x, x.y - o.y);
    const source = border instanceof InstancedMesh ? border.sourceMesh : border;
    // a zigzag or sine wave with a swing of its own is a line its width thick waving round the node: as thick as the
    // ring it drew, read as an outline drawn as a fill is (twice its area over its edges)
    const waved =
        NodeMesh.waveOf(drawnStyle?.border, 1) !== undefined &&
        (drawnStyle?.border?.style === "zigzag" || drawnStyle?.border?.style === "sinewave");
    const material = materialColor(source.material);
    return {
        color: material ? hex(material.rgb) : null,
        widthPx: Math.max(0, widthPx),
        lineWidthPx: waved ? frontThickness(source) * Math.abs(border.absoluteScaling.x) * p.pxPerWorld(at) : null,
        style: drawnStyle?.border?.style ?? "solid",
        screen: drawnStyle?.border?.screenWidth !== undefined,
        opacity: (material?.alpha ?? 1) * border.visibility,
    };
}

/**
 * How thick the line a slab's front face draws is: twice the face's area over the length of its outline (each piece's
 * edges that no other triangle of it shares), in the slab's own units.
 * @param mesh - a slab built by `ringSlab`
 * @returns the thickness, or 0
 */
function frontThickness(mesh: AbstractMesh): number {
    const positions = mesh.getVerticesData("position");
    const indices = mesh.getIndices();
    if (positions === null || indices === null || indices.length === 0) {
        return 0;
    }
    const at = (i: number): [number, number, number] => [positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]];
    let front = Infinity;
    for (let i = 2; i < positions.length; i += 3) {
        front = Math.min(front, positions[i]);
    }
    let area = 0;
    const edges = new Map<string, { length: number; uses: number }>();
    const key = (a: number[], b: number[]): string =>
        [a, b]
            .map((q) => `${q[0].toFixed(5)},${q[1].toFixed(5)}`)
            .sort()
            .join("|");
    for (let t = 0; t + 2 < indices.length; t += 3) {
        const tri = [at(indices[t]), at(indices[t + 1]), at(indices[t + 2])];
        if (tri.some((q) => Math.abs(q[2] - front) > 1e-9)) {
            continue;
        }
        const [a, b, c] = tri;
        area += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
        for (const [u, v] of [
            [a, b],
            [b, c],
            [c, a],
        ]) {
            const k = key(u, v);
            const e = edges.get(k) ?? { length: Math.hypot(v[0] - u[0], v[1] - u[1]), uses: 0 };
            e.uses++;
            edges.set(k, e);
        }
    }
    const outline = [...edges.values()].filter((e) => e.uses === 1).reduce((sum, e) => sum + e.length, 0);
    return outline > 0 ? (2 * area) / outline : 0;
}

/**
 * A node's outer border ring (`outerBorder`): its color, width and style, how far the outermost ring's inner edge is
 * out from the node's fill, and how far out the rings inside it reach (`ringsPx`, 0 for one ring), in screen pixels;
 * null when none is drawn. A program reads every outline but the outermost as the node's own.
 * @param node - the node
 * @param p - the projector
 * @returns the ring and its gap, or null
 */
function readOuterBorder(node: Node, p: Projector): { border: DrawnBorder; gapPx: number; ringsPx: number } | null {
    const { outerBorder, drawnStyle } = node as unknown as NodeInternals;
    const style = drawnStyle?.outerBorder;
    if (outerBorder === null || outerBorder.isDisposed() || !outerBorder.isEnabled() || style === undefined) {
        return null;
    }
    const perSize = NodeMesh.extentPerSize(drawnStyle?.shape);
    const count = style.count ?? 1;
    const offset = Math.max(0, style.offset ?? 0);
    const width = style.width ?? 0;
    const at = node.mesh.getAbsolutePosition();
    const o = p.point(at);
    const px = (world: number): number => {
        const x = p.point(at.add(new Vector3(world, 0, 0)));
        return Math.hypot(x.x - o.x, x.y - o.y);
    };
    const source = outerBorder instanceof InstancedMesh ? outerBorder.sourceMesh : outerBorder;
    const material = materialColor(source.material);
    return {
        border: {
            color: material ? hex(material.rgb) : null,
            widthPx: px((style.width ?? 0) * perSize),
            style: style.style ?? "solid",
            screen: false,
            opacity: (material?.alpha ?? 1) * outerBorder.visibility,
        },
        // out to the outermost ring's inner edge (`count` rings, each the offset beyond the one before)
        gapPx: px(node.borderReach + (offset * count + width * (count - 1)) * perSize),
        ringsPx: px((offset + width) * (count - 1) * perSize),
    };
}

/**
 * How far a node's border position drew its fill in from its size, in screen pixels, whether or not the border
 * itself is shown (`NodeMesh.borderFit`): nothing for a border outside the size, half the ring for one centered on
 * it, the ring for one inside it, half the ring for one inside it at opacity 0.
 * @param node - the node
 * @param p - the projector
 * @returns the inset on each side
 */
function readInset(node: Node, p: Projector): number {
    const { drawnStyle } = node as unknown as NodeInternals;
    const border = drawnStyle?.border;
    const shape = drawnStyle?.shape;
    const { inset } = NodeMesh.borderFit(
        shape,
        border,
        NodeMesh.extentsOf(shape ?? {}, Math.max(shape?.size ?? node.size, 1e-3)),
    );
    if (inset <= 0) {
        return 0;
    }
    const at = node.mesh.getAbsolutePosition();
    const o = p.point(at);
    const x = p.point(at.add(new Vector3(inset, 0, 0)));
    return Math.hypot(x.x - o.x, x.y - o.y);
}

/**
 * The gradient a node's style fills it with: its kind, its colors as `#rrggbb` and a linear one's direction.
 * @param node - the node
 * @returns the ramp, or null when the node's style holds no gradient
 */
function rampOf(node: Node): DrawnNode["ramp"] {
    const color = (node as unknown as NodeInternals).drawnStyle?.texture?.color as
        { colorType?: string; colors?: unknown[]; direction?: unknown; stops?: unknown[] } | undefined;
    if (color?.colorType !== "gradient" && color?.colorType !== "radial-gradient") {
        return null;
    }
    const colors = (color.colors ?? []).flatMap((c) => (typeof c === "string" ? [c.toLowerCase()] : []));
    return colors.length === 0
        ? null
        : {
              kind: color.colorType === "gradient" ? "linear" : "radial",
              colors,
              direction: color.colorType === "gradient" && typeof color.direction === "number" ? color.direction : null,
              ...(color.stops?.length === colors.length && color.stops.every((t) => typeof t === "number")
                  ? { stops: color.stops }
                  : {}),
          };
}

/**
 * Reads one node off the scene graph.
 * @param node - the node
 * @param p - the projector
 * @param rings - the scene's outline and glow layers
 * @returns the drawn node
 */
export function readNode(node: Node, p: Projector, rings: readonly Ring[]): DrawnNode {
    const { mesh } = node;
    const source: AbstractMesh = mesh instanceof InstancedMesh ? mesh.sourceMesh : mesh;
    const box = p.box(mesh);
    const center = p.point(mesh.getAbsolutePosition());
    const base = materialColor(source.material);
    const buffer =
        (source as Mesh).instancedBuffers?.color !== undefined
            ? (mesh.instancedBuffers?.color as { r: number; g: number; b: number } | undefined)
            : undefined;
    // a node with no body (shape "none") is a mesh of no faces: its fill is drawn at opacity 0
    const faces = source instanceof Mesh ? source.getTotalIndices() > 0 : true;
    const rgb = base ? new Color3(base.rgb.r, base.rgb.g, base.rgb.b) : null;
    if (rgb && buffer) {
        rgb.multiplyInPlace(new Color3(buffer.r, buffer.g, buffer.b));
    }
    // A gradient is a ramp texture over a white material: its fill as drawn is where the ramp
    // starts, the color the oracle side reads as a gradient's `color` too.
    const ramp = base?.texture === true ? rampOf(node) : null;
    const ring = rings
        .filter((r) => r.has(source))
        .map((r) => ({ kind: r.kind, color: r.color(source), reachPx: r.reachPx, inner: r.inner }))
        .sort((a, b) => b.reachPx - a.reachPx)[0];
    const outer = readOuterBorder(node, p);
    const { drawnStyle } = node as unknown as NodeInternals;
    // a node with an outer border (Cytoscape.js's outline) shows that ring as its outline: the node is drawn out to
    // its inner edge, past the border and the gap, and the ring is its stroke
    const own = readBorder(node, p);
    const border = outer?.border ?? own;
    const grow = outer?.gapPx ?? 0;
    // A node whose fill is transparent (Graphviz's default, unfilled shape) still draws its outline.
    const shown = (mesh.isVisible && source.visibility > 0) || border !== null;
    const pieces = readPieces(node, p);
    // a node with no body draws nothing of its own but what is over its face: drawn as its image (vis-network's
    // image nodes)
    const picture = faces ? undefined : pieces.find((piece) => piece.kind === "image");
    // the further pieces of its body (`shape.parts`) are the node, as a program draws a glyph of several pieces
    const body = pieces.filter((piece) => piece.kind === "body").map((piece) => piece.box);
    const drawnOwn: ScreenBox = picture?.box ?? {
        ...box,
        x0: box.x0 - grow,
        y0: box.y0 - grow,
        x1: box.x1 + grow,
        y1: box.y1 + grow,
    };
    const drawnBox = [drawnOwn, ...body].reduce((a: ScreenBox, b: ScreenBox): ScreenBox => ({
        ...a,
        x0: Math.min(a.x0, b.x0),
        y0: Math.min(a.y0, b.y0),
        x1: Math.max(a.x1, b.x1),
        y1: Math.max(a.y1, b.y1),
    }));
    // a body drawn off its position (a glyph above its baseline, in pieces) is placed by its box, as a program's is
    const offCenter = body.length > 0 || drawnStyle?.shape?.stretchPoints === false;
    const placedBy = picture?.box ?? (offCenter ? drawnBox : null);
    return {
        x: placedBy === null ? center.x : (placedBy.x0 + placedBy.x1) / 2,
        y: placedBy === null ? center.y : (placedBy.y0 + placedBy.y1) / 2,
        box: drawnBox,
        meshName: source.name,
        shapeType: node.shapeType,
        polygon: (node as unknown as NodeInternals).drawnStyle?.shape?.points,
        fillDrawn: ramp?.colors[0] ?? (rgb ? hex(rgb) : null),
        fillOpacity: faces ? (base?.alpha ?? 1) * source.visibility : 0,
        gradient: base?.texture === true,
        ramp,
        instanceColor: buffer !== undefined,
        visible: node.getRenderState() === "visible" && mesh.isEnabled() && shown,
        shown: node.getRenderState() === "visible" && mesh.isEnabled(),
        ring: ring ?? null,
        insetPx: readInset(node, p),
        border,
        innerBorder: outer === null ? null : own,
        outer,
        label: readLabel(node.label, p),
        tableLabel: readTableLabel(node, p),
        // the further texts, and the external label beside the node (Graphviz's xlabel), each a text of the node
        texts: [...node.shapeTextLabels, ...(node.xlabelLabel === undefined ? [] : [node.xlabelLabel])].flatMap((l) => {
            const read = readLabel(l, p);
            return read === null ? [] : [read];
        }),
        // the image of a node with no body is the node itself
        ...(picture === undefined ? {} : { picture: picture.box }),
        pieces: pieces.filter(
            (piece): piece is { kind: "shape" | "image"; box: ScreenBox } => piece !== picture && piece.kind !== "body",
        ),
        // its only picture its glyph, where it asks for no image (an image node that drew none is still a node)
        faceless: drawnStyle?.shape?.type === "none" && (drawnStyle.image?.src ?? "") === "",
        glyph:
            typeof drawnStyle?.glyph?.text === "string" && drawnStyle.glyph.text !== ""
                ? {
                      text: drawnStyle.glyph.text,
                      color: drawnStyle.glyph.color === undefined ? null : cssColor(drawnStyle.glyph.color).hex,
                  }
                : null,
    };
}

/** What an edge drew. */
export interface DrawnEdge {
    kind: "line-2d" | "screen-line" | "curve" | "pattern" | "other";
    /** False when the session's visibility hides the edge (a file's hidden edge): its meshes are off. */
    shown: boolean;
    /** The path on screen, source end first. */
    points: [number, number][];
    thicknessPx: number;
    /** Its thickness is its line's screen floor (`line.minScreenWidth`): the same pixels on screen at every zoom. */
    screenFloored?: boolean;
    color: string | null;
    opacity: number;
    pattern: string | null;
    /**
     * A dashed or dotted line's elements as drawn, in screen pixels along the line: each element's length and the gap
     * after it, alternating, from the drawing's own geometry (a pattern element's outline, a joined line's element length
     * and spacing); null for a line drawn whole or a pattern whose pieces are not read.
     */
    dashPx: number[] | null;
    /**
     * The band drawn under the line (`line.outline`): its color, opacity, whole width in pixels and the pattern it is
     * drawn in (a joined line's "dash" or "dot"; absent, solid); null for none.
     */
    outline: { color: string; opacity: number; width: number; pattern?: string } | null;
    /** The band drawn over the line (`line.overlay`): its color, opacity and whole width in pixels; null for none. */
    overlay?: { color: string; opacity: number; width: number } | null;
    caps: {
        end: EdgeCapEnd;
        name: string;
        sizePx: number;
        /** A flat cap's drawn outline on screen (its geometry under its slot), or null for a billboard. */
        outline: [number, number][] | null;
        /** Its drawn color (its billboard slot's, or its batch's material), or null where none is read. */
        color: string | null;
        /** The opacity it is drawn at: 0 is a cap that draws nothing. */
        opacity: number;
        /** How far off its node an end cap stands, in its own lengths (`ArrowStyle.gap`), the line stopping at it. */
        gap?: number;
        /** Where along its line an end cap is drawn (`ArrowStyle.position`): 0 at its own end; absent for a middle cap. */
        position?: number;
    }[];
    label: DrawnLabel | null;
    /** The texts at its ends (`edge.arrowTailText`, `edge.arrowHeadText`), tail first. */
    endLabels: DrawnLabel[];
    /** The gradient its line is painted in: the color of each piece drawn, source end first, or null for none. */
    gradient: { kind: "linear" | "radial"; colors: readonly string[] } | null;
}

/**
 * A line mesh's thickness on screen. A flat 2D line is a rectangle `lineWidth` world units wide
 * (projected); a screen-space line's shader offsets each side by `width / 4` pixels over the clip
 * w (CustomLineRenderer's vertex shader), so it is `width / 2` pixels wide in all.
 * @param mesh - the batch mesh
 * @param at - a world point on the line
 * @param p - the projector
 * @returns pixels
 */
function lineThickness(mesh: Mesh, at: Vector3, p: Projector): number {
    const flat = (mesh.metadata as { lineWidth?: number } | null)?.lineWidth;
    mesh.computeWorldMatrix(true);
    const material = mesh.material as unknown as {
        _floats?: Record<string, number>;
        options?: { defines?: string[] };
    } | null;
    const min = screenFloorOf(mesh);
    if (typeof flat === "number") {
        return Math.max(flat * Math.abs(mesh.absoluteScaling.y) * p.pxPerWorld(at), min);
    }
    const width = material?._floats?.width;
    if (typeof width !== "number") {
        return 0;
    }
    // a line whose width is in world units (a joined line through bends drawn at the file's width), not pixels
    const world = material?.options?.defines?.includes("#define WORLD_WIDTH") === true;
    return Math.max(world ? width * p.pxPerWorld(at) : width / 2 / p.point(at).w, min);
}

/**
 * The fewest pixels a line mesh is drawn wide: its join shader never draws it under `minWidth` (`line.minScreenWidth`).
 * @param mesh - the batch mesh
 * @returns pixels, 0 for no floor
 */
function screenFloorOf(mesh: Mesh): number {
    return (mesh.material as unknown as { _floats?: Record<string, number> } | null)?._floats?.minWidth ?? 0;
}

/**
 * A flat arrow cap's geometry on screen: its batch mesh's vertices through its slot's matrix and
 * the mesh's world matrix. A billboarded cap is shaped by its shader, so it has none here.
 * @param cap - the cap
 * @param p - the projector
 * @returns the screen points, or null
 */
function capOutline(cap: ArrowCap | null, p: Projector): [number, number][] | null {
    const internals = cap as unknown as { batch: ArrowCapBatch | null; slot: number } | null;
    const batch = internals?.batch;
    if (cap === null || !batch || batch.billboarded || cap.isDisposed()) {
        return null;
    }
    const positions = batch.mesh.getVerticesData("position");
    if (positions === null) {
        return null;
    }
    const m = batch.matrixOf(internals.slot).multiply(batch.mesh.computeWorldMatrix(true));
    const out: [number, number][] = [];
    for (let i = 0; i + 2 < positions.length; i += 3) {
        const s = p.point(
            Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), m),
        );
        out.push([s.x, s.y]);
    }
    return out;
}

/**
 * A joined line's dashes or dots on screen: each element is `elementLength` long along the line and the elements sit
 * `spacing` apart centre to centre (the slot's spacing, `EdgeLineBatch`), so each gap is the spacing less the length.
 * @param batch - the line's batch
 * @param slots - the edge's slots in it
 * @param pattern - the batch's pattern, or undefined for a solid line
 * @param at - a world point on the line
 * @param p - the projector
 * @returns element and gap lengths in pixels, or null for a solid line
 */
function joinedDashes(
    batch: EdgeLineBatch,
    slots: readonly number[],
    pattern: { kind: string; elementLength?: number } | undefined,
    at: Vector3,
    p: Projector,
): number[] | null {
    const floats = (batch as unknown as { slots?: Float32Array }).slots;
    const length = pattern?.elementLength;
    if (pattern === undefined || length === undefined || floats === undefined || slots.length === 0) {
        return null;
    }
    const spacing = floats[slots[0] * JOIN_FLOATS_PER_PIECE + 13];
    if (!(spacing > 0)) {
        return null;
    }
    const k = p.pxPerWorld(at);
    return [length * k, Math.max(0, spacing - length) * k];
}

/**
 * A patterned line's elements on screen, from their own drawn outlines: each element's extent along the line and the
 * gap to the next one, alternating, the last element's followed by the median gap. A billboarded element has no
 * outline to read, and then nothing is read.
 * @param elements - the pattern's elements, in order along the line
 * @param p - the projector
 * @returns element and gap lengths in pixels, or null
 */
function elementDashes(elements: readonly ArrowCap[], p: Projector): number[] | null {
    const outlines = elements.map((el) => capOutline(el, p));
    if (outlines.length < 2 || outlines.some((o) => o === null || o.length === 0)) {
        return null;
    }
    const centers = elements.map((el) => {
        const s = p.point(el.position);
        return [s.x, s.y] as const;
    });
    // along the line as it was laid, its corners and curves too (issue #3102)
    const spans = spansAlongCenters(centers, outlines as [number, number][][]);
    if (spans === null) {
        return null;
    }
    const pairs = spans.slice(0, -1).flatMap(([t0, t1], i) => [t1 - t0, spans[i + 1][0] - t1]);
    // the last element too (a dash-dot of two elements is a dash and a dot), followed by the line's usual gap
    const gaps = pairs.filter((_, i) => i % 2 === 1).sort((x, y) => x - y);
    const [l0, l1] = spans[spans.length - 1];
    return [...pairs, l1 - l0, gaps[Math.floor(gaps.length / 2)]];
}

/**
 * The band drawn under an edge's line (`line.outline`), as drawn.
 * @param internal - the edge's internals
 * @param p - the projector
 * @returns its color, opacity and whole width in pixels, or null for none
 */
function readOutline(internal: EdgeInternals, p: Projector): DrawnEdge["outline"] {
    // the band drawn under the line: its outline, else its underlay (Cytoscape.js draws both as a wider stroke beneath)
    const underlay = internal.haloBands.find((band) => band.kind === "underlay");
    return internal.outlineBatch === null
        ? readBand(underlay?.batch ?? null, underlay?.slots ?? [], p)
        : readBand(internal.outlineBatch, internal.outlineSlots, p);
}

/**
 * The band drawn over an edge's line (`line.overlay`), as drawn.
 * @param internal - the edge's internals
 * @param p - the projector
 * @returns its color, opacity and whole width in pixels, or null for none
 */
function readOverlay(internal: EdgeInternals, p: Projector): DrawnEdge["overlay"] {
    const overlay = internal.haloBands.find((band) => band.kind === "overlay");
    return readBand(overlay?.batch ?? null, overlay?.slots ?? [], p);
}

/**
 * A band drawn along an edge's line, as drawn.
 * @param batch - the line batch it is drawn in, or null for none
 * @param slots - its slots in the batch
 * @param p - the projector
 * @returns its color, opacity, whole width in pixels and pattern, or null for none
 */
function readBand(batch: EdgeLineBatch | null, slots: readonly number[], p: Projector): DrawnEdge["outline"] {
    if (batch === null || batch.disposed || slots.length === 0 || !batch.mesh.isEnabled()) {
        return null;
    }
    const [a, b] = batch.endsOf(slots[0]);
    const mid = a.add(b).scale(0.5);
    const m = materialColor(batch.mesh.material);
    const meta = batch.mesh.metadata as {
        lineOpacity?: number;
        joinedLine?: boolean;
        pattern?: { kind: string };
    } | null;
    // a joined line's shader draws its own opacity and never reads the mesh's visibility (as `readEdge` reads it)
    const visibility = meta?.joinedLine === true ? 1 : batch.mesh.visibility;
    const pattern = meta?.pattern?.kind;
    return m === null
        ? null
        : {
              color: hex(m.rgb),
              opacity: (meta?.lineOpacity ?? m.alpha) * visibility,
              width: lineThickness(batch.mesh, mid, p),
              ...(pattern === undefined ? {} : { pattern }),
          };
}

/**
 * Reads one edge off the scene graph.
 * @param edge - the edge
 * @param p - the projector
 * @returns the drawn edge
 */
export function readEdge(edge: Edge, p: Projector): DrawnEdge {
    const internal = edge as unknown as EdgeInternals;
    const batch = internal.lineBatch;
    let world: Vector3[] = [];
    let kind: DrawnEdge["kind"] = "other";
    let thicknessPx = 0;
    let screenFloored = false;
    let color: string | null = null;
    let opacity = 1;
    let pattern: string | null = null;
    let dashPx: number[] | null = null;
    if (batch !== null) {
        const slots = internal.lineSlots;
        const flat = (batch.mesh.metadata as { is2DLine?: boolean } | null)?.is2DLine === true;
        const run = edge.drawnCurve;
        if (run !== null) {
            // a run of slots: a curve, straight segments through the line's bends, or a self-loop
            // or a fanned parallel edge, which are arcs whatever the style
            world = run;
            const straight = flat ? "line-2d" : "screen-line";
            kind = internal.drawnStyle?.line?.bezier === true || !internal.lineIsCurve ? "curve" : straight;
        } else {
            world = slots.length > 0 ? batch.endsOf(slots[0]) : [];
            kind = flat ? "line-2d" : "screen-line";
        }
        const mid = world[Math.floor(world.length / 2)] ?? Vector3.Zero();
        thicknessPx = lineThickness(batch.mesh, mid, p);
        screenFloored = thicknessPx > 0 && thicknessPx <= screenFloorOf(batch.mesh);
        const m = materialColor(batch.mesh.material);
        color = m ? hex(m.rgb) : null;
        // A flat line's style opacity, not its material's alpha: a sub-pixel line is drawn one pixel
        // wide with its alpha scaled by its width, the same ink as its own width at full opacity.
        const meta = batch.mesh.metadata as {
            lineOpacity?: number;
            joinedLine?: boolean;
            pattern?: { kind: string };
        } | null;
        // a dashed or dotted line through bends or round a loop is a joined line that draws its own pattern
        pattern = meta?.pattern?.kind ?? null;
        dashPx = joinedDashes(batch, slots, meta?.pattern, mid, p);
        const styled = meta?.lineOpacity;
        // A joined line's shader draws its own `opacity` and never reads the mesh's visibility, which
        // it sets only to be drawn in the transparent pass, so the visibility is not ink.
        const visibility = meta?.joinedLine === true ? 1 : batch.mesh.visibility;
        opacity = (styled ?? m?.alpha ?? 1) * visibility;
    } else if (edge.mesh instanceof PatternedLineMesh) {
        kind = "pattern";
        const pm = edge.mesh;
        const fields = pm as unknown as PatternInternals;
        ({ pattern } = pm);
        // a wave with a period of its own runs from end to end of what it drew, not from element to element
        // a dash or dot pattern's line runs from where it was laid to its end, as a stroke's dashes do, not from its
        // first element's middle to its last's: a wide dotted line's route started half a dot late, and one element
        // on a line too short for two had no route at all (`pajek-synth-lines` 12 -> 13, 2 -> 3)
        // and along the route it was laid on, its bends, curve or loop too (issue #3102)
        world = pm.drawnRoute() ?? pm.elements.map((el: ArrowCap) => el.position);
        const mid = world[Math.floor(world.length / 2)] ?? Vector3.Zero();
        // a wave with a swing of its own is a line `width` thick waving across its path: as thick as the band one
        // period of it draws, read as an outline drawn as a fill is (twice its area over its edges)
        const thick =
            fields.wave === undefined
                ? fields.width
                : piecesThickness([PatternedLineRenderer.wavePiece(pm.pattern, fields.width, fields.wave)]);
        thicknessPx = thick * p.pxPerWorld(mid);
        color = cssColor(fields.color).hex;
        ({ opacity } = fields);
        dashPx = elementDashes(pm.elements, p);
    }
    // An arrow is part of the edge as drawn: its tip, not the line it caps, is where the edge ends.
    // The line stops short of a tip by the arrow's length, which on a short edge between two ports
    // can turn it round; a route judged to the node center from there would not be the one drawn.
    // A cap drawn part-way along its line (`ArrowStyle.position`) is no end: the line runs on past it to its node.
    const tip = (cap: ArrowCap | null, position: number | undefined): Vector3 | null =>
        cap !== null && !cap.isDisposed() && cap.visibility > 0 && !((position ?? 0) > 0) ? cap.position.clone() : null;
    const tail = tip(edge.arrowTailCap, internal.drawnStyle?.arrowTail?.position);
    const head = tip(edge.arrowCap, internal.drawnStyle?.arrowHead?.position);
    if (world.length >= 2 && tail !== null) {
        world = [tail, ...world.slice(1)];
    }
    if (world.length >= 2 && head !== null) {
        world = [...world.slice(0, -1), head];
    }
    // the caps in the order drawnCaps lists them: each end cap followed by the row drawn behind it (`stack`)
    const capObjects = [
        edge.arrowCap,
        ...edge.arrowHeadStackCaps,
        edge.arrowTailCap,
        ...edge.arrowTailStackCaps,
        edge.arrowMiddleHeadCap,
        edge.arrowMiddleTailCap,
    ].filter((cap) => cap !== null && !cap.isDisposed());
    const caps = edge.drawnCaps.map((c, k) => {
        const cap = capObjects[k];
        const at = cap?.position ?? Vector3.Zero();
        // a billboard's color is its slot's; a flat cap's, its batch's material
        const look = cap?.drawnAppearance?.colour ?? null;
        const material = look === null ? materialColor(cap?.batchMesh?.material ?? null) : null;
        const rgb = look ?? material?.rgb ?? null;
        // an end cap drawn past the middle of its line (`ArrowStyle.position` above 0.5) sits at the other end, and is
        // read there, as a reader of the drawing finds it (Pajek's `ap 1`: the head drawn at the source end)
        const other = OTHER_END[c.end];
        const own = c.end === "arrowHead" ? internal.drawnStyle?.arrowHead : internal.drawnStyle?.arrowTail;
        const across = other !== undefined && (own?.position ?? 0) > 0.5;
        return {
            end: across ? other : c.end,
            // read there, it points back along its line: a head's triangle into the line from its source end
            name: across ? pointingBack(c.name) : c.name,
            sizePx: c.span * p.pxPerWorld(at),
            outline: capOutline(cap, p),
            color: rgb === null ? null : hex(rgb),
            opacity: c.visibility * (material?.alpha ?? 1),
            gap:
                (c.end === "arrowHead" ? internal.drawnStyle?.arrowHead?.gap : undefined) ??
                (c.end === "arrowTail" ? internal.drawnStyle?.arrowTail?.gap : undefined) ??
                0,
            ...(own === undefined || other === undefined ? {} : { position: own.position ?? 0 }),
        };
    });
    return {
        kind,
        shown: edge.isRenderVisible(),
        points: world.map((v) => {
            const s = p.point(v);
            return [s.x, s.y];
        }),
        thicknessPx,
        ...(screenFloored ? { screenFloored } : {}),
        color,
        opacity,
        pattern,
        dashPx,
        outline: readOutline(internal, p),
        overlay: readOverlay(internal, p),
        caps,
        label: readLabel(edge.label, p),
        endLabels: [edge.arrowTailText, edge.arrowHeadText].flatMap((l) => {
            const read = readLabel(l, p);
            return read === null ? [] : [read];
        }),
        gradient:
            edge.drawnGradient.length === 0
                ? null
                : {
                      kind: internal.drawnStyle?.line?.gradient?.kind === "radial" ? "radial" : "linear",
                      colors: edge.drawnGradient,
                  },
    };
}

/** One file annotation as drawn: its kind, its text and the screen box of its geometry. */
export interface DrawnAnnotation {
    kind: "shape" | "text" | "arrow" | "image";
    text?: string;
    box: ScreenBox;
    /** An arrow's heads, each one's screen box. */
    heads?: ScreenBox[];
}

/**
 * Reads the file annotations off the scene: the meshes whose metadata names an annotation.
 * @param scene - the scene
 * @param p - the projector
 * @returns the annotations
 */
export function readAnnotations(scene: Scene, p: Projector): DrawnAnnotation[] {
    return scene.meshes.flatMap((mesh) => {
        const a = (mesh.metadata as Partial<AnnotationMeshMetadata> | null)?.annotation;
        if (a === undefined || !mesh.isEnabled()) {
            return [];
        }
        const { z } = mesh.getAbsolutePosition();
        const onScreen = (b: { x0: number; y0: number; x1: number; y1: number }): ScreenBox => {
            const corners = [p.point(new Vector3(b.x0, b.y0, z)), p.point(new Vector3(b.x1, b.y1, z))];
            return {
                x0: Math.min(...corners.map((c) => c.x)),
                x1: Math.max(...corners.map((c) => c.x)),
                y0: Math.min(...corners.map((c) => c.y)),
                y1: Math.max(...corners.map((c) => c.y)),
                near: Math.min(...corners.map((c) => c.depth)),
                far: Math.max(...corners.map((c) => c.depth)),
            };
        };
        return [
            {
                kind: a.kind,
                ...(a.text === undefined ? {} : { text: a.text }),
                box: onScreen(a.box),
                ...(a.heads === undefined ? {} : { heads: a.heads.map(onScreen) }),
            },
        ];
    });
}

/** Everything drawn, keyed by node and edge id. */
export interface DrawnGraph {
    nodes: Map<string, DrawnNode>;
    edges: Map<string, DrawnEdge>;
    /** The file annotations drawn beside the graph. */
    annotations: DrawnAnnotation[];
    /** The clear color, and its alpha: below 1 the page behind the canvas shows through. */
    background: { hex: string; alpha: number };
    width: number;
    height: number;
}

/**
 * Reads the whole drawn graph. Call after a stable frame.
 * @param graph - the element's graph (`element.graph`)
 * @returns what was drawn
 */
export function readDrawn(graph: Graph): DrawnGraph {
    const scene = graph.getScene();
    const p = new Projector(scene);
    const rings = ringsOf(scene, p.width);
    const dm = graph.getDataManager();
    const nodes = new Map<string, DrawnNode>();
    for (const [id, node] of dm.nodes) {
        nodes.set(String(id), readNode(node, p, rings));
    }
    const edges = new Map<string, DrawnEdge>();
    for (const [id, edge] of dm.edges) {
        edges.set(id, readEdge(edge, p));
    }
    // what a node draws over its face is drawn beside the node's own shape, as a file annotation is
    const pieces = [...nodes.values()].flatMap((n) => (n.shown ? n.pieces : []));
    return {
        nodes,
        edges,
        annotations: [...readAnnotations(scene, p), ...pieces],
        background: { hex: hex(scene.clearColor), alpha: scene.clearColor.a },
        width: p.width,
        height: p.height,
    };
}

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
    type AbstractMesh,
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
import type { Edge } from "../../src/Edge";
import type { Graph } from "../../src/Graph";
import type { AnnotationMeshMetadata } from "../../src/meshes/AnnotationMeshes";
import type { ArrowCap, ArrowCapBatch } from "../../src/meshes/ArrowCapBatch";
import type { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import type { RichTextLabel, TextSegment } from "../../src/meshes/RichTextLabel";
import type { Node } from "../../src/Node";

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
    lineIsCurve: boolean;
    drawnStyle: { line?: { bezier?: boolean } } | null;
}
interface PatternInternals {
    width: number;
    color: string;
    opacity: number;
}
interface NodeInternals {
    border: AbstractMesh | null;
    drawnStyle: NodeStyleConfig | null;
}
interface LabelInternals {
    actualDimensions: { width: number; height: number };
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
    label: DrawnLabel | null;
}

/** A node's border ring as drawn. */
export interface DrawnBorder {
    color: string | null;
    /** How far the ring reaches past the node's outline, in render pixels. */
    widthPx: number;
    /** The line style the ring was built in (the node's own record of it). */
    style: string;
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
    const material = materialColor(source.material);
    return {
        color: material ? hex(material.rgb) : null,
        widthPx: Math.max(0, widthPx),
        style: drawnStyle?.border?.style ?? "solid",
    };
}

/**
 * How far a node's border position drew its fill in from its size, in screen pixels, whether or not the border
 * itself is shown: nothing for a border outside the size, half the ring for one centered on it, the ring for one
 * inside it.
 * @param node - the node
 * @param p - the projector
 * @returns the inset on each side
 */
function readInset(node: Node, p: Projector): number {
    const { drawnStyle } = node as unknown as NodeInternals;
    const border = drawnStyle?.border;
    const share =
        new Map([
            ["inside", 1],
            ["center", 0.5],
        ]).get(border?.position ?? "outside") ?? 0;
    if (share === 0) {
        return 0;
    }
    const shape = drawnStyle?.shape;
    const { ring } = NodeMesh.borderFit(
        shape,
        border,
        NodeMesh.extentsOf(shape ?? {}, Math.max(shape?.size ?? node.size, 1e-3)),
    );
    const at = node.mesh.getAbsolutePosition();
    const o = p.point(at);
    const x = p.point(at.add(new Vector3(ring, 0, 0)));
    return share * Math.hypot(x.x - o.x, x.y - o.y);
}

/**
 * The first stop of the gradient a node's style fills it with, as `#rrggbb`.
 * @param node - the node
 * @returns the color, or null when the node's style holds no gradient
 */
function rampStart(node: Node): string | null {
    const color = (node as unknown as NodeInternals).drawnStyle?.texture?.color as
        { colorType?: string; colors?: unknown[] } | undefined;
    const first = color?.colorType?.endsWith("gradient") === true ? color.colors?.[0] : undefined;
    return typeof first === "string" ? first.toLowerCase() : null;
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
    const ramp = base?.texture === true ? rampStart(node) : null;
    const ring = rings
        .filter((r) => r.has(source))
        .map((r) => ({ kind: r.kind, color: r.color(source), reachPx: r.reachPx, inner: r.inner }))
        .sort((a, b) => b.reachPx - a.reachPx)[0];
    const border = readBorder(node, p);
    // A node whose fill is transparent (Graphviz's default, unfilled shape) still draws its outline.
    const shown = (mesh.isVisible && source.visibility > 0) || border !== null;
    return {
        x: center.x,
        y: center.y,
        box,
        meshName: source.name,
        shapeType: node.shapeType,
        polygon: (node as unknown as NodeInternals).drawnStyle?.shape?.points,
        fillDrawn: ramp ?? (rgb ? hex(rgb) : null),
        fillOpacity: faces ? (base?.alpha ?? 1) * source.visibility : 0,
        gradient: base?.texture === true,
        instanceColor: buffer !== undefined,
        visible: node.getRenderState() === "visible" && mesh.isEnabled() && shown,
        shown: node.getRenderState() === "visible" && mesh.isEnabled(),
        ring: ring ?? null,
        insetPx: readInset(node, p),
        border,
        label: readLabel(node.label, p),
    };
}

/** What an edge drew. */
export interface DrawnEdge {
    kind: "line-2d" | "screen-line" | "curve" | "pattern" | "other";
    /** The path on screen, source end first. */
    points: [number, number][];
    thicknessPx: number;
    color: string | null;
    opacity: number;
    pattern: string | null;
    caps: {
        end: "arrowHead" | "arrowTail";
        name: string;
        sizePx: number;
        /** A flat cap's drawn outline on screen (its geometry under its slot), or null for a billboard. */
        outline: [number, number][] | null;
    }[];
    label: DrawnLabel | null;
    /** The texts at its ends (`edge.arrowTailText`, `edge.arrowHeadText`), tail first. */
    endLabels: DrawnLabel[];
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
    if (typeof flat === "number") {
        return flat * Math.abs(mesh.absoluteScaling.y) * p.pxPerWorld(at);
    }
    const material = mesh.material as unknown as {
        _floats?: Record<string, number>;
        options?: { defines?: string[] };
    } | null;
    const width = material?._floats?.width;
    if (typeof width !== "number") {
        return 0;
    }
    // a line whose width is in world units (a joined line through bends drawn at the file's width), not pixels
    const world = material?.options?.defines?.includes("#define WORLD_WIDTH") === true;
    return world ? width * p.pxPerWorld(at) : width / 2 / p.point(at).w;
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
    let color: string | null = null;
    let opacity = 1;
    let pattern: string | null = null;
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
        world = pm.elements.map((el: ArrowCap) => el.position);
        const mid = world[Math.floor(world.length / 2)] ?? Vector3.Zero();
        thicknessPx = fields.width * p.pxPerWorld(mid);
        color = cssColor(fields.color).hex;
        ({ opacity } = fields);
    }
    // An arrow is part of the edge as drawn: its tip, not the line it caps, is where the edge ends.
    // The line stops short of a tip by the arrow's length, which on a short edge between two ports
    // can turn it round; a route judged to the node center from there would not be the one drawn.
    const tip = (cap: ArrowCap | null): Vector3 | null =>
        cap !== null && !cap.isDisposed() && cap.visibility > 0 ? cap.position.clone() : null;
    const tail = tip(edge.arrowTailCap);
    const head = tip(edge.arrowCap);
    if (world.length >= 2 && tail !== null) {
        world = [tail, ...world.slice(1)];
    }
    if (world.length >= 2 && head !== null) {
        world = [...world.slice(0, -1), head];
    }
    const caps = edge.drawnCaps.map((c) => {
        const cap = c.end === "arrowHead" ? edge.arrowCap : edge.arrowTailCap;
        const at = cap?.position ?? Vector3.Zero();
        return { end: c.end, name: c.name, sizePx: c.span * p.pxPerWorld(at), outline: capOutline(cap, p) };
    });
    return {
        kind,
        points: world.map((v) => {
            const s = p.point(v);
            return [s.x, s.y];
        }),
        thicknessPx,
        color,
        opacity,
        pattern,
        caps,
        label: readLabel(edge.label, p),
        endLabels: [edge.arrowTailText, edge.arrowHeadText].flatMap((l) => {
            const read = readLabel(l, p);
            return read === null ? [] : [read];
        }),
    };
}

/** One file annotation as drawn: its kind, its text and the screen box of its geometry. */
export interface DrawnAnnotation {
    kind: "shape" | "text" | "arrow" | "image";
    text?: string;
    box: ScreenBox;
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
        const corners = [p.point(new Vector3(a.box.x0, a.box.y0, z)), p.point(new Vector3(a.box.x1, a.box.y1, z))];
        const box: ScreenBox = {
            x0: Math.min(...corners.map((c) => c.x)),
            x1: Math.max(...corners.map((c) => c.x)),
            y0: Math.min(...corners.map((c) => c.y)),
            y1: Math.max(...corners.map((c) => c.y)),
            near: Math.min(...corners.map((c) => c.depth)),
            far: Math.max(...corners.map((c) => c.depth)),
        };
        return [{ kind: a.kind, ...(a.text === undefined ? {} : { text: a.text }), box }];
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
    return {
        nodes,
        edges,
        annotations: readAnnotations(scene, p),
        background: { hex: hex(scene.clearColor), alpha: scene.clearColor.a },
        width: p.width,
        height: p.height,
    };
}

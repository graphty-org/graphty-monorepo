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
    type Mesh,
    type Scene,
    ShaderMaterial,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";

import type { Edge } from "../../src/Edge";
import type { Graph } from "../../src/Graph";
import type { ArrowCap } from "../../src/meshes/ArrowCapBatch";
import type { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
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
}
interface PatternInternals {
    width: number;
    color: string;
    opacity: number;
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
    const fontPx = run && textureHeight > 0 ? (run.style.size * (box.y1 - box.y0)) / textureHeight : 0;
    const material = materialColor(mesh.material);
    return {
        text: runsText(label.textRuns),
        box,
        fontPx,
        color: cssColor(run?.style.color ?? "#000000").hex,
        enabled: mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0 && (material === null || material.alpha > 0),
        onTop: mesh.renderingGroupId > 0,
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
    /** The fill color as drawn (material times instance color), before any precedence rule. */
    fillDrawn: string | null;
    fillOpacity: number;
    instanceColor: boolean;
    visible: boolean;
    ring: { kind: Ring["kind"]; color: string | null; reachPx: number; inner: boolean } | null;
    label: DrawnLabel | null;
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
    const rgb = base ? new Color3(base.rgb.r, base.rgb.g, base.rgb.b) : null;
    if (rgb && buffer) {
        rgb.multiplyInPlace(new Color3(buffer.r, buffer.g, buffer.b));
    }
    const ring = rings
        .filter((r) => r.has(source))
        .map((r) => ({ kind: r.kind, color: r.color(source), reachPx: r.reachPx, inner: r.inner }))
        .sort((a, b) => b.reachPx - a.reachPx)[0];
    return {
        x: center.x,
        y: center.y,
        box,
        meshName: source.name,
        shapeType: node.shapeType,
        fillDrawn: rgb ? hex(rgb) : null,
        fillOpacity: (base?.alpha ?? 1) * source.visibility,
        instanceColor: buffer !== undefined,
        visible: node.getRenderState() === "visible" && mesh.isEnabled() && mesh.isVisible && source.visibility > 0,
        ring: ring ?? null,
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
    caps: { end: "arrowHead" | "arrowTail"; name: string; sizePx: number }[];
    label: DrawnLabel | null;
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
    const width = (mesh.material as unknown as { _floats?: Record<string, number> } | null)?._floats?.width;
    return typeof width === "number" ? width / 2 / p.point(at).w : 0;
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
        if (internal.lineIsCurve) {
            world = edge.drawnCurve ?? [];
            kind = "curve";
        } else {
            world = slots.length > 0 ? batch.endsOf(slots[0]) : [];
            kind = flat ? "line-2d" : "screen-line";
        }
        const mid = world[Math.floor(world.length / 2)] ?? Vector3.Zero();
        thicknessPx = lineThickness(batch.mesh, mid, p);
        const m = materialColor(batch.mesh.material);
        color = m ? hex(m.rgb) : null;
        opacity = (m?.alpha ?? 1) * batch.mesh.visibility;
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
    const caps = edge.drawnCaps.map((c) => {
        const cap = c.end === "arrowHead" ? edge.arrowCap : edge.arrowTailCap;
        const at = cap?.position ?? Vector3.Zero();
        return { end: c.end, name: c.name, sizePx: c.span * p.pxPerWorld(at) };
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
    };
}

/** Everything drawn, keyed by node and edge id. */
export interface DrawnGraph {
    nodes: Map<string, DrawnNode>;
    edges: Map<string, DrawnEdge>;
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
        background: { hex: hex(scene.clearColor), alpha: scene.clearColor.a },
        width: p.width,
        height: p.height,
    };
}

/**
 * The shader-lab harness: one call gives a story its own canvas, Babylon.js engine and scene, a
 * sample graph drawn as thin-instanced node quads and edge ribbons, an orbit camera, picking, a
 * time uniform and post-processes. A story supplies GLSL and uniforms; the harness does the rest
 * and disposes everything when the story unmounts. Nothing here touches graphty-element.
 */
import {
    ArcRotateCamera,
    Color4,
    Constants,
    Effect,
    Engine,
    Mesh,
    PostProcess,
    Scene,
    ShaderMaterial,
    Vector2,
    Vector3,
    Vector4,
    VertexData,
} from "@babylonjs/core";

import { GLSL_AA, GLSL_LIBRARY } from "./glsl";
import { communityColor, type GraphKind, hopsFrom, type LabGraph, makeGraph } from "./graphs";

/** A uniform value: a number (float), a boolean (float 0/1), 2-4 numbers (vec2-vec4) or "#rrggbb" (vec3). */
export type UniformValue = number | boolean | number[] | string;
export type Uniforms = Record<string, UniformValue>;

/** How a layer blends: opaque (depth write, discard for holes), alpha, or additive (glows). */
export type Blend = "opaque" | "alpha" | "add";

export interface NodeLayerOptions {
    /** Fragment shader (a full `void main()`); default a flat community-colored disc. */
    fragment?: string;
    /** Replace the whole default vertex shader (a full `void main()`). */
    vertex?: string;
    /**
     * GLSL inserted before the default vertex main. Define `LAB_NODE_SCALE` and
     * `float labNodeScale()` to scale a node, or `LAB_NODE_CENTER` and `vec3 labNodeCenter(vec3 p)`
     * to move it. Attributes and uniforms are in scope.
     */
    vertexHooks?: string;
    /** Quad half-size in node radii; 1 = the node disc fills the quad. Use 2-4 for halos. */
    quadScale?: number;
    blend?: Blend;
    /** Per-node values for the `nodeCustom` vec4 attribute. */
    custom?: (i: number, graph: LabGraph) => number[];
    /** Per-node size multiplier (default 0.75 + 0.75 * sqrt(degree)). */
    size?: (i: number, graph: LabGraph) => number;
    /** Per-node rgb 0..1 (default the community palette). */
    color?: (i: number, graph: LabGraph) => number[];
}

export interface EdgeLayerOptions {
    /** Fragment shader (a full `void main()`); default a source-to-target color gradient. */
    fragment?: string;
    /** Replace the whole default vertex shader. */
    vertex?: string;
    /**
     * GLSL inserted before the default vertex main. Define `LAB_EDGE_CENTER` and
     * `vec3 labEdgeCenter(vec3 a, vec3 b, float t)` to bend or displace the edge, or
     * `LAB_EDGE_WIDTH` and `float labEdgeWidth(float t)` (pixels) to shape its width.
     */
    vertexHooks?: string;
    /** Pieces along the edge (default 1; use 16-64 for curves, waves, lightning). */
    segments?: number;
    blend?: Blend;
    custom?: (e: number, graph: LabGraph) => number[];
}

export interface LabOptions {
    /** Which sample graph (default "communities"). */
    graph?: GraphKind | LabGraph;
    /** Node count override for the sample graph. */
    nodes?: number;
    dim?: 2 | 3;
    seed?: number;
    /** Draw nodes (default true). Pass options to shade them; false hides them. */
    nodeLayer?: NodeLayerOptions | false;
    /** Draw edges (default true). */
    edgeLayer?: EdgeLayerOptions | false;
    /** Full-screen post-process fragment shaders, applied in order. */
    post?: string[];
    /** Story uniforms, declared in every shader and live-updated when Storybook args change. */
    uniforms?: Uniforms;
    /** Base node radius multiplier (uniform `nodeSize`, default 1). */
    nodeSize?: number;
    /** Base edge width in CSS pixels (uniform `edgeWidth`, default 1.5). */
    edgeWidth?: number;
    background?: string;
    /** "orbit" (3D) or "flat" (2D, looking down z, no rotation). Default by `dim`. */
    camera?: "orbit" | "flat";
    autoRotate?: boolean;
    /** Escape hatch for extra meshes, render targets, pipelines. May return a cleanup function. */
    setup?: (ctx: LabContext) => unknown;
    /** Values that force a full rebuild when they change (anything not a uniform that setup reads). */
    rebuildOn?: unknown[];
}

/** A thin-instanced mesh with per-instance attribute buffers. */
export interface LabLayer {
    mesh: Mesh;
    material: ShaderMaterial;
    count: number;
    /** Attribute name -> data (instance-major). Edit in place, then call update(name). */
    buffers: Record<string, Float32Array>;
    update(name?: string): void;
}

export interface InstanceOptions {
    name: string;
    count: number;
    /** "quad" = corners at (+-1, +-1); a number = a strip of that many pieces with position (t, side). */
    geometry?: "quad" | number;
    /** Per-instance attributes: name -> [floats per instance, data]. */
    attributes: Record<string, [number, Float32Array]>;
    /** Varying declarations shared by both stages, e.g. "varying vec2 vUV;". */
    varyings?: string;
    vertex: string;
    fragment: string;
    blend?: Blend;
}

export interface LabContext {
    engine: Engine;
    scene: Scene;
    camera: ArcRotateCamera;
    canvas: HTMLCanvasElement;
    graph: LabGraph;
    nodes?: LabLayer;
    edges?: LabLayer;
    /** The info box in the corner; append text or controls. */
    overlay: HTMLElement;
    /** Seconds since mount. */
    readonly time: number;
    /** Set a uniform on every material and post-process (declare it in `uniforms` first). */
    set(name: string, value: UniformValue): void;
    /** Run every frame before rendering. */
    onFrame(cb: (time: number, dt: number) => void): void;
    /** Select a node by index (-1 clears), as a click does. */
    select(index: number): void;
    /** Another thin-instanced mesh with the lab's uniforms and GLSL library. */
    addInstances(options: InstanceOptions): LabLayer;
    /** Another full-screen post-process (fragment shader). */
    addPost(fragment: string): PostProcess;
}

const BUILTIN_UNIFORMS: [string, string][] = [
    ["time", "float"],
    ["deltaTime", "float"],
    ["resolution", "vec2"],
    ["pixelRatio", "float"],
    ["mouse", "vec2"],
    ["hoverNode", "float"],
    ["selectedNode", "float"],
    ["hoverPos", "vec3"],
    ["selectedPos", "vec3"],
    ["hoverTime", "float"],
    ["selectTime", "float"],
    ["nodeCount", "float"],
    ["edgeCount", "float"],
    ["nodeRadius", "float"],
    ["nodeSize", "float"],
    ["edgeWidth", "float"],
    ["cameraPosition", "vec3"],
];
const MATRIX_UNIFORMS = ["world", "view", "projection", "viewProjection"];

function uniformType(v: UniformValue): string {
    if (typeof v === "string") {
        return "vec3";
    }
    if (Array.isArray(v)) {
        return v.length === 1 ? "float" : `vec${v.length}`;
    }
    return "float";
}

function toFloats(v: UniformValue): number[] {
    if (typeof v === "boolean") {
        return [v ? 1 : 0];
    }
    if (typeof v === "number") {
        return [v];
    }
    if (typeof v === "string") {
        const hex = v.replace("#", "");
        return [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
    }
    return v;
}

function blendSetup(material: ShaderMaterial, blend: Blend): void {
    material.backFaceCulling = false;
    if (blend === "opaque") {
        return;
    }
    material.alphaMode = blend === "add" ? Constants.ALPHA_ADD : Constants.ALPHA_COMBINE;
    material.disableDepthWrite = true;
    material.needAlphaBlending = (): boolean => true;
}

/** Varyings of the node layer (both stages). */
const NODE_VARYINGS = `
varying vec2 vUV;          // quad position in node radii: the node disc is length(vUV) < 1
varying vec4 vColor;       // community color
varying vec4 vData;        // degree, rank, value, community (all 0..1 except community id)
varying vec4 vInfo;        // random, node index, hop from selected (-1 none), size
varying vec4 vState;       // hovered, selected, stamp, flag
varying vec4 vCustom;      // story values
varying vec3 vCenterView;  // node center in view space
varying vec3 vCenterWorld; // node center in world space
varying float vRadius;     // node radius in world units
varying float vPixelRadius;// node radius in device pixels
`;

const NODE_VERTEX = `
#ifndef LAB_NODE_SCALE
float labNodeScale() { return 1.0; }
#endif
#ifndef LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) { return p; }
#endif
void main() {
    vec3 center = labNodeCenter(nodePos);
    float radius = nodeRadius * nodeSize * nodeInfo.w * labNodeScale();
    vec4 vc = view * vec4(center, 1.0);
    vec2 corner = position.xy * quadScale;
    gl_Position = projection * (vc + vec4(corner * radius, 0.0, 0.0));
    vec4 cc = projection * vc;
    vUV = corner;
    vColor = nodeColor; vData = nodeData; vInfo = nodeInfo; vState = nodeState; vCustom = nodeCustom;
    vCenterView = vc.xyz; vCenterWorld = center; vRadius = radius;
    vPixelRadius = radius * projection[1][1] * resolution.y * 0.5 / max(cc.w, 1e-4);
}
`;

const NODE_FRAGMENT = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = vColor.rgb * (0.85 + 0.15 * vUV.y);
    c = mix(c, vec3(1.0), 0.6 * vState.x);                       // hovered
    c = mix(c, vec3(1.0), stroke(d + 0.12, 0.06) * vState.y);    // selected ring
    gl_FragColor = vec4(c, a);
}
`;

/** GLSL helpers only the node fragment gets: ray-cast sphere impostors. */
const NODE_FRAGMENT_HELPERS = `
// View-space sphere normal under this fragment (z points away from the camera, so the visible
// side has n.z < 0). Discards outside the disc and writes the true sphere depth.
vec3 labSphereNormal() {
    float r2 = dot(vUV, vUV);
    if (r2 > 1.0) discard;
    vec3 n = vec3(vUV, -sqrt(1.0 - r2));
    vec4 clip = projection * vec4(vCenterView + n * vRadius, 1.0);
    gl_FragDepthEXT = 0.5 * clip.z / clip.w + 0.5;
    return n;
}
// Direction from the fragment toward the camera in view space (orthographic approximation).
const vec3 labViewDir = vec3(0.0, 0.0, -1.0);
`;

const EDGE_VARYINGS = `
varying float vT;          // 0 at the source, 1 at the target
varying float vSide;       // -1..1 across the edge, beyond +-1 is the anti-aliasing margin
varying vec4 vColorA;      // source color
varying vec4 vColorB;      // target color
varying vec4 vData;        // weight 0..1, source community, target community, random
varying vec4 vInfo;        // source index, target index, edge index, hop from selected (-1 none)
varying vec4 vState;       // stamp, flag, -, - (story-owned)
varying vec4 vCustom;      // story values
varying vec2 vTouch;       // x: +1 source is hovered, -1 target is hovered, y: the same for selected
varying float vLengthPx;   // edge length on screen, device pixels
varying float vWidthPx;    // edge width at this point, device pixels
`;

const EDGE_VERTEX = `
#ifndef LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) { return mix(a, b, t); }
#endif
#ifndef LAB_EDGE_WIDTH
float labEdgeWidth(float t) { return edgeWidth; }
#endif
vec2 labScreen(vec4 c) { return c.xy / max(c.w, 1e-4) * resolution * 0.5; }
void main() {
    float t = position.x;
    float side = position.y;
    vec3 p = labEdgeCenter(edgeA, edgeB, t);
    vec3 p0 = labEdgeCenter(edgeA, edgeB, max(t - 0.01, 0.0));
    vec3 p1 = labEdgeCenter(edgeA, edgeB, min(t + 0.01, 1.0));
    vec4 c = viewProjection * vec4(p, 1.0);
    vec2 dir = labScreen(viewProjection * vec4(p1, 1.0)) - labScreen(viewProjection * vec4(p0, 1.0));
    dir = length(dir) > 1e-5 ? normalize(dir) : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    float w = max(labEdgeWidth(t) * pixelRatio, 0.5);
    float hw = w * 0.5 + 1.0;
    c.xy += nrm * side * hw / (resolution * 0.5) * c.w;
    gl_Position = c;
    vT = t; vSide = side * hw / (w * 0.5); vWidthPx = w;
    vLengthPx = length(labScreen(viewProjection * vec4(edgeB, 1.0)) - labScreen(viewProjection * vec4(edgeA, 1.0)));
    vColorA = edgeColorA; vColorB = edgeColorB; vData = edgeData; vInfo = edgeInfo; vState = edgeState; vCustom = edgeCustom;
    vTouch = vec2(edgeInfo.x == hoverNode ? 1.0 : (edgeInfo.y == hoverNode ? -1.0 : 0.0),
                  edgeInfo.x == selectedNode ? 1.0 : (edgeInfo.y == selectedNode ? -1.0 : 0.0));
}
`;

const EDGE_FRAGMENT = `
void main() {
    float a = 1.0 - smoothstep(1.0 - fwidth(vSide), 1.0 + fwidth(vSide), abs(vSide));
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(mix(c, vec3(1.0), 0.5 * lit), a * mix(0.55, 1.0, lit));
}
`;

/** Coverage helper for edge fragments. */
const EDGE_FRAGMENT_HELPERS = `
float labEdgeCoverage() { float w = fwidth(vSide); return 1.0 - smoothstep(1.0 - w, 1.0 + w, abs(vSide)); }
`;

let viewCount = 0;
/** The view mounted last, reused when only uniforms change (Storybook keeps the same node). */
let lastView: { key: string; element: HTMLElement; setUniforms: (u: Uniforms) => void } | undefined;
/** Camera kept across rebuilds of the same graph, so changing a control does not reset the view. */
const savedCameras = new Map<string, { alpha: number; beta: number; radius: number; target: Vector3 }>();

function hexColor(hex: string): Color4 {
    const [r, g, b] = toFloats(hex);
    return new Color4(r, g, b, 1);
}

/**
 * Mount a shader-lab view. Return the element from a story's render function.
 * @param options - the graph, the node, edge and post shaders, uniforms and setup
 * @returns an element that owns the engine and disposes it when removed from the page
 */
export function mountLab(options: LabOptions): HTMLElement {
    const graph =
        typeof options.graph === "object"
            ? options.graph
            : makeGraph(options.graph ?? "communities", { nodes: options.nodes, dim: options.dim, seed: options.seed });
    const uniformsIn = { nodeSize: options.nodeSize ?? 1, edgeWidth: options.edgeWidth ?? 1.5, ...options.uniforms };
    const key = JSON.stringify(
        {
            ...options,
            uniforms: Object.keys(uniformsIn),
            nodeSize: 0,
            edgeWidth: 0,
            graph: `${graph.kind}${graph.n}${graph.dim}`,
        },
        (_k, v: unknown) => (typeof v === "function" ? v.toString() : v),
    );
    if (lastView?.key === key && lastView.element.isConnected) {
        lastView.setUniforms(uniformsIn);
        return lastView.element;
    }

    const root = document.createElement("div");
    root.style.cssText = "position:relative;width:100%;height:100vh;overflow:hidden;background:#000";
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block;outline:none;touch-action:none";
    root.appendChild(canvas);
    const overlay = document.createElement("div");
    overlay.style.cssText =
        "position:absolute;left:8px;top:8px;padding:4px 8px;font:12px/1.4 monospace;color:#ddd;background:rgba(0,0,0,0.55);border-radius:4px;pointer-events:none;white-space:pre";
    root.appendChild(overlay);
    const status = document.createElement("div");
    overlay.appendChild(status);

    const cleanups: (() => void)[] = [];
    let started = false;
    const start = (): void => {
        if (started) {
            return;
        }
        started = true;
        const view = build(options, graph, uniformsIn, canvas, overlay, status);
        cleanups.push(view.dispose);
        lastView = { key, element: root, setUniforms: view.setUniforms };
    };

    // Babylon needs the canvas in the page to size it; start once connected, dispose once removed.
    const observer = new MutationObserver(() => {
        if (root.isConnected) {
            start();
        } else if (started) {
            observer.disconnect();
            cleanups.forEach((fn) => {
                fn();
            });
            if (lastView?.element === root) {
                lastView = undefined;
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    queueMicrotask(() => {
        if (root.isConnected) {
            start();
        }
    });
    return root;
}

function build(
    options: LabOptions,
    graph: LabGraph,
    uniformsIn: Uniforms,
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    status: HTMLElement,
): { dispose: () => void; setUniforms: (u: Uniforms) => void } {
    viewCount++;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true }, true);
    const scene = new Scene(engine);
    scene.clearColor = hexColor(options.background ?? "#0b0d14");
    const flat = (options.camera ?? (graph.dim === 2 ? "flat" : "orbit")) === "flat";

    const camera = new ArcRotateCamera(
        "lab-camera",
        -Math.PI / 2,
        flat ? Math.PI / 2 : 1.2,
        150,
        Vector3.Zero(),
        scene,
    );
    camera.minZ = 0.5;
    camera.maxZ = 5000;
    camera.wheelDeltaPercentage = 0.01;
    camera.panningSensibility = 40;
    camera.lowerRadiusLimit = 5;
    if (flat) {
        camera.lowerAlphaLimit = camera.upperAlphaLimit = -Math.PI / 2;
        camera.lowerBetaLimit = camera.upperBetaLimit = Math.PI / 2;
        // left drag pans in 2D
        camera._panningMouseButton = 0;
    }
    const camKey = `${graph.kind}/${graph.n}/${graph.dim}`;
    const saved = savedCameras.get(camKey);
    if (saved) {
        camera.alpha = saved.alpha;
        camera.beta = saved.beta;
        camera.radius = saved.radius;
        camera.target = saved.target.clone();
    }
    camera.attachControl(canvas, true);
    if (options.autoRotate) {
        camera.useAutoRotationBehavior = true;
        if (camera.autoRotationBehavior) {
            camera.autoRotationBehavior.idleRotationWaitTime = 1500;
        }
    }

    // ---- uniforms ----
    const values = new Map<string, number[]>();
    const storyTypes: [string, string][] = Object.entries(uniformsIn)
        .filter(([name]) => !BUILTIN_UNIFORMS.some(([b]) => b === name))
        .map(([name, v]) => [name, uniformType(v)]);
    const allUniforms = [...BUILTIN_UNIFORMS, ...storyTypes];
    const uniformNames = allUniforms.map(([n]) => n);
    const uniformDecl = allUniforms.map(([n, t]) => `uniform ${t} ${n};`).join("\n");
    const setUniforms = (u: Uniforms): void => {
        for (const [n, v] of Object.entries(u)) {
            values.set(n, toFloats(v));
        }
    };
    setUniforms(uniformsIn);
    values.set("nodeRadius", [graph.nodeRadius]);
    values.set("nodeCount", [graph.n]);
    values.set("edgeCount", [graph.m]);

    const materials: ShaderMaterial[] = [];
    const posts: PostProcess[] = [];
    const frameCallbacks: ((time: number, dt: number) => void)[] = [];

    const prelude = (stage: "vertex" | "fragment"): string =>
        `${
            stage === "fragment"
                ? "#extension GL_OES_standard_derivatives : enable\n#extension GL_EXT_frag_depth : enable\n"
                : ""
        }precision highp float;\n${MATRIX_UNIFORMS.map((n) => `uniform mat4 ${n};`).join("\n")}\n${uniformDecl}\n${GLSL_LIBRARY}\n${stage === "fragment" ? GLSL_AA : ""}\n`;

    const addInstances = (o: InstanceOptions): LabLayer => {
        const mesh = new Mesh(o.name, scene);
        const data = new VertexData();
        if (o.geometry === undefined || o.geometry === "quad") {
            data.positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
            data.indices = [0, 1, 2, 0, 2, 3];
        } else {
            const segs = Math.max(1, Math.floor(o.geometry));
            const positions: number[] = [];
            const indices: number[] = [];
            for (let i = 0; i <= segs; i++) {
                positions.push(i / segs, -1, 0, i / segs, 1, 0);
                if (i < segs) {
                    const k = i * 2;
                    indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
                }
            }
            data.positions = positions;
            data.indices = indices;
        }
        data.applyToMesh(mesh);
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.isPickable = false;

        const attrNames = Object.keys(o.attributes);
        const attrDecl = attrNames.map((n) => {
            const size = o.attributes[n][0];
            return `attribute ${size === 1 ? "float" : `vec${size}`} ${n};`;
        });
        const varyings = o.varyings ?? "";
        const name = `lab${viewCount}_${o.name}`;
        const material = new ShaderMaterial(
            name,
            scene,
            {
                vertexSource: `${prelude("vertex")}attribute vec3 position;\n${attrDecl.join("\n")}\n${varyings}\n${o.vertex}`,
                fragmentSource: `${prelude("fragment")}${varyings}\n${o.fragment}`,
            },
            {
                attributes: ["position", ...attrNames],
                uniforms: [...MATRIX_UNIFORMS, ...uniformNames],
            },
        );
        blendSetup(material, o.blend ?? "opaque");
        mesh.material = material;
        materials.push(material);

        // identity matrices: positions come from the custom attributes
        const identity = new Float32Array(o.count * 16);
        for (let i = 0; i < o.count; i++) {
            identity.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], i * 16);
        }
        mesh.thinInstanceSetBuffer("matrix", identity, 16, true);
        const buffers: Record<string, Float32Array> = {};
        for (const n of attrNames) {
            const [size, arr] = o.attributes[n];
            buffers[n] = arr;
            mesh.thinInstanceSetBuffer(n, arr, size, false);
        }
        return {
            mesh,
            material,
            count: o.count,
            buffers,
            update(n?: string) {
                for (const k of n ? [n] : attrNames) {
                    mesh.thinInstanceBufferUpdated(k);
                }
            },
        };
    };

    // ---- nodes ----
    let nodes: LabLayer | undefined;
    const nodeOpts = options.nodeLayer === false ? undefined : (options.nodeLayer ?? {});
    if (nodeOpts) {
        const { n } = graph;
        const color = new Float32Array(n * 4);
        const data = new Float32Array(n * 4);
        const info = new Float32Array(n * 4);
        const state = new Float32Array(n * 4);
        const custom = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) {
            const rgb = nodeOpts.color ? nodeOpts.color(i, graph) : communityColor(graph.community[i]);
            color.set([rgb[0], rgb[1], rgb[2], 1], i * 4);
            data.set([graph.degree[i], graph.rank[i], graph.value[i], graph.community[i]], i * 4);
            const size = nodeOpts.size ? nodeOpts.size(i, graph) : 0.75 + 0.75 * Math.sqrt(graph.degree[i]);
            info.set([graph.random[i], i, -1, size], i * 4);
            if (nodeOpts.custom) {
                custom.set(nodeOpts.custom(i, graph).slice(0, 4), i * 4);
            }
        }
        nodes = addInstances({
            name: "nodes",
            count: n,
            geometry: "quad",
            attributes: {
                nodePos: [3, Float32Array.from(graph.pos)],
                nodeColor: [4, color],
                nodeData: [4, data],
                nodeInfo: [4, info],
                nodeState: [4, state],
                nodeCustom: [4, custom],
            },
            varyings: NODE_VARYINGS,
            vertex: `const float quadScale = ${(nodeOpts.quadScale ?? 1).toFixed(4)};\n${nodeOpts.vertexHooks ?? ""}\n${nodeOpts.vertex ?? NODE_VERTEX}`,
            fragment: NODE_FRAGMENT_HELPERS + (nodeOpts.fragment ?? NODE_FRAGMENT),
            blend: nodeOpts.blend ?? "opaque",
        });
    }

    // ---- edges ----
    let edges: LabLayer | undefined;
    const edgeOpts = options.edgeLayer === false ? undefined : (options.edgeLayer ?? {});
    if (edgeOpts) {
        const { m } = graph;
        const a = new Float32Array(m * 3);
        const b = new Float32Array(m * 3);
        const ca = new Float32Array(m * 4);
        const cb = new Float32Array(m * 4);
        const data = new Float32Array(m * 4);
        const info = new Float32Array(m * 4);
        const state = new Float32Array(m * 4);
        const custom = new Float32Array(m * 4);
        for (let e = 0; e < m; e++) {
            const s = graph.src[e];
            const d = graph.dst[e];
            a.set(graph.pos.subarray(s * 3, s * 3 + 3), e * 3);
            b.set(graph.pos.subarray(d * 3, d * 3 + 3), e * 3);
            const cs = communityColor(graph.community[s]);
            const cd = communityColor(graph.community[d]);
            ca.set([cs[0], cs[1], cs[2], 1], e * 4);
            cb.set([cd[0], cd[1], cd[2], 1], e * 4);
            data.set(
                [graph.weight[e], graph.community[s], graph.community[d], (Math.sin(e * 12.9898) * 43758.5453) % 1],
                e * 4,
            );
            data[e * 4 + 3] = Math.abs(data[e * 4 + 3]);
            info.set([s, d, e, -1], e * 4);
            if (edgeOpts.custom) {
                custom.set(edgeOpts.custom(e, graph).slice(0, 4), e * 4);
            }
        }
        edges = addInstances({
            name: "edges",
            count: m,
            geometry: edgeOpts.segments ?? 1,
            attributes: {
                edgeA: [3, a],
                edgeB: [3, b],
                edgeColorA: [4, ca],
                edgeColorB: [4, cb],
                edgeData: [4, data],
                edgeInfo: [4, info],
                edgeState: [4, state],
                edgeCustom: [4, custom],
            },
            varyings: EDGE_VARYINGS,
            vertex: `${edgeOpts.vertexHooks ?? ""}\n${edgeOpts.vertex ?? EDGE_VERTEX}`,
            fragment: EDGE_FRAGMENT_HELPERS + (edgeOpts.fragment ?? EDGE_FRAGMENT),
            blend: edgeOpts.blend ?? "alpha",
        });
        // edges first, so opaque nodes cover their ends
        edges.mesh.renderingGroupId = 0;
        if (nodes) {
            nodes.mesh.renderingGroupId = 1;
        }
        scene.setRenderingAutoClearDepthStencil(1, false);
    }

    // ---- post-processes ----
    const addPost = (fragment: string): PostProcess => {
        const name = `lab${viewCount}_post${posts.length}`;
        Effect.ShadersStore[`${name}FragmentShader`] =
            `precision highp float;\nvarying vec2 vUV;\nuniform sampler2D textureSampler;\n${uniformDecl}\n${GLSL_LIBRARY}\n${GLSL_AA}\n${fragment}`;
        const pp = new PostProcess(name, name, uniformNames, null, 1, camera);
        pp.onApply = (effect) => {
            for (const [n, v] of values) {
                setOnEffect(effect, n, v);
            }
        };
        posts.push(pp);
        return pp;
    };
    for (const p of options.post ?? []) {
        addPost(p);
    }

    // ---- picking ----
    const mouse = { x: -1, y: -1, downX: 0, downY: 0 };
    let hover = -1;
    let selected = -1;
    const t0 = performance.now();
    let now = 0;
    const setFlag = (i: number, slot: number, v: number): void => {
        if (!nodes || i < 0) {
            return;
        }
        nodes.buffers.nodeState[i * 4 + slot] = v;
        nodes.update("nodeState");
    };
    const pick = (): number => {
        if (mouse.x < 0) {
            return -1;
        }
        const vp = scene.getTransformMatrix().m;
        const w = engine.getRenderWidth();
        const h = engine.getRenderHeight();
        const ratio = w / canvas.clientWidth;
        const mx = mouse.x * ratio;
        const my = mouse.y * ratio;
        const p11 = camera.getProjectionMatrix().m[5];
        const pos = nodes ? nodes.buffers.nodePos : graph.pos;
        const size = nodes?.buffers.nodeInfo;
        const scale = (values.get("nodeSize")?.[0] ?? 1) * graph.nodeRadius;
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < graph.n; i++) {
            const x = pos[i * 3];
            const y = pos[i * 3 + 1];
            const z = pos[i * 3 + 2];
            const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
            if (cw <= 0) {
                continue;
            }
            const sx = ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw + 1) * 0.5 * w;
            const sy = (1 - (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw) * 0.5 * h;
            const r = Math.max(6 * ratio, (scale * (size ? size[i * 4 + 3] : 1) * p11 * h * 0.5) / cw);
            const d = Math.hypot(sx - mx, sy - my);
            if (d < r && cw < bestD) {
                bestD = cw;
                best = i;
            }
        }
        return best;
    };
    const posOf = (i: number): number[] =>
        i < 0 ? [0, 0, 0] : Array.from((nodes?.buffers.nodePos ?? graph.pos).subarray(i * 3, i * 3 + 3));
    const select = (i: number): void => {
        setFlag(selected, 1, 0);
        selected = i;
        setFlag(selected, 1, 1);
        values.set("selectedNode", [selected]);
        values.set("selectedPos", posOf(selected));
        values.set("selectTime", [now]);
        const hops = selected >= 0 ? hopsFrom(graph, selected) : undefined;
        if (nodes) {
            for (let k = 0; k < graph.n; k++) {
                nodes.buffers.nodeInfo[k * 4 + 2] = hops ? hops[k] : -1;
            }
            nodes.update("nodeInfo");
        }
        if (edges) {
            for (let e = 0; e < graph.m; e++) {
                const hs = hops ? hops[graph.src[e]] : -1;
                const hd = hops ? hops[graph.dst[e]] : -1;
                const reached = [hs, hd].filter((h) => h >= 0);
                edges.buffers.edgeInfo[e * 4 + 3] = reached.length ? Math.min(...reached) : -1;
            }
            edges.update("edgeInfo");
        }
    };
    const onMove = (ev: PointerEvent): void => {
        const r = canvas.getBoundingClientRect();
        mouse.x = ev.clientX - r.left;
        mouse.y = ev.clientY - r.top;
        const i = pick();
        if (i !== hover) {
            setFlag(hover, 0, 0);
            hover = i;
            setFlag(hover, 0, 1);
            values.set("hoverNode", [hover]);
            values.set("hoverPos", posOf(hover));
            values.set("hoverTime", [now]);
        }
    };
    const onLeave = (): void => {
        mouse.x = mouse.y = -1;
        setFlag(hover, 0, 0);
        hover = -1;
        values.set("hoverNode", [-1]);
    };
    const onDown = (ev: PointerEvent): void => {
        mouse.downX = ev.clientX;
        mouse.downY = ev.clientY;
    };
    const onUp = (ev: PointerEvent): void => {
        if (Math.hypot(ev.clientX - mouse.downX, ev.clientY - mouse.downY) > 4) {
            return;
        }
        select(hover === selected ? -1 : hover);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    values.set("hoverNode", [-1]);
    values.set("selectedNode", [-1]);
    values.set("hoverPos", [0, 0, 0]);
    values.set("selectedPos", [0, 0, 0]);
    values.set("hoverTime", [-100]);
    values.set("selectTime", [-100]);

    // ---- per-frame ----
    let last = 0;
    scene.onBeforeRenderObservable.add(() => {
        now = (performance.now() - t0) / 1000;
        const dt = Math.min(0.1, now - last);
        last = now;
        const ratio = engine.getRenderWidth() / Math.max(1, canvas.clientWidth);
        values.set("time", [now]);
        values.set("deltaTime", [dt]);
        values.set("resolution", [engine.getRenderWidth(), engine.getRenderHeight()]);
        values.set("pixelRatio", [ratio]);
        values.set("mouse", mouse.x < 0 ? [-1, -1] : [mouse.x * ratio, engine.getRenderHeight() - mouse.y * ratio]);
        const cp = camera.position;
        values.set("cameraPosition", [cp.x, cp.y, cp.z]);
        for (const cb of frameCallbacks) {
            cb(now, dt);
        }
        for (const mat of materials) {
            for (const [n, v] of values) {
                setOnMaterial(mat, n, v);
            }
        }
    });

    const ctx: LabContext = {
        engine,
        scene,
        camera,
        canvas,
        graph,
        nodes,
        edges,
        overlay,
        get time() {
            return now;
        },
        set(n, v) {
            values.set(n, toFloats(v));
        },
        onFrame(cb) {
            frameCallbacks.push(cb);
        },
        select,
        addInstances,
        addPost,
    };
    let storyCleanup: unknown;
    try {
        storyCleanup = options.setup?.(ctx);
    } catch (err) {
        status.textContent = `setup failed: ${String(err)}`;
        throw err;
    }

    // ---- render loop, paused when hidden or scrolled away ----
    let visible = true;
    const io = new IntersectionObserver((entries) => {
        visible = entries.some((en) => en.isIntersecting);
    });
    io.observe(canvas);
    let frames = 0;
    let lastStat = performance.now();
    engine.runRenderLoop(() => {
        if (!visible || document.hidden) {
            return;
        }
        scene.render();
        frames++;
        const t = performance.now();
        if (t - lastStat > 500) {
            const fps = (frames * 1000) / (t - lastStat);
            frames = 0;
            lastStat = t;
            const drawCalls = scene.getActiveMeshes().length + posts.length;
            status.textContent = `${fps.toFixed(0)} fps  ${graph.n} nodes  ${graph.m} edges  ~${drawCalls} draws${
                hover >= 0
                    ? `\nhover #${hover} deg ${graph.degree[hover].toFixed(2)} rank ${graph.rank[hover].toFixed(2)} value ${graph.value[hover].toFixed(2)}`
                    : ""
            }${selected >= 0 ? `\nselected #${selected}` : ""}`;
        }
    });
    const onResize = (): void => {
        engine.resize();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    return {
        setUniforms,
        dispose: () => {
            savedCameras.set(camKey, {
                alpha: camera.alpha,
                beta: camera.beta,
                radius: camera.radius,
                target: camera.target.clone(),
            });
            if (typeof storyCleanup === "function") {
                (storyCleanup as () => void)();
            }
            ro.disconnect();
            io.disconnect();
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerleave", onLeave);
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointerup", onUp);
            engine.stopRenderLoop();
            scene.dispose();
            engine.dispose();
        },
    };
}

function setOnMaterial(mat: ShaderMaterial, name: string, v: number[]): void {
    if (v.length === 1) {
        mat.setFloat(name, v[0]);
    } else if (v.length === 2) {
        mat.setVector2(name, new Vector2(v[0], v[1]));
    } else if (v.length === 3) {
        mat.setVector3(name, new Vector3(v[0], v[1], v[2]));
    } else {
        mat.setVector4(name, new Vector4(v[0], v[1], v[2], v[3]));
    }
}

function setOnEffect(effect: Effect, name: string, v: number[]): void {
    if (v.length === 1) {
        effect.setFloat(name, v[0]);
    } else if (v.length === 2) {
        effect.setFloat2(name, v[0], v[1]);
    } else if (v.length === 3) {
        effect.setFloat3(name, v[0], v[1], v[2]);
    } else {
        effect.setFloat4(name, v[0], v[1], v[2], v[3]);
    }
}

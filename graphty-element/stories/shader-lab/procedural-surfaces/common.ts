/**
 * Helpers shared by the procedural-surface stories: sphere lighting GLSL, an additive halo layer
 * drawn over the nodes (atmospheres, coronas, glows), neighbor directions packed per node, and
 * node clicks.
 */
import type { LabContext, LabLayer } from "../harness";

/** GLSL for both node and halo fragments (needs vData). */
const PICK_GLSL = `
// the data attribute a story encodes: 0 = value, 1 = rank, 2 = degree
float pickData(float which) { return which < 0.5 ? vData.z : (which < 1.5 ? vData.y : vData.x); }
// a neighbor slot packed by trackNeighborAngles: x = screen angle, y = relative distance 0..1
vec2 unpackNeighbor(float v) { return vec2(floor(v) / 1000.0 * TAU - PI, fract(v)); }
`;

/** GLSL for node fragments (needs the node varyings). Light and view directions are in view space. */
export const SURFACE_GLSL = `
const vec3 LIGHT_DIR = vec3(-0.48, 0.56, -0.67);
// view-space direction to world space (the view matrix is a rotation plus a translation)
vec3 toWorld(vec3 n) { return vec3(dot(view[0].xyz, n), dot(view[1].xyz, n), dot(view[2].xyz, n)); }
float lambert(vec3 n) { return max(dot(n, normalize(LIGHT_DIR)), 0.0); }
float specular(vec3 n, float power) {
    vec3 h = normalize(normalize(LIGHT_DIR) + vec3(0.0, 0.0, -1.0));
    return pow(max(dot(n, h), 0.0), power);
}
// write the depth of a point given in node-local units (radius 1, view-space axes)
void depthAt(vec3 local) {
    vec4 clip = projection * vec4(vCenterView + local * vRadius, 1.0);
    gl_FragDepthEXT = 0.5 * clip.z / clip.w + 0.5;
}
// Worley noise on a sphere: three planar projections blended by the normal
vec2 voronoiTri(vec3 p, vec3 n) {
    vec3 w = pow(abs(n), vec3(4.0));
    w /= dot(w, vec3(1.0));
    return voronoi(p.yz) * w.x + voronoi(p.zx) * w.y + voronoi(p.xy) * w.z;
}
${PICK_GLSL}`;

/** The data-attribute control: which node number a shader encodes. */
export const encodeArgType = {
    control: "select",
    options: [0, 1, 2],
    labels: { 0: "value", 1: "rank", 2: "degree" },
};

export const colorArg = { control: "color" };

/** Dim, thin edges for the space-like stories, so the nodes carry the picture. */
export const DIM_EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(mix(c * 0.7, vec3(1.0), 0.4 * lit), labEdgeCoverage() * mix(0.28, 0.9, lit));
}
`;

const HALO_VARYINGS = `
varying vec2 vUV;
varying vec4 vColor;
varying vec4 vData;
varying vec4 vInfo;
varying vec4 vState;
varying vec4 vCustom;
varying float vPixelRadius;
`;

/**
 * An additive layer over the node layer, sharing its per-node data: glows outside the node disc.
 * It is drawn after the nodes and tests their depth, so a planet in front hides the glow behind it.
 * @param ctx - the lab context from `setup`
 * @param fragment - the halo fragment shader; vUV runs over +-quadScale node radii
 * @param quadScale - the halo quad half-size in node radii
 * @returns the halo layer
 */
export function addHalo(ctx: LabContext, fragment: string, quadScale: number): LabLayer | undefined {
    const { nodes } = ctx;
    if (!nodes) {
        return undefined;
    }
    const b = nodes.buffers;
    const halo = ctx.addInstances({
        name: "halo",
        count: nodes.count,
        geometry: "quad",
        blend: "add",
        attributes: {
            nodePos: [3, b.nodePos],
            nodeColor: [4, b.nodeColor],
            nodeData: [4, b.nodeData],
            nodeInfo: [4, b.nodeInfo],
            nodeState: [4, b.nodeState],
            nodeCustom: [4, b.nodeCustom],
        },
        varyings: HALO_VARYINGS,
        vertex: `
void main() {
    float radius = nodeRadius * nodeSize * nodeInfo.w;
    vec4 vc = view * vec4(nodePos, 1.0);
    vec2 corner = position.xy * ${quadScale.toFixed(3)};
    gl_Position = projection * (vc + vec4(corner * radius, 0.0, 0.0));
    vec4 cc = projection * vc;
    vUV = corner;
    vColor = nodeColor; vData = nodeData; vInfo = nodeInfo; vState = nodeState; vCustom = nodeCustom;
    vPixelRadius = radius * projection[1][1] * resolution.y * 0.5 / max(cc.w, 1e-4);
}
`,
        fragment: PICK_GLSL + fragment,
    });
    halo.mesh.renderingGroupId = 2;
    ctx.scene.setRenderingAutoClearDepthStencil(2, false);
    // the harness updates hover and selection on the node layer only; mirror them
    ctx.onFrame(() => {
        halo.update("nodeState");
        halo.update("nodeInfo");
    });
    return halo;
}

/**
 * Every frame, write each node's (up to) four highest-degree neighbors into nodeCustom as packed
 * screen directions: floor = angle in 1/1000 turns, fraction = distance relative to the farthest
 * of those neighbors. An empty slot is -1.
 * @param ctx - the lab context from `setup`
 */
export function trackNeighborAngles(ctx: LabContext): void {
    const { graph, nodes, engine, scene } = ctx;
    if (!nodes) {
        return;
    }
    const picks = graph.neighbors.map((list) =>
        [...list].sort((a, b) => graph.degree[b] - graph.degree[a]).slice(0, 4),
    );
    const ndc = new Float32Array(graph.n * 2);
    const custom = nodes.buffers.nodeCustom;
    const pos = nodes.buffers.nodePos;
    const d = [0, 0, 0, 0];
    const a = [0, 0, 0, 0];
    ctx.onFrame(() => {
        const { m } = scene.getTransformMatrix();
        const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
        for (let i = 0; i < graph.n; i++) {
            const x = pos[i * 3];
            const y = pos[i * 3 + 1];
            const z = pos[i * 3 + 2];
            const w = Math.max(1e-4, m[3] * x + m[7] * y + m[11] * z + m[15]);
            ndc[i * 2] = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w) * aspect;
            ndc[i * 2 + 1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
        }
        for (let i = 0; i < graph.n; i++) {
            const list = picks[i];
            let maxD = 1e-6;
            for (let k = 0; k < list.length; k++) {
                const dx = ndc[list[k] * 2] - ndc[i * 2];
                const dy = ndc[list[k] * 2 + 1] - ndc[i * 2 + 1];
                d[k] = Math.hypot(dx, dy);
                a[k] = Math.atan2(dy, dx);
                maxD = Math.max(maxD, d[k]);
            }
            for (let k = 0; k < 4; k++) {
                custom[i * 4 + k] =
                    k < list.length
                        ? Math.min(999, Math.floor(((a[k] + Math.PI) / (2 * Math.PI)) * 1000)) +
                          Math.min(0.999, d[k] / maxD)
                        : -1;
            }
        }
        nodes.update("nodeCustom");
    });
}

/**
 * Call `cb` with the node under the pointer when the canvas is clicked (not dragged).
 * @param ctx - the lab context from `setup`
 * @param cb - receives the clicked node index
 * @returns a cleanup function
 */
export function onNodeClick(ctx: LabContext, cb: (i: number) => void): () => void {
    let downX = 0;
    let downY = 0;
    const down = (ev: PointerEvent): void => {
        downX = ev.clientX;
        downY = ev.clientY;
    };
    const up = (ev: PointerEvent): void => {
        const state = ctx.nodes?.buffers.nodeState;
        if (!state || Math.hypot(ev.clientX - downX, ev.clientY - downY) > 4) {
            return;
        }
        for (let i = 0; i < ctx.graph.n; i++) {
            if (state[i * 4] > 0.5) {
                cb(i);
                return;
            }
        }
    };
    ctx.canvas.addEventListener("pointerdown", down);
    ctx.canvas.addEventListener("pointerup", up);
    return () => {
        ctx.canvas.removeEventListener("pointerdown", down);
        ctx.canvas.removeEventListener("pointerup", up);
    };
}

/**
 * Append a hint line to the corner overlay.
 * @param ctx - the lab context
 * @param text - the hint
 */
export function hint(ctx: LabContext, text: string): void {
    const line = document.createElement("div");
    line.style.color = "#9ad";
    line.textContent = text;
    ctx.overlay.appendChild(line);
}

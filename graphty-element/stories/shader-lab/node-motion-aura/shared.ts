/**
 * Helpers shared by the hop, hover, motion and aura stories: a second node layer drawn over the
 * nodes (for additive halos, moons, sparks and smoke), sphere lighting, and a tracker that copies
 * the selected node's hop numbers onto both ends of every edge.
 */
import { Vector3 } from "@babylonjs/core";

import type { Blend, LabContext, LabLayer } from "../harness";

const OVERLAY_VARYINGS = `
varying vec2 vUV;
varying vec4 vColor;
varying vec4 vData;
varying vec4 vInfo;
varying vec4 vState;
varying vec4 vCustom;
varying vec3 vCenterView;
varying vec3 vCenterWorld;
varying float vRadius;
varying float vPixelRadius;
`;

// The harness's node vertex shader with two more knobs: OV_SCALE scales (or with 0 hides) only
// this overlay, and LIFT moves the quad toward the camera by that many node radii, so a mark in
// front of the node is not hidden by the node's own sphere depth.
const OVERLAY_VERTEX = `
#ifndef LAB_NODE_SCALE
float labNodeScale() { return 1.0; }
#endif
#ifndef LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) { return p; }
#endif
#ifndef OV_SCALE
float ovScale() { return 1.0; }
#endif
void main() {
    vec3 center = labNodeCenter(nodePos);
    float radius = nodeRadius * nodeSize * nodeInfo.w * labNodeScale();
    vec4 vc = view * vec4(center, 1.0);
    vec4 cc = projection * vc;
    float s = ovScale();
    vec2 corner = position.xy * quadScale;
    vec4 lifted = vc + vec4(corner * radius * s, -LIFT * radius, 0.0);
    gl_Position = projection * lifted;
    vUV = corner;
    vColor = nodeColor; vData = nodeData; vInfo = nodeInfo; vState = nodeState; vCustom = nodeCustom;
    vCenterView = vc.xyz; vCenterWorld = center; vRadius = radius * s;
    vPixelRadius = radius * s * projection[1][1] * resolution.y * 0.5 / max(cc.w, 1e-4);
}
`;

export interface OverlayOptions {
    name: string;
    fragment: string;
    /** Quad half-size in node radii. */
    quadScale: number;
    blend?: Blend;
    /** Node radii toward the camera (default 0). */
    lift?: number;
    /** The node layer's hooks (so the overlay follows the node), plus optional OV_SCALE. */
    vertexHooks?: string;
}

/**
 * Draw every node again, over the node layer, with its own fragment shader. It shares the node
 * layer's attribute arrays, so hover, selection, hop numbers and moved positions stay current.
 * @param ctx - the lab context from `setup`
 * @param o - the overlay's shaders
 * @returns the overlay layer
 */
export function addNodeOverlay(ctx: LabContext, o: OverlayOptions): LabLayer {
    const { nodes } = ctx;
    if (!nodes) {
        throw new Error("addNodeOverlay needs the node layer");
    }
    const b = nodes.buffers;
    const layer = ctx.addInstances({
        name: o.name,
        count: nodes.count,
        geometry: "quad",
        attributes: {
            nodePos: [3, b.nodePos],
            nodeColor: [4, b.nodeColor],
            nodeData: [4, b.nodeData],
            nodeInfo: [4, b.nodeInfo],
            nodeState: [4, b.nodeState],
            nodeCustom: [4, b.nodeCustom],
        },
        varyings: OVERLAY_VARYINGS,
        vertex: `const float quadScale = ${o.quadScale.toFixed(4)};\nconst float LIFT = ${(o.lift ?? 0).toFixed(4)};\n${o.vertexHooks ?? ""}\n${OVERLAY_VERTEX}`,
        fragment: o.fragment,
        blend: o.blend ?? "add",
    });
    layer.mesh.renderingGroupId = 1;
    // the harness rewrites nodeState and nodeInfo on hover and select; re-upload our views of them
    ctx.onFrame(() => {
        layer.update("nodeState");
        layer.update("nodeInfo");
    });
    return layer;
}

/** Fragment GLSL: key light, specular and rim on a view-space sphere normal (n.z < 0 faces us). */
export const SHADE = `
vec3 labShade(vec3 n, vec3 base) {
    vec3 L = normalize(vec3(-0.45, 0.6, -0.65));
    float diff = max(dot(n, L), 0.0);
    vec3 h = normalize(L + vec3(0.0, 0.0, -1.0));
    float spec = pow(max(dot(n, h), 0.0), 48.0);
    float rim = pow(1.0 + n.z, 3.0);
    return base * (0.22 + 0.78 * diff) + vec3(0.55) * spec + base * rim * 0.35;
}
`;

/**
 * Follow the selection: when it changes, write each edge's (source hop, target hop) into
 * edgeCustom slots `slot` and `slot + 1`, and each frame put the selected node's position on
 * screen (device pixels, bottom-left origin, -1 when none) into the `screenUniform` uniform.
 * @param ctx - the lab context
 * @param slot - first edgeCustom slot to write (0 or 2)
 * @param screenUniform - a vec2 story uniform to receive the screen position, or undefined
 * @returns a function giving the selected node index (-1 none)
 */
export function trackSelection(ctx: LabContext, slot = 0, screenUniform?: string): () => number {
    const { nodes, edges, graph } = ctx;
    let sig = NaN;
    let selected = -1;
    ctx.onFrame(() => {
        if (!nodes) {
            return;
        }
        const info = nodes.buffers.nodeInfo;
        let s = 0;
        let sel = -1;
        for (let i = 0; i < graph.n; i++) {
            const h = info[i * 4 + 2];
            s += (h + 1.5) * ((i % 97) + 1);
            if (h === 0) {
                sel = i;
            }
        }
        if (s !== sig) {
            sig = s;
            selected = sel;
            if (edges) {
                const c = edges.buffers.edgeCustom;
                for (let e = 0; e < graph.m; e++) {
                    c[e * 4 + slot] = info[graph.src[e] * 4 + 2];
                    c[e * 4 + slot + 1] = info[graph.dst[e] * 4 + 2];
                }
                edges.update("edgeCustom");
            }
        }
        if (screenUniform) {
            if (selected < 0) {
                ctx.set(screenUniform, [-1, -1]);
                return;
            }
            const p = nodes.buffers.nodePos;
            const w = ctx.engine.getRenderWidth();
            const h = ctx.engine.getRenderHeight();
            const v = Vector3.TransformCoordinates(
                new Vector3(p[selected * 3], p[selected * 3 + 1], p[selected * 3 + 2]),
                ctx.scene.getTransformMatrix(),
            );
            ctx.set(screenUniform, [(v.x * 0.5 + 0.5) * w, (v.y * 0.5 + 0.5) * h]);
        }
    });
    return () => selected;
}

/**
 * Index of the node with the highest PageRank, a good node to select on load.
 * @param ctx - the lab context
 * @returns the node index
 */
export function topNode(ctx: LabContext): number {
    let best = 0;
    for (let i = 1; i < ctx.graph.n; i++) {
        if (ctx.graph.rank[i] > ctx.graph.rank[best]) {
            best = i;
        }
    }
    return best;
}

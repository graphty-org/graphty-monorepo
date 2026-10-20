/**
 * Helpers shared by the time-driven status and event effect stories: a second node layer drawn
 * over the first (for glows, halos and HUD marks that need additive blending while the nodes
 * themselves stay opaque), and a little sphere lighting.
 */
import type { Blend, LabContext, LabLayer } from "../harness";

/** Node varyings, the same names the harness's node layer uses. */
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

// The harness's node vertex shader, plus one more hook: ovScale(pixelRadius) scales only this
// overlay's quad (0 hides the node here), so a mark can keep a minimum size on screen.
const OVERLAY_VERTEX = `
#ifndef LAB_NODE_SCALE
float labNodeScale() { return 1.0; }
#endif
#ifndef LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) { return p; }
#endif
#ifndef OV_SCALE
float ovScale(float pixelRadius) { return 1.0; }
#endif
void main() {
    vec3 center = labNodeCenter(nodePos);
    float radius = nodeRadius * nodeSize * nodeInfo.w * labNodeScale();
    vec4 vc = view * vec4(center, 1.0);
    vec4 cc = projection * vc;
    float pixR = radius * projection[1][1] * resolution.y * 0.5 / max(cc.w, 1e-4);
    float s = ovScale(pixR);
    vec2 corner = position.xy * quadScale;
    gl_Position = projection * (vc + vec4(corner * radius * s, 0.0, 0.0));
    vUV = corner;
    vColor = nodeColor; vData = nodeData; vInfo = nodeInfo; vState = nodeState; vCustom = nodeCustom;
    vCenterView = vc.xyz; vCenterWorld = center; vRadius = radius * s;
    vPixelRadius = pixR * s;
}
`;

export interface OverlayOptions {
    name: string;
    /** Fragment shader; the node varyings (vUV, vColor, vData, vInfo, vState, ...) are in scope. */
    fragment: string;
    /** Quad half-size in node radii. */
    quadScale: number;
    blend?: Blend;
    /**
     * GLSL before the vertex main: the node layer's LAB_NODE_SCALE / LAB_NODE_CENTER hooks (pass
     * the same text so the overlay follows the node), and OV_SCALE with
     * `float ovScale(float pixelRadius)` to scale or hide (0) this overlay only.
     */
    vertexHooks?: string;
}

/**
 * Draw every node a second time, over the node layer, with its own fragment shader. It shares the
 * node layer's attribute arrays, so hover, selection and hop numbers stay current.
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
        vertex: `const float quadScale = ${o.quadScale.toFixed(4)};\n${o.vertexHooks ?? ""}\n${OVERLAY_VERTEX}`,
        fragment: o.fragment,
        blend: o.blend ?? "add",
    });
    // after the opaque nodes, against their depth
    layer.mesh.renderingGroupId = 1;
    // the harness rewrites nodeState and nodeInfo on hover and select; re-upload our copies
    ctx.onFrame(() => {
        layer.update("nodeState");
        layer.update("nodeInfo");
    });
    return layer;
}

/** Fragment GLSL: simple key light, specular and rim on a view-space sphere normal. */
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

/** GLSL: a stable 0/1 flag per node index, `share` of the nodes get 1. */
export const NODE_FLAG = `
float nodeFlag(float i, float salt, float share) { return step(hash11(i * 0.6180339 + salt * 1.7313 + 0.5), share); }
`;

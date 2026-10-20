/**
 * 3D depth cues: a big 3D graph is hard to read because near and far nodes look alike. Four
 * switchable cues, each a full-screen pass over a depth image of the scene:
 * - fog: far things fade toward the fog color (1 - exp(-density * depth)), as air does
 * - desaturate: far things also lose color, which the eye reads as distance
 * - eye-dome lighting (EDL): a dark outline wherever depth jumps, from log-depth differences
 *   to neighbor pixels -- the trick point-cloud viewers use to make shape pop with no lights
 * - ambient occlusion (AO): crevices where nodes crowd together get darker
 * The `show` control displays the depth image or the occlusion alone, to see what each pass sees.
 *
 * The depth image comes from drawing the same nodes and edges again into a float texture, writing
 * each pixel's distance from the camera instead of its color.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addPass, liveArgs, offscreen, rgb } from "./common";

export default { title: "Shader Lab/Glow Bloom And Post/Depth Cues", ...labMeta };

const SHOW = ["final", "no cues", "depth", "occlusion", "outlines"] as const;

interface Args extends GraphArgs {
    show: (typeof SHOW)[number];
    fog: boolean;
    fogDensity: number;
    fogColor: string;
    desaturate: number;
    edl: boolean;
    edlStrength: number;
    edlRadius: number;
    ao: boolean;
    aoRadius: number;
    aoStrength: number;
}

const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    vec3 L = normalize(vec3(-0.5, 0.7, -0.6));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(L, n), labViewDir), 0.0), 40.0);
    vec3 c = vColor.rgb * (0.3 + 0.75 * diff) + vec3(0.6) * spec;
    c = mix(c, vec3(1.0), 0.45 * vState.x + 0.3 * vState.y);
    gl_FragColor = vec4(c, 1.0);
}
`;
// distance from the camera along the view axis; the sphere surface, not the quad
const NODE_DEPTH = `
void main() {
    vec3 n = labSphereNormal();
    float d = vCenterView.z + n.z * vRadius;
    gl_FragColor = vec4(d, d, 0.0, 1.0);
}
`;
const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT) * 0.85;
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.75);
}
`;
const EDGE_DEPTH = `
void main() {
    if (abs(vSide) > 0.9) discard;
    gl_FragColor = vec4(0.0, 1.0 / gl_FragCoord.w, 0.0, 1.0);
}
`;

const POST = `
// r: depth of nodes only (outlines and occlusion), g: depth of nodes and edges (fog)
float D(vec2 uv) { float d = texture2D(depthSampler, uv).r; return d > 0.0 ? d : 1e5; }
void main() {
    vec3 col = texture2D(textureSampler, vUV).rgb;
    float d = D(vUV);
    float dAll = texture2D(depthSampler, vUV).g;
    dAll = dAll > 0.0 ? dAll : 1e5;
    bool bg = d > 9e4;
    // an edge drawn in front of a node hides that node's depth (r is 0 there): give such pixels
    // no outline, or every edge crossing a cluster turns into a black scribble
    bool edgePx = bg && dAll < 9e4;
    vec2 px = 1.0 / resolution;
    if (show > 1.5 && show < 2.5) {
        float v = dAll > 9e4 ? 0.0 : 1.0 - clamp((dAll - near) / (far - near), 0.0, 1.0);
        gl_FragColor = vec4(viridis(v), 1.0);
        return;
    }
    // ---- eye-dome lighting: how much each neighbor is in front of this pixel, in log depth
    float edlShade = 1.0;
    if ((edl > 0.5 || show > 3.5) && !edgePx) {
        float ld = log2(min(d, 1e4));
        float resp = 0.0;
        const int EDL_TAPS = LAB_Q(4, 6, 8);
        for (int i = 0; i < EDL_TAPS; i++) {
            float a = float(i) * TAU / float(EDL_TAPS);
            vec2 o = vec2(cos(a), sin(a)) * edlRadius * pixelRatio * px;
            resp += max(0.0, ld - log2(min(D(vUV + o), 1e4)));
        }
        edlShade = exp(-resp / float(EDL_TAPS) * 25.0 * edlStrength);
    }
    // ---- ambient occlusion from depth alone: neighbors well in front of us within range
    float occ = 0.0;
    if ((ao > 0.5 || show > 2.5 && show < 3.5) && !bg) {
        float rpx = aoRadius * pixelRatio * 700.0 / max(d, 1.0);
        const int AO_TAPS = LAB_Q(6, 10, 16);
        for (int i = 0; i < AO_TAPS; i++) {
            float fi = float(i) * 16.0 / float(AO_TAPS);
            float r = sqrt((fi + 0.5) / 16.0) * rpx;
            float a = fi * 2.39996;
            float dn = D(vUV + vec2(cos(a), sin(a)) * r * px);
            float delta = d - dn;
            occ += step(0.15, delta) * smoothstep(aoRadius * 4.0, 0.0, delta);
        }
        occ = clamp(occ / float(AO_TAPS) * aoStrength * 1.6, 0.0, 0.9);
    }
    if (show > 2.5 && show < 3.5) { gl_FragColor = vec4(vec3(1.0 - occ), 1.0); return; }
    if (show > 3.5) { gl_FragColor = vec4(vec3(edlShade), 1.0); return; }
    if (show > 0.5) { gl_FragColor = vec4(col, 1.0); return; }
    if (ao > 0.5) col *= 1.0 - occ;
    if (edl > 0.5) col *= edlShade;
    if (dAll < 9e4) {
        float t = clamp((dAll - near) / (far - near), 0.0, 1.0);
        float f = fog > 0.5 ? 1.0 - exp(-fogDensity * 3.0 * t * t) : 0.0;
        col = mix(col, vec3(luminance(col)), clamp(desaturate * t * 1.3, 0.0, 1.0));
        col = mix(col, fogColor, f);
    }
    gl_FragColor = vec4(col, 1.0);
}
`;

const DEFAULTS: Args = {
    ...graphArgs,
    graph: "large",
    dim: 3,
    nodeSize: 1.3,
    edgeWidth: 1,
    show: "final",
    fog: true,
    fogDensity: 1,
    fogColor: "#141b29",
    desaturate: 0.7,
    edl: true,
    edlStrength: 0.8,
    edlRadius: 1.2,
    ao: true,
    aoRadius: 2,
    aoStrength: 1,
};
const live = liveArgs(DEFAULTS);

export const DepthCues = {
    args: DEFAULTS,
    argTypes: {
        ...graphArgTypes,
        show: { control: "inline-radio", options: SHOW },
        fog: { control: "boolean" },
        fogDensity: range(0, 4),
        fogColor: { control: "color" },
        desaturate: range(0, 1),
        edl: { control: "boolean" },
        edlStrength: range(0, 3),
        edlRadius: range(0.5, 4),
        ao: { control: "boolean" },
        aoRadius: range(0.5, 6),
        aoStrength: range(0, 2),
    },
    render: (args: Args) => {
        live.update(args);
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: args.fogColor,
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                if (!ctx.nodes || !ctx.edges) {
                    return;
                }
                const depth = offscreen(
                    ctx,
                    [
                        [ctx.edges, EDGE_FRAGMENT, EDGE_DEPTH],
                        [ctx.nodes, NODE_FRAGMENT, NODE_DEPTH],
                    ],
                    { float: true, clear: [0, 0, 0, 1] },
                );
                // the near and far ends of the graph from where the camera is now
                let near = 1;
                let far = 200;
                ctx.onFrame(() => {
                    const view = ctx.camera.getViewMatrix();
                    const { pos } = ctx.graph;
                    let lo = Infinity;
                    let hi = -Infinity;
                    for (let i = 0; i < ctx.graph.n; i += 3) {
                        const { m } = view;
                        const z = m[2] * pos[i * 3] + m[6] * pos[i * 3 + 1] + m[10] * pos[i * 3 + 2] + m[14];
                        lo = Math.min(lo, z);
                        hi = Math.max(hi, z);
                    }
                    near = Math.max(0.5, lo);
                    far = Math.max(near + 1, hi);
                });
                const a = (): Args => live.current;
                addPass(ctx, {
                    samples: 4,
                    fragment: POST,
                    samplers: { depthSampler: () => ({ texture: depth }) },
                    uniforms: {
                        near: () => near,
                        far: () => far,
                        show: () => SHOW.indexOf(a().show),
                        fog: () => (a().fog ? 1 : 0),
                        fogDensity: () => a().fogDensity,
                        fogColor: () => rgb(a().fogColor),
                        desaturate: () => a().desaturate,
                        edl: () => (a().edl ? 1 : 0),
                        edlStrength: () => a().edlStrength,
                        edlRadius: () => a().edlRadius,
                        ao: () => (a().ao ? 1 : 0),
                        aoRadius: () => a().aoRadius,
                        aoStrength: () => a().aoStrength,
                    },
                });
            },
        });
    },
};

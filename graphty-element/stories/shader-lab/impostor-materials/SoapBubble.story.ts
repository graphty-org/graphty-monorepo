/**
 * Soap bubble thin-film: a soap film is a few hundred nanometers thick, and light reflecting off
 * its front and back surfaces interferes, so each wavelength is brightened or cancelled by the
 * film's thickness. The shader computes that per color channel from a swirling, draining
 * thickness field, adds a fresnel-weighted reflection of the studio, and leaves the middle of
 * the bubble almost clear. "nodes" makes every node a bubble; "shields" draws one big bubble
 * around each community over small solid nodes, the way a group or a locked set could be shown.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabContext, labMeta, mountLab, range } from "../harness";
import { LIGHTING, SOFT_EDGE } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Soap Bubble", ...labMeta };

const MODES = ["nodes", "shields"] as const;

interface Args extends GraphArgs {
    mode: (typeof MODES)[number];
    thickness: number;
    turbulence: number;
    swirl: number;
    clarity: number;
    shine: number;
    edgeAlpha: number;
}

/** The bubble look, shared by the node layer and the community shields. */
const BUBBLE = `${LIGHTING}
vec4 bubbleShade(vec2 uv, float seed, float hot) {
    float r2 = dot(uv, uv);
    if (r2 > 1.0) discard;
    vec3 n = vec3(uv, -sqrt(1.0 - r2));
    vec3 rd = labEyeRay(n);
    float ndv = max(dot(n, -rd), 0.0);
    vec3 nw = labToWorld(n);
    // film thickness in nanometers: drains thinner toward the top, swirls with time
    vec3 q = nw * 1.6 + vec3(seed * 7.0, -time * 0.12 * swirl, seed * 3.0);
    q.xz += vec2(sin(time * 0.35 * swirl + q.y * 2.3), cos(time * 0.3 * swirl + q.y * 1.9)) * 0.5;
    float th = thickness * (0.55 + 0.45 * (0.5 - 0.5 * nw.y)) + (fbm(q * 1.7) - 0.5) * turbulence * 700.0;
    th = max(th, 0.0);
    float sinT2 = (1.0 - ndv * ndv) / (1.33 * 1.33);
    float opd = 2.0 * 1.33 * th * sqrt(1.0 - sinT2);
    vec3 film = 0.5 + 0.5 * cos(TAU * opd / vec3(650.0, 532.0, 450.0) + PI);
    film *= smoothstep(20.0, 120.0, th);                   // the thinnest film goes black
    vec3 env = labStudio(labToWorld(reflect(rd, n)));
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 3.0);
    vec3 c = film * (0.45 + env * 0.9) * (0.6 + 0.8 * fres) * shine;
    float a = clamp((1.0 - clarity) * 0.25 + fres * 0.85 + luminance(env * film) * 0.25, 0.0, 1.0);
    // a sharp window-like highlight and a soft one opposite, the classic bubble catchlights
    vec3 l = labLight();
    float spec = pow(max(dot(reflect(rd, n), l), 0.0), 400.0);
    float spec2 = pow(max(dot(reflect(rd, n), normalize(vec3(0.5, -0.4, -0.7))), 0.0), 80.0);
    c += vec3(3.0) * spec + vec3(0.6) * spec2;
    a = max(a, spec + spec2 * 0.5);
    // hovered or selected: a warm rim so the one bubble stands out of the crowd
    c = c * (1.0 + hot * 0.6) + vec3(1.0, 0.85, 0.5) * pow(1.0 - ndv, 2.0) * hot * 2.0;
    return vec4(c, clamp(max(a, pow(1.0 - ndv, 2.0) * hot) * (1.0 + hot * 0.4), 0.0, 1.0));
}
`;

const BUBBLE_NODE = `${BUBBLE}
void main() {
    vec4 b = bubbleShade(vUV, vInfo.x * 10.0, max(vState.x, vState.y));
    gl_FragColor = b;
}
`;

const SOLID_NODE = `${LIGHTING}
void main() {
    vec3 n = labSphereNormal();
    vec3 l = labLight();
    vec3 c = vColor.rgb * (0.25 + 0.8 * max(dot(n, l), 0.0)) + vec3(0.5) * pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, -1.0)), 0.0), 30.0);
    c = mix(c, c + vec3(0.3), max(vState.x, vState.y));
    gl_FragColor = vec4(c, 1.0);
}
`;

const SHIELD_VARYINGS = `
varying vec2 vUV;
varying vec3 vCenterView;
varying float vRadius;
varying float vSeed;
`;

const SHIELD_VERTEX = `
void main() {
    vec4 vc = view * vec4(shieldCenter, 1.0);
    gl_Position = projection * (vc + vec4(position.xy * shieldInfo.x, 0.0, 0.0));
    vUV = position.xy;
    vCenterView = vc.xyz;
    vRadius = shieldInfo.x;
    vSeed = shieldInfo.y;
}
`;

const SHIELD_FRAGMENT = `${BUBBLE}
void main() {
    gl_FragColor = bubbleShade(vUV, vSeed, 0.0);
}
`;

/**
 * One bubble per community: centered on the members' centroid, sized to hold most of them.
 * @param ctx - the lab
 */
function addShields(ctx: LabContext): void {
    const { graph } = ctx;
    const k = graph.communityCount;
    const center = new Float32Array(k * 3);
    const info = new Float32Array(k * 4);
    const counts = new Array<number>(k).fill(0);
    for (let i = 0; i < graph.n; i++) {
        const c = graph.community[i];
        counts[c]++;
        for (let d = 0; d < 3; d++) {
            center[c * 3 + d] += graph.pos[i * 3 + d];
        }
    }
    const dists: number[][] = Array.from({ length: k }, () => []);
    for (let c = 0; c < k; c++) {
        for (let d = 0; d < 3; d++) {
            center[c * 3 + d] /= Math.max(1, counts[c]);
        }
    }
    for (let i = 0; i < graph.n; i++) {
        const c = graph.community[i];
        dists[c].push(
            Math.hypot(
                graph.pos[i * 3] - center[c * 3],
                graph.pos[i * 3 + 1] - center[c * 3 + 1],
                graph.pos[i * 3 + 2] - center[c * 3 + 2],
            ),
        );
    }
    for (let c = 0; c < k; c++) {
        const sorted = dists[c].sort((a, b) => a - b);
        const r90 = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
        info.set([r90 + graph.nodeRadius * 3, c * 0.37 + 0.1, c, 0], c * 4);
    }
    const layer = ctx.addInstances({
        name: "shields",
        count: k,
        attributes: { shieldCenter: [3, center], shieldInfo: [4, info] },
        varyings: SHIELD_VARYINGS,
        vertex: SHIELD_VERTEX,
        fragment: SHIELD_FRAGMENT,
        blend: "alpha",
    });
    layer.mesh.renderingGroupId = 1;
}

export const SoapBubble = {
    args: {
        ...graphArgs,
        nodeSize: 1.4,
        mode: "shields",
        thickness: 520,
        turbulence: 0.6,
        swirl: 1,
        clarity: 0.75,
        shine: 1.2,
        edgeAlpha: 0.22,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        mode: { control: "inline-radio", options: MODES },
        thickness: range(100, 1200, 10),
        turbulence: range(0, 1.5),
        swirl: range(0, 4),
        clarity: range(0, 1),
        shine: range(0.2, 3),
        edgeAlpha: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.mode === "shields" ? args.nodeSize * 0.6 : args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#0a0c14",
            uniforms: {
                thickness: args.thickness,
                turbulence: args.turbulence,
                swirl: args.swirl,
                clarity: args.clarity,
                shine: args.shine,
                edgeAlpha: args.edgeAlpha,
            },
            nodeLayer: args.mode === "shields" ? { fragment: SOLID_NODE } : { fragment: BUBBLE_NODE, blend: "alpha" },
            edgeLayer: { fragment: SOFT_EDGE },
            rebuildOn: [args.mode],
            setup: (ctx) => {
                if (args.mode === "shields") {
                    addShields(ctx);
                }
            },
        }),
};

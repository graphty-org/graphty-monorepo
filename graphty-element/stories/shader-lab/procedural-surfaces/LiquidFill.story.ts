/**
 * Every node is a glass bulb filled with liquid up to a data attribute's level (value by
 * default), with graduation ticks at a quarter, a half and three quarters so the level reads like
 * a gauge. Nodes bob gently (a vertex hook moves them) and the liquid sloshes against the motion:
 * the surface tilts against the acceleration and waves grow with speed. Hover a bulb to shake it.
 * The liquid stays level with the world as the camera orbits.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { colorArg, encodeArgType, SURFACE_GLSL } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Liquid Fill", ...labMeta };

interface Args extends GraphArgs {
    encode: number;
    bob: number;
    bobSpeed: number;
    slosh: number;
    glass: number;
    ticks: boolean;
    useCommunity: boolean;
    liquidColor: string;
}

// the same motion in both stages: offset in node radii, per-node phase and frequency
const MOTION = `
float bobFreq(float rnd) { return bobSpeed * (1.4 + rnd); }
`;

const VERTEX_HOOKS = `${MOTION}
#define LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) {
    float ph = nodeInfo.x * TAU;
    float w = bobFreq(nodeInfo.x);
    float rad = nodeRadius * nodeSize * nodeInfo.w;
    return p + bob * rad * vec3(sin(time * w + ph), 0.35 * sin(time * w * 1.7 + ph * 2.0), 0.0);
}
`;

const NODE_FRAGMENT = `${SURFACE_GLSL}${MOTION}
void main() {
    vec3 n = labSphereNormal();
    float facing = -n.z;
    float r = length(vUV);
    // world up projected on screen, so the liquid stays level as the camera turns
    vec2 up = (view * vec4(0.0, 1.0, 0.0, 0.0)).xy;
    up = length(up) > 1e-3 ? normalize(up) : vec2(0.0, 1.0);
    vec2 q = vec2(dot(vUV, vec2(up.y, -up.x)), dot(vUV, up));

    const float inner = 0.88;
    float level = (pickData(encode) * 2.0 - 1.0) * inner;
    float ph = vInfo.x * TAU;
    float w = bobFreq(vInfo.x);
    float vel = bob * w * cos(time * w + ph);
    float acc = -bob * w * w * sin(time * w + ph);
    float shake = vState.x * exp(-(time - hoverTime) * 1.0);
    float amp = slosh * (0.015 + 0.02 * abs(vel) + 0.12 * shake);
    float surf = level - slosh * 0.045 * acc * q.x
               + amp * sin(q.x * 5.0 + time * 3.2 + ph)
               + amp * 0.6 * sin(q.x * 9.0 - time * 4.7 + ph * 2.0)
               + 0.1 * shake * sin(time * 9.0) * q.x;
    float dl = q.y - surf;
    float inGlass = fill(r - inner);
    float inLiquid = fill(dl) * inGlass;

    vec3 lc = useCommunity > 0.5 ? vColor.rgb : liquidColor;
    float depth = clamp((surf - q.y) / (2.0 * inner), 0.0, 1.0);
    vec3 liq = lc * (1.0 - 0.6 * depth);
    liq += lc * 0.25 * noise(q * 5.0 + vec2(time * 0.7, 0.0));
    // bubbles rising
    vec2 bv = voronoi(q * vec2(7.0, 5.0) + vec2(vInfo.x * 30.0, -time * 1.4));
    liq += vec3(0.9) * (1.0 - smoothstep(0.04, 0.08, bv.x)) * 0.35 * step(0.02, depth);
    liq *= 0.6 + 0.6 * lambert(n);
    // a lit band just under the surface and a bright meniscus line
    liq += mix(lc, vec3(1.0), 0.5) * 0.35 * exp(-abs(dl) * 18.0);
    vec3 meniscus = vec3(1.0) * stroke(dl, 0.018) * inGlass;

    vec3 empty = vec3(0.035, 0.05, 0.07) + lc * 0.04;
    vec3 col = mix(empty, liq, inLiquid) + meniscus * 0.8;
    // graduation ticks on the left side of the glass
    if (ticks > 0.5) {
        for (int k = 1; k <= 3; k++) {
            float ty = (float(k) * 0.5 - 1.0) * inner;
            float tick = stroke(q.y - ty, 0.012) * step(-inner * 0.98, q.x) * step(q.x, -inner * (k == 2 ? 0.55 : 0.7));
            col = mix(col, vec3(0.92), tick * 0.7 * inGlass);
        }
    }
    // the glass: a thick rim, fresnel and a window highlight
    float fres = pow(1.0 - facing, 2.5);
    col = mix(col, vec3(0.7, 0.85, 1.0), fres * glass * 0.85);
    col += vec3(0.6, 0.75, 0.9) * stroke(r - 0.94, 0.03) * glass * 0.35;
    col += vec3(1.0) * pow(specular(n, 70.0), 1.0) * glass * 1.2;
    col += vec3(1.0) * 0.25 * glass * (1.0 - smoothstep(0.0, 0.05, sdRoundBox(vUV - vec2(-0.32, 0.42), vec2(0.13, 0.05), 0.04)));
    col = mix(col, col + 0.15, vState.x * 0.5);
    col += vec3(1.0, 0.9, 0.5) * stroke(r - 0.985, 0.02) * vState.y;
    gl_FragColor = vec4(col, 1.0);
}
`;

export const LiquidFill = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 1.5,
        encode: 0,
        bob: 0.35,
        bobSpeed: 1,
        slosh: 1,
        glass: 0.7,
        ticks: true,
        useCommunity: true,
        liquidColor: "#2fb6ff",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        encode: encodeArgType,
        bob: range(0, 1.5),
        bobSpeed: range(0, 3),
        slosh: range(0, 3),
        glass: range(0, 1),
        ticks: { control: "boolean" },
        useCommunity: { control: "boolean" },
        liquidColor: colorArg,
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                encode: args.encode,
                bob: args.bob,
                bobSpeed: args.bobSpeed,
                slosh: args.slosh,
                glass: args.glass,
                ticks: args.ticks,
                useCommunity: args.useCommunity,
                liquidColor: args.liquidColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, vertexHooks: VERTEX_HOOKS },
        }),
};

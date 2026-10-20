/**
 * Turbulent uncertainty aura: a smoky halo around each node that churns harder, spreads wider and
 * flickers more the less certain the node is. A confident node sits in a thin, calm glow; a doubtful
 * one boils inside a restless cloud. The smoke is domain-warped fractal noise flowing outward from
 * the node, drawn additively on a quad several radii wide.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE } from "./shared";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Uncertainty Aura", ...labMeta };

const SOURCES = ["value", "rank", "random"] as const;

interface Args extends GraphArgs {
    uncertaintyFrom: (typeof SOURCES)[number];
    intensity: number;
    spread: number;
    turbulence: number;
    churn: number;
    auraColor: string;
    tint: number;
}

const NODE_FRAGMENT = `
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    float u = vCustom.x;
    vec3 c = labShade(n, vColor.rgb);
    // uncertain nodes are paler at the core
    c = mix(c, vec3(luminance(c)) * 1.1, u * 0.35);
    c = mix(c, vec3(1.0), 0.35 * vState.x + 0.5 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

const AURA_FRAGMENT = `
void main() {
    float u = vCustom.x;
    float r = length(vUV);
    float ang = atan(vUV.y, vUV.x);
    float seed = vInfo.x * 31.0;
    float sp = churn * (0.3 + 1.7 * u);
    // polar coordinates flowing outward, so smoke rises away from the node in every direction
    vec2 pol = vec2(ang * 1.2 + seed, r * 1.6 - time * sp);
    vec2 q2 = vUV * 1.4 + seed + vec2(0.0, time * sp * 0.4);
    // domain warp: noise displaces the lookup into more noise
    vec2 warp = vec2(fbm(q2), fbm(q2 + vec2(5.2, 1.3))) - 0.5;
    float smoke = fbm(vec3(pol * vec2(1.0, 1.0) + warp * turbulence * (0.6 + 2.4 * u), time * sp * 0.25 + seed));
    // the halo's reach: certain nodes hug the surface, uncertain ones spread out
    float k = mix(3.5, 0.7, u) / max(spread, 0.05);
    float halo = exp(-k * max(r - 1.0, 0.0));
    float wisps = smoothstep(0.35, 0.8, smoke + (1.0 - u) * 0.1);
    float a = halo * mix(0.55, 1.0, u) * mix(1.0, wisps * 1.8, 0.4 + 0.5 * u);
    // flicker for the least certain
    a *= 1.0 - u * 0.35 * (noise(vec2(time * 6.0, seed)) - 0.3);
    a *= smoothstep(0.85, 1.0, r) * smoothstep(QUAD, QUAD * 0.7, r);
    vec3 col = mix(auraColor, vColor.rgb, tint);
    col = mix(col, col * vec3(0.8, 0.85, 1.2), u * 0.3) + vec3(0.25) * wisps * u;
    a *= intensity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(col * a, a);
}
`;

function uncertainty(kind: Args["uncertaintyFrom"], v: number, rank: number, random: number): number {
    if (kind === "rank") {
        return 1 - Math.sqrt(rank);
    }
    return kind === "random" ? random : v;
}

const QUAD = 4;

export const UncertaintyAura = {
    args: {
        ...graphArgs,
        nodeSize: 0.8,
        edgeWidth: 1,
        uncertaintyFrom: "random",
        intensity: 1.3,
        spread: 1.4,
        turbulence: 1.2,
        churn: 0.8,
        auraColor: "#9fb8ff",
        tint: 0.55,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        uncertaintyFrom: { control: "select", options: SOURCES },
        intensity: range(0, 2),
        spread: range(0.2, 2.5),
        turbulence: range(0, 3),
        churn: range(0, 3),
        auraColor: { control: "color" },
        tint: range(0, 1),
    },
    render: (args: Args) => {
        const from = args.uncertaintyFrom;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#07080e",
            uniforms: {
                intensity: args.intensity,
                spread: args.spread,
                turbulence: args.turbulence,
                churn: args.churn,
                auraColor: args.auraColor,
                tint: args.tint,
            },
            nodeLayer: {
                fragment: NODE_FRAGMENT,
                custom: (i, g) => [uncertainty(from, g.value[i], g.rank[i], g.random[i]), 0, 0, 0],
            },
            rebuildOn: [from],
            setup: (ctx) => {
                addNodeOverlay(ctx, {
                    name: "aura",
                    fragment: `const float QUAD = ${QUAD.toFixed(1)};\n${AURA_FRAGMENT}`,
                    quadScale: QUAD,
                });
            },
        });
    },
};

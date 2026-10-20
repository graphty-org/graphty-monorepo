/**
 * Pinned nodes freeze. Pinning a node starts a frost front at its rim that creeps inward along
 * crystal facets until the node is iced over; unpinning thaws it from the center out. Click a node
 * to pin or unpin it. Some nodes start pinned at different times, and "autoCycle" keeps pinning
 * and unpinning random nodes so the growth is always visible somewhere.
 *
 * Per node: state.z = the time of the last pin or unpin, state.w = pinned, custom.x = how frozen
 * the node was when it was unpinned (where the thaw starts from).
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabContext, labMeta, mountLab, range } from "../harness";
import { colorArg, hint, onNodeClick, SURFACE_GLSL } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Frost Pinned", ...labMeta };

interface Args extends GraphArgs {
    growSpeed: number;
    thawSpeed: number;
    crystalScale: number;
    sparkle: number;
    frostColor: string;
    pinnedShare: number;
    autoCycle: boolean;
}

const NODE_FRAGMENT = `${SURFACE_GLSL}
float frostAmount() {
    float since = time - vState.z;
    float f = vState.w > 0.5 ? since * growSpeed : vCustom.x - since * thawSpeed;
    return clamp(f, 0.0, 1.5);
}
void main() {
    vec3 n = labSphereNormal();
    float facing = -n.z;
    float r = length(vUV);
    float f = frostAmount();

    vec3 base = vColor.rgb * (0.22 + 0.9 * lambert(n)) + vec3(1.0) * specular(n, 60.0) * 0.6;

    // the front: frost covers points where f has passed 1 - r, made jagged by crystal cells
    vec2 uv = vUV * crystalScale + vInfo.x * 31.0;
    vec2 v = voronoi(uv);
    float facet = v.y - v.x;
    float fern = fbm(vUV * crystalScale * 0.5 + vInfo.x * 7.0);
    float front = (1.0 - r) + facet * 0.25 + fern * 0.3;
    float mask = smoothstep(front - 0.025, front + 0.025, f);
    float band = exp(-abs(f - front) * 25.0) * step(0.001, f) * (1.0 - step(1.45, f));

    // ice: faceted cells, bright crystal edges, feathery dendrites, a bluish fresnel
    // translucent blue ice over the node's own color, with each facet tilted to catch the light
    float tilt = hash12(floor(vUV * crystalScale * 0.5 + vInfo.x * 9.0) + floor(v.x * 3.0));
    float lines = 1.0 - smoothstep(0.0, 0.03, facet);
    float dend = pow(1.0 - abs(noise(vUV * crystalScale * 0.9 + 3.0) * 2.0 - 1.0), 12.0);
    vec3 deep = mix(vColor.rgb * 0.35, vec3(0.12, 0.3, 0.55), 0.7);
    vec3 ice = mix(deep, frostColor, 0.35 + 0.45 * lambert(n) + 0.2 * tilt);
    ice += vec3(0.85, 0.95, 1.0) * (lines * 0.7 + dend * 0.45);
    ice += vec3(1.0) * specular(n, 40.0) * 0.5;
    ice += vec3(0.45, 0.75, 1.0) * pow(1.0 - facing, 2.0) * 0.8;
    float glint = step(0.992, hash12(floor(vUV * 40.0) + floor(time * 5.0 + vInfo.x * 10.0)));
    ice += vec3(1.6) * glint * sparkle * mask;

    // thaw: a wet, darker sheen where frost is melting back
    float thawing = 1.0 - vState.w;
    vec3 wet = mix(base, vec3(0.6, 0.75, 0.85), 0.25) + specular(n, 120.0) * 0.8;
    vec3 col = mix(base, wet, thawing * smoothstep(0.0, 0.2, vCustom.x - (time - vState.z) * thawSpeed + 0.2) * (1.0 - mask));
    col = mix(col, ice, mask * 0.94);
    col += vec3(0.75, 0.92, 1.0) * band * 0.6 * vState.w;
    col = mix(col, col + 0.2, vState.x * 0.6);
    col += vec3(1.0) * stroke(r - 0.96, 0.03) * vState.y;
    gl_FragColor = vec4(col, 1.0);
}
`;

function setupFrost(ctx: LabContext, args: Args): () => void {
    const { nodes, graph } = ctx;
    if (!nodes) {
        return () => undefined;
    }
    const state = nodes.buffers.nodeState;
    const custom = nodes.buffers.nodeCustom;
    const frozenNow = (i: number): number => {
        const since = ctx.time - state[i * 4 + 2];
        const f = state[i * 4 + 3] > 0.5 ? since * args.growSpeed : custom[i * 4] - since * args.thawSpeed;
        return Math.min(1.5, Math.max(0, f));
    };
    const toggle = (i: number): void => {
        custom[i * 4] = frozenNow(i);
        state[i * 4 + 3] = state[i * 4 + 3] > 0.5 ? 0 : 1;
        state[i * 4 + 2] = ctx.time;
        nodes.update("nodeState");
        nodes.update("nodeCustom");
    };
    // start some nodes pinned, at staggered past times so every stage shows
    for (let i = 0; i < graph.n; i++) {
        if (graph.random[i] < args.pinnedShare) {
            state[i * 4 + 3] = 1;
            state[i * 4 + 2] = -2 + (graph.random[i] / Math.max(args.pinnedShare, 1e-3)) * 12;
        }
    }
    nodes.update("nodeState");
    let next = 0.5;
    ctx.onFrame((t) => {
        if (args.autoCycle && t > next) {
            next = t + 0.6;
            toggle(Math.floor(Math.random() * graph.n));
        }
    });
    hint(ctx, "click a node to pin or unpin it");
    return onNodeClick(ctx, toggle);
}

export const FrostPinned = {
    args: {
        ...graphArgs,
        growSpeed: 0.25,
        thawSpeed: 0.7,
        crystalScale: 5,
        sparkle: 0.8,
        frostColor: "#d8f2ff",
        pinnedShare: 0.25,
        autoCycle: true,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        growSpeed: range(0.05, 1.5),
        thawSpeed: range(0.05, 3),
        crystalScale: range(3, 24, 0.5),
        sparkle: range(0, 1),
        frostColor: colorArg,
        pinnedShare: range(0, 1),
        autoCycle: { control: "boolean" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                growSpeed: args.growSpeed,
                thawSpeed: args.thawSpeed,
                crystalScale: args.crystalScale,
                sparkle: args.sparkle,
                frostColor: args.frostColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            rebuildOn: [args.pinnedShare, args.autoCycle, args.growSpeed, args.thawSpeed],
            setup: (ctx) => setupFrost(ctx, args),
        }),
};

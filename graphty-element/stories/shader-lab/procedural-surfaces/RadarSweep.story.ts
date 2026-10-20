/**
 * Every node is a radar scope. A phosphor sweep turns over range rings, and blips light up at the
 * on-screen directions of the node's (up to) four highest-degree neighbors as the beam passes,
 * then fade; a blip's distance from the center is that neighbor's relative distance on screen.
 * The scope doubles as a busy indicator: a node "computing" turns amber, sweeps fast and spins a
 * rim arc, and flashes green with an expanding ring when it finishes. Click a node to run a
 * pretend computation on it; "autoBusy" keeps a few running at random.
 *
 * Per node: state.w = busy, state.z = when the last computation started or finished.
 */
import { type GraphArgs, graphArgs, graphArgTypes, type LabContext, labMeta, mountLab, range } from "../harness";
import { colorArg, hint, onNodeClick, SURFACE_GLSL, trackNeighborAngles } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Radar Sweep", ...labMeta };

interface Args extends GraphArgs {
    sweepSpeed: number;
    trail: number;
    rings: number;
    blipSize: number;
    phosphor: string;
    busyColor: string;
    autoBusy: boolean;
}

const NODE_FRAGMENT = `${SURFACE_GLSL}
void main() {
    vec3 n = labSphereNormal();
    float r = length(vUV);
    float ang = atan(vUV.y, vUV.x);
    float busy = vState.w;
    float stamp = vState.z;
    float spd = busy > 0.5 ? sweepSpeed * 4.0 : sweepSpeed;
    vec3 tint = busy > 0.5 ? busyColor : phosphor;

    // clockwise sweep; "behind" is how far (radians) the beam has moved past this angle
    float sweep = -time * spd + vInfo.x * TAU;
    float behind = mod(ang - sweep, TAU);
    float beam = exp(-behind * trail);
    float edgeLine = exp(-behind * r * 70.0) * smoothstep(0.02, 0.1, r);

    float aa = fwidth(r) * 1.2;
    float dRing = abs(fract(r * rings + 0.5) - 0.5) / rings;
    float ringLine = 1.0 - smoothstep(0.0, aa, dRing);
    float crossLine = 1.0 - smoothstep(0.0, aa, min(abs(vUV.x), abs(vUV.y)));

    float blip = 0.0;
    for (int k = 0; k < 4; k++) {
        float v = vCustom[k];
        if (v < 0.0) continue;
        vec2 nb = unpackNeighbor(v);
        float br = mix(0.3, 0.85, nb.y);
        vec2 bp = br * vec2(cos(nb.x), sin(nb.x));
        float since = mod(nb.x - sweep, TAU);
        float lit = exp(-since * 0.9);
        float dotShape = exp(-dot(vUV - bp, vUV - bp) / (blipSize * blipSize));
        blip += dotShape * (0.2 + 1.6 * lit);
    }

    float grain = hash12(gl_FragCoord.xy + floor(time * 30.0)) * 0.05;
    vec3 col = tint * (0.05 + grain + 0.4 * beam + 0.9 * edgeLine + 0.22 * ringLine + 0.12 * crossLine);
    col += tint * blip + vec3(1.0) * blip * 0.25;

    // busy: a spinning arc on the rim
    float rimArc = stroke(r - 0.9, 0.03) * step(mod(ang + time * 7.0, TAU), 1.9);
    col += busyColor * rimArc * busy * 1.4;
    // done: a green flash and a ring expanding past the rim
    float dt = time - stamp;
    if (busy < 0.5 && stamp > 0.0 && dt < 1.6) {
        col += vec3(0.5, 1.0, 0.6) * (exp(-dt * 4.0) * 0.8 + stroke(r - dt * 1.2, 0.04) * exp(-dt * 2.0) * 1.5);
    }
    // bezel and a glass dome highlight
    float bez = smoothstep(0.93, 0.95, r);
    col = mix(col, vec3(0.13, 0.15, 0.14) * (0.5 + 0.8 * lambert(n)), bez);
    col += vec3(1.0) * specular(n, 140.0) * 0.3;
    col = mix(col, col * 1.3 + 0.05, vState.x * 0.6);
    col += vec3(1.0) * stroke(r - 0.975, 0.02) * vState.y;
    gl_FragColor = vec4(col, 1.0);
}
`;

function setupBusy(ctx: LabContext, args: Args): () => void {
    trackNeighborAngles(ctx);
    const { nodes, graph } = ctx;
    if (!nodes) {
        return () => undefined;
    }
    const state = nodes.buffers.nodeState;
    const ends = new Float32Array(graph.n);
    const start = (i: number, seconds: number): void => {
        if (state[i * 4 + 3] > 0.5) {
            return;
        }
        state[i * 4 + 3] = 1;
        state[i * 4 + 2] = ctx.time;
        ends[i] = ctx.time + seconds;
        nodes.update("nodeState");
    };
    ctx.onFrame((t, dt) => {
        let changed = false;
        for (let i = 0; i < graph.n; i++) {
            if (state[i * 4 + 3] > 0.5 && t > ends[i]) {
                state[i * 4 + 3] = 0;
                state[i * 4 + 2] = t;
                changed = true;
            }
        }
        if (changed) {
            nodes.update("nodeState");
        }
        // about one new computation per second for every 60 nodes
        if (args.autoBusy && Math.random() < dt * (graph.n / 60)) {
            start(Math.floor(Math.random() * graph.n), 1.5 + Math.random() * 3);
        }
    });
    hint(ctx, "click a node to run a computation on it");
    return onNodeClick(ctx, (i) => {
        start(i, 2.5);
    });
}

export const RadarSweep = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 1.6,
        edgeWidth: 1,
        sweepSpeed: 1.4,
        trail: 3,
        rings: 3,
        blipSize: 0.07,
        phosphor: "#3dff8a",
        busyColor: "#ffae1a",
        autoBusy: true,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        sweepSpeed: range(0, 5),
        trail: range(0.5, 12),
        rings: range(1, 8, 1),
        blipSize: range(0.02, 0.2),
        phosphor: colorArg,
        busyColor: colorArg,
        autoBusy: { control: "boolean" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#020604",
            uniforms: {
                sweepSpeed: args.sweepSpeed,
                trail: args.trail,
                rings: args.rings,
                blipSize: args.blipSize,
                phosphor: args.phosphor,
                busyColor: args.busyColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            rebuildOn: [args.autoBusy],
            setup: (ctx) => setupBusy(ctx, args),
        }),
};

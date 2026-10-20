/**
 * Light trails during layout: the nodes are scattered and a live ForceAtlas2 simulation pulls
 * them into place, and every node leaves a fading streak of light, like a long exposure of
 * fireflies. The streaks show how the layout moved: communities condense out of the cloud,
 * bridges stretch, outliers drift in last. Color the streaks by community or by speed. The
 * layout replays on a loop.
 *
 * Each frame the nodes are drawn as soft dots into a buffer, and a pass adds that buffer to the
 * previous frame's accumulation multiplied by a decay factor (two buffers, ping-pong).
 */
import { fromEdgeArrays } from "@graphty/graph-format";
import { createSimulation, type LayoutSimulation } from "@graphty/layout";

import { communityColor, type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import {
    autoRender,
    effectRenderer,
    everyFrame,
    makePass,
    makeTarget,
    PingPong,
    screenBackground,
    splat,
} from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Layout Trails", ...labMeta };

const COLORS = ["community", "speed", "white"] as const;

interface Args extends GraphArgs {
    color: (typeof COLORS)[number];
    persistence: number;
    trailBrightness: number;
    dotSize: number;
    iterationsPerFrame: number;
    loopSeconds: number;
    /** How fast the drawn nodes follow the simulation (per second); high = raw, jittery motion. */
    smoothing: number;
}

const SCALE = 1;

// Each node is drawn as a capsule from where it was last frame to where it is now, so the trail
// is continuous however far a node jumps between frames.
const STREAK_VERTEX = `
void main() {
    vec4 a = view * vec4(nodePrev, 1.0);
    vec4 b = view * vec4(nodePos, 1.0);
    float r = nodeRadius * dotSize * nodeInfo.y;
    vec2 d = b.xy - a.xy;
    float len = length(d);
    vec2 ax = len > 1e-5 ? d / len : vec2(1.0, 0.0);
    vec2 ay = vec2(-ax.y, ax.x);
    vec2 local = position.xy * vec2(len * 0.5 + r, r);
    vec3 c = 0.5 * (a.xyz + b.xyz) + vec3(ax * local.x + ay * local.y, 0.0);
    gl_Position = projection * vec4(c, 1.0);
    vLocal = local; vHalf = len * 0.5; vR = r;
    vColor = nodeColor; vSpeed = nodeInfo.x;
}
`;

const STREAK = `
void main() {
    float d = sdSegment(vLocal, vec2(-vHalf, 0.0), vec2(vHalf, 0.0)) / vR;
    if (d > 1.0) discard;
    float k = exp(-d * d * 4.0);
    vec3 c = vColor.rgb;
    if (colorMode > 0.5 && colorMode < 1.5) c = blackbody(0.25 + 0.8 * vSpeed);
    else if (colorMode > 1.5) c = vec3(0.85, 0.9, 1.0);
    // a moving node is brighter, so the streak shows the motion
    gl_FragColor = vec4(c * k * (0.35 + 1.2 * vSpeed), k);
}
`;

const ACCUMULATE = `
uniform sampler2D prev;
uniform sampler2D frame;
uniform float decay;
void main() {
    gl_FragColor = texture2D(prev, vUV) * decay + texture2D(frame, vUV);
}
`;

const BACKGROUND = `
uniform sampler2D trails;
void main() {
    vec3 acc = texture2D(trails, vUV).rgb * trailBrightness;
    vec3 c = vec3(1.0) - exp(-acc * 1.5);
    gl_FragColor = vec4(vec3(0.015, 0.018, 0.03) + c, 1.0);
}
`;

const NODE = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = mix(vColor.rgb, vec3(1.0), 0.55 + 0.3 * vState.x);
    gl_FragColor = vec4(c, a);
}
`;

const EDGE = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    gl_FragColor = vec4(c, labEdgeCoverage() * edgeAlpha);
}
`;

export const LayoutTrails = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 0.5,
        edgeWidth: 1,
        color: "community",
        persistence: 0.94,
        trailBrightness: 1,
        dotSize: 1,
        iterationsPerFrame: 1,
        loopSeconds: 9,
        smoothing: 6,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        color: { control: "inline-radio", options: COLORS },
        persistence: range(0.5, 0.995, 0.005),
        trailBrightness: range(0.1, 4),
        dotSize: range(0.5, 4),
        iterationsPerFrame: range(1, 6, 1),
        loopSeconds: range(3, 30, 1),
        smoothing: range(1, 60, 1),
    },
    render: (args: Args) => {
        const live = { iterations: args.iterationsPerFrame, loop: args.loopSeconds, persistence: args.persistence };
        const { smoothing } = args;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#04050a",
            uniforms: {
                colorMode: COLORS.indexOf(args.color),
                trailBrightness: args.trailBrightness,
                dotSize: args.dotSize,
                edgeAlpha: 0.25,
            },
            rebuildOn: [args.iterationsPerFrame, args.loopSeconds, args.persistence, args.smoothing],
            nodeLayer: { fragment: NODE },
            edgeLayer: { fragment: EDGE },
            setup: (ctx) => {
                const g = ctx.graph;
                const { nodes } = ctx;
                const { edges } = ctx;
                if (!nodes) {
                    return undefined;
                }
                const shown = nodes.buffers.nodePos;
                const sim = new Float32Array(g.n * 3);
                const prev = new Float32Array(g.n * 3);
                const snapshot = fromEdgeArrays({
                    directed: false,
                    nodeCount: g.n,
                    src: Uint32Array.from(g.src),
                    dst: Uint32Array.from(g.dst),
                });

                const frame = makeTarget(ctx, "trail-frame", { size: SCALE, type: "half" });
                const colors = new Float32Array(g.n * 4);
                const info = new Float32Array(g.n * 4);
                for (let i = 0; i < g.n; i++) {
                    colors.set([...communityColor(g.community[i]), 1], i * 4);
                    info[i * 4 + 1] = 0.75 + 0.75 * Math.sqrt(g.degree[i]);
                }
                const splatLayer = splat(ctx, [frame], {
                    name: "trail-streaks",
                    count: g.n,
                    attributes: {
                        nodePos: [3, shown],
                        nodePrev: [3, prev],
                        nodeColor: [4, colors],
                        nodeInfo: [4, info],
                    },
                    varyings:
                        "varying vec2 vLocal;\nvarying float vHalf;\nvarying float vR;\nvarying vec4 vColor;\nvarying float vSpeed;",
                    vertex: STREAK_VERTEX,
                    fragment: STREAK,
                    blend: "add",
                });
                autoRender(ctx, frame);
                const acc = new PingPong(ctx, "trail-acc", { size: SCALE, type: "half" });
                const renderer = effectRenderer(ctx);
                const pass = makePass(ctx, renderer, "accumulate", ACCUMULATE, ["decay"], ["prev", "frame"]);
                const bg = screenBackground(ctx, BACKGROUND, { trails: acc.src });

                let layout: LayoutSimulation | undefined;
                let started = 0;
                let fit = 1;
                // a restart teleports every node; that jump must not draw a streak across the screen
                let jumped = true;
                const scatter = (): void => {
                    layout?.dispose();
                    for (let i = 0; i < g.n; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const r = Math.sqrt(Math.random()) * 1.2;
                        sim[i * 3] = Math.cos(a) * r;
                        sim[i * 3 + 1] = Math.sin(a) * r;
                        sim[i * 3 + 2] = g.dim === 3 ? (Math.random() - 0.5) * 2 : 0;
                    }
                    layout = createSimulation("forceatlas2", { dim: g.dim, scale: 1, seed: 1, maxIter: 100000 });
                    layout.load(snapshot, sim);
                    started = ctx.time;
                    fit = 0;
                    jumped = true;
                };
                scatter();

                const updatePositions = (dt: number): void => {
                    // scale the simulation to the lab's ~50-unit radius, eased so the frame follows it
                    let sum = 0;
                    for (let i = 0; i < g.n; i++) {
                        sum += sim[i * 3] ** 2 + sim[i * 3 + 1] ** 2 + sim[i * 3 + 2] ** 2;
                    }
                    const target = 24 / Math.max(1e-6, Math.sqrt(sum / g.n));
                    fit = fit === 0 ? target : fit + (target - fit) * Math.min(1, dt * 3);
                    prev.set(shown);
                    let maxSpeed = 1e-6;
                    const speed = new Float32Array(g.n);
                    // ease the drawn position toward the simulation's: ForceAtlas2 nodes jitter
                    // from step to step, and raw positions draw zigzag scribbles instead of streaks
                    const ease = jumped ? 1 : Math.min(1, dt * smoothing);
                    for (let i = 0; i < g.n; i++) {
                        for (let k = 0; k < 3; k++) {
                            shown[i * 3 + k] += (sim[i * 3 + k] * fit - shown[i * 3 + k]) * ease;
                        }
                        speed[i] = Math.hypot(
                            shown[i * 3] - prev[i * 3],
                            shown[i * 3 + 1] - prev[i * 3 + 1],
                            shown[i * 3 + 2] - prev[i * 3 + 2],
                        );
                        maxSpeed = Math.max(maxSpeed, speed[i]);
                    }
                    if (jumped) {
                        prev.set(shown);
                        speed.fill(0);
                        jumped = false;
                    }
                    for (let i = 0; i < g.n; i++) {
                        info[i * 4] = Math.min(1, speed[i] / 1.5);
                    }
                    nodes.update("nodePos");
                    splatLayer.update();
                    if (edges) {
                        const ea = edges.buffers.edgeA;
                        const eb = edges.buffers.edgeB;
                        for (let e = 0; e < g.m; e++) {
                            ea.set(shown.subarray(g.src[e] * 3, g.src[e] * 3 + 3), e * 3);
                            eb.set(shown.subarray(g.dst[e] * 3, g.dst[e] * 3 + 3), e * 3);
                        }
                        edges.update("edgeA");
                        edges.update("edgeB");
                    }
                };

                ctx.onFrame((time, dt) => {
                    if (time - started > live.loop) {
                        scatter();
                    }
                    void layout?.step(live.iterations);
                    updatePositions(dt);
                });

                const stop = everyFrame(ctx, (_t, dt) => {
                    if (!pass.ready()) {
                        return;
                    }
                    const decay = Math.pow(live.persistence, dt * 60);
                    pass.run(acc.dst, { prev: acc.src, frame, decay });
                    acc.swap();
                    bg.material.setTexture("trails", acc.src);
                });
                return () => {
                    stop();
                    layout?.dispose();
                };
            },
        });
    },
};

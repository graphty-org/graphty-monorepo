/**
 * Fluid ink stirred by dragging: the graph floats on a sheet of liquid, and each node slowly
 * bleeds ink of its community's color into it. Drag a node and it stirs the liquid: the ink
 * swirls, curls into eddies and marbles the colors together, like Japanese suminagashi paper
 * marbling. With "auto stir" a few hub nodes paddle in small circles on their own, so the
 * picture keeps moving.
 *
 * The liquid is a real 2D fluid simulation ("stable fluids", Jos Stam) on a grid of float
 * textures: each frame passes advect the velocity and the ink along the flow, add the stirring
 * forces, boost small swirls (vorticity confinement), and solve for pressure (20 Jacobi passes)
 * so the liquid stays incompressible.
 */
import { Matrix } from "@babylonjs/core";

import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import {
    autoRender,
    boundsUniforms,
    effectRenderer,
    everyFrame,
    graphBounds,
    makePass,
    makeTarget,
    nodeSplat,
    type Pass,
    PingPong,
    worldBackground,
} from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Fluid Ink", ...labMeta };

const STYLES = ["marbled paper", "glowing ink"] as const;

interface Args extends GraphArgs {
    style: (typeof STYLES)[number];
    autoStir: number;
    stirForce: number;
    inkRadius: number;
    seep: number;
    swirl: number;
    inkFade: number;
    resolution: number;
}

const ADVECT = `
uniform sampler2D velocity;
uniform sampler2D src;
uniform float dt;
uniform float dissipation;
void main() {
    vec2 coord = vUV - dt * texture2D(velocity, vUV).xy;
    gl_FragColor = texture2D(src, coord) * dissipation;
}
`;

// add a Gaussian blob of `value` at `point` (both in grid uv)
const SPLAT = `
uniform sampler2D src;
uniform vec2 point;
uniform vec4 value;
uniform float radius;
void main() {
    vec2 d = vUV - point;
    gl_FragColor = texture2D(src, vUV) + value * exp(-dot(d, d) / radius);
}
`;

// ink seeps from every node: add the node source texture
const SEEP = `
uniform sampler2D src;
uniform sampler2D source;
uniform float amount;
void main() {
    vec4 s = texture2D(source, vUV);
    vec4 d = texture2D(src, vUV);
    // fill toward the source instead of piling up forever
    gl_FragColor = d + s * amount * max(0.0, 1.5 - d.a);
}
`;

const CURL = `
uniform sampler2D velocity;
uniform vec2 texel;
void main() {
    float l = texture2D(velocity, vUV - vec2(texel.x, 0.0)).y;
    float r = texture2D(velocity, vUV + vec2(texel.x, 0.0)).y;
    float b = texture2D(velocity, vUV - vec2(0.0, texel.y)).x;
    float t = texture2D(velocity, vUV + vec2(0.0, texel.y)).x;
    gl_FragColor = vec4(0.5 * ((r - l) - (t - b)) / texel.x, 0.0, 0.0, 1.0);
}
`;

const VORTICITY = `
uniform sampler2D velocity;
uniform sampler2D curl;
uniform vec2 texel;
uniform float strength;
uniform float dt;
void main() {
    float l = texture2D(curl, vUV - vec2(texel.x, 0.0)).x;
    float r = texture2D(curl, vUV + vec2(texel.x, 0.0)).x;
    float b = texture2D(curl, vUV - vec2(0.0, texel.y)).x;
    float t = texture2D(curl, vUV + vec2(0.0, texel.y)).x;
    float c = texture2D(curl, vUV).x;
    vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
    force /= length(force) + 1e-4;
    force *= strength * c * vec2(1.0, -1.0) * texel.x;
    vec2 vel = texture2D(velocity, vUV).xy + force * dt;
    gl_FragColor = vec4(clamp(vel, -2.0, 2.0), 0.0, 1.0);
}
`;

const DIVERGENCE = `
uniform sampler2D velocity;
uniform vec2 texel;
void main() {
    float l = texture2D(velocity, vUV - vec2(texel.x, 0.0)).x;
    float r = texture2D(velocity, vUV + vec2(texel.x, 0.0)).x;
    float b = texture2D(velocity, vUV - vec2(0.0, texel.y)).y;
    float t = texture2D(velocity, vUV + vec2(0.0, texel.y)).y;
    // solid walls: the flow does not leave the sheet
    if (vUV.x - texel.x < 0.0) l = -texture2D(velocity, vUV).x;
    if (vUV.x + texel.x > 1.0) r = -texture2D(velocity, vUV).x;
    if (vUV.y - texel.y < 0.0) b = -texture2D(velocity, vUV).y;
    if (vUV.y + texel.y > 1.0) t = -texture2D(velocity, vUV).y;
    gl_FragColor = vec4(0.5 * (r - l + t - b) / texel.x, 0.0, 0.0, 1.0);
}
`;

const PRESSURE = `
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 texel;
void main() {
    float l = texture2D(pressure, vUV - vec2(texel.x, 0.0)).x;
    float r = texture2D(pressure, vUV + vec2(texel.x, 0.0)).x;
    float b = texture2D(pressure, vUV - vec2(0.0, texel.y)).x;
    float t = texture2D(pressure, vUV + vec2(0.0, texel.y)).x;
    float div = texture2D(divergence, vUV).x;
    gl_FragColor = vec4((l + r + b + t - div * texel.x * texel.x) * 0.25, 0.0, 0.0, 1.0);
}
`;

const GRADIENT = `
uniform sampler2D pressure;
uniform sampler2D velocity;
uniform vec2 texel;
void main() {
    float l = texture2D(pressure, vUV - vec2(texel.x, 0.0)).x;
    float r = texture2D(pressure, vUV + vec2(texel.x, 0.0)).x;
    float b = texture2D(pressure, vUV - vec2(0.0, texel.y)).x;
    float t = texture2D(pressure, vUV + vec2(0.0, texel.y)).x;
    vec2 vel = texture2D(velocity, vUV).xy - 0.5 * vec2(r - l, t - b) / texel.x;
    gl_FragColor = vec4(vel, 0.0, 1.0);
}
`;

const SCALE_PRESSURE = `
uniform sampler2D src;
uniform float k;
void main() { gl_FragColor = texture2D(src, vUV) * k; }
`;

const BACKGROUND = `
uniform sampler2D dye;
void main() {
    vec4 d = texture2D(dye, vUV);
    float amount = d.a;
    vec3 ink = d.rgb / max(d.a, 1e-4);
    float cover = 1.0 - exp(-amount * 2.2);
    // the ink's gradient gives the surface a subtle wet sheen
    vec2 e = vec2(1.5 / 256.0, 0.0);
    float gx = texture2D(dye, vUV + e.xy).a - texture2D(dye, vUV - e.xy).a;
    float gy = texture2D(dye, vUV + e.yx).a - texture2D(dye, vUV - e.yx).a;
    float sheen = clamp(0.5 + (gx - gy) * 2.0, 0.0, 1.0);
    vec3 c;
    if (style < 0.5) {
        vec3 paper = vec3(0.95, 0.92, 0.85) * (0.96 + 0.04 * noise(vUV * 400.0));
        vec3 pigment = mix(ink, ink * ink, 0.35);
        c = mix(paper, pigment, cover * 0.92);
        c *= 0.92 + 0.12 * sheen;
    } else {
        c = vec3(0.01, 0.012, 0.02) + ink * cover * 1.1 + ink * pow(cover, 3.0) * 0.6;
        c += vec3(0.25) * pow(sheen, 6.0) * cover;
    }
    // fade the sheet into the page at its border
    float edge = smoothstep(0.0, 0.06, min(min(vUV.x, vUV.y), min(1.0 - vUV.x, 1.0 - vUV.y)));
    vec3 outside = style < 0.5 ? vec3(0.88, 0.85, 0.78) : vec3(0.01, 0.012, 0.02);
    gl_FragColor = vec4(mix(outside, c, edge), 1.0);
}
`;

const NODE = `
void main() {
    vec3 n = labSphereNormal();
    float l = 0.4 + 0.6 * max(dot(n, normalize(vec3(-0.4, 0.5, -0.8))), 0.0);
    vec3 c = vColor.rgb * l + pow(max(-n.z, 0.0), 40.0) * 0.5;
    c = mix(c, vec3(1.0), 0.45 * max(vState.x, vState.y) + 0.35 * vState.w);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE = `
void main() {
    vec3 c = style < 0.5 ? vec3(0.15, 0.12, 0.1) : vec3(0.85);
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.3);
}
`;

const SOURCE = `
void main() {
    float r2 = dot(vUV, vUV);
    if (r2 > 1.0) discard;
    float k = exp(-r2 * 3.0) * (1.0 - r2);
    gl_FragColor = vec4(vColor.rgb * k, k);
}
`;

interface Stirrer {
    node: number;
    home: [number, number];
    phase: number;
    radius: number;
    speed: number;
}

export const FluidInk = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 0.8,
        edgeWidth: 1,
        style: "marbled paper",
        autoStir: 0.7,
        stirForce: 1,
        inkRadius: 1,
        seep: 0.6,
        swirl: 25,
        inkFade: 0.995,
        resolution: 256,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        dim: { table: { disable: true } },
        style: { control: "inline-radio", options: STYLES },
        autoStir: range(0, 1),
        stirForce: range(0, 3),
        inkRadius: range(0.3, 3),
        seep: range(0, 2),
        swirl: range(0, 60),
        inkFade: range(0.97, 1, 0.001),
        resolution: { control: "inline-radio", options: [128, 256, 512] },
    },
    render: (args: Args) => {
        const live = {
            autoStir: args.autoStir,
            stirForce: args.stirForce,
            inkRadius: args.inkRadius,
            seep: args.seep,
            swirl: args.swirl,
            inkFade: args.inkFade,
        };
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: 2,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: args.style === "marbled paper" ? "#e0d9c7" : "#030305",
            uniforms: { style: STYLES.indexOf(args.style), boundsCenter: [0, 0], boundsHalf: 1 },
            nodeLayer: { fragment: NODE },
            edgeLayer: { fragment: EDGE },
            rebuildOn: [live, args.resolution, args.style],
            setup: (ctx) => {
                const g = ctx.graph;
                const { nodes } = ctx;
                const { edges } = ctx;
                if (!nodes) {
                    return undefined;
                }
                const bounds = graphBounds(g, 0.4);
                const bu = boundsUniforms(bounds);
                ctx.set("boundsCenter", bu.boundsCenter);
                ctx.set("boundsHalf", bu.boundsHalf);
                const toUV = (x: number, y: number): [number, number] => [
                    ((x - bounds.cx) / bounds.half) * 0.5 + 0.5,
                    ((y - bounds.cy) / bounds.half) * 0.5 + 0.5,
                ];

                const res = args.resolution;
                const size = { width: res, height: res };
                const texel = [1 / res, 1 / res];
                const vel = new PingPong(ctx, "velocity", { size, type: "half" });
                const dye = new PingPong(ctx, "dye", { size, type: "half" });
                const pressure = new PingPong(ctx, "pressure", { size, type: "half" });
                const divergence = makeTarget(ctx, "divergence", { size, type: "half" });
                const curl = makeTarget(ctx, "curl", { size, type: "half" });
                const source = makeTarget(ctx, "source", { size, type: "half" });
                const pos = nodes.buffers.nodePos;
                const sourceLayer = nodeSplat(ctx, [source], {
                    name: "ink-source",
                    radius: "nodeRadius * 2.5 * nodeInfo.w",
                    fragment: SOURCE,
                    space: "world",
                    positions: pos,
                });
                autoRender(ctx, source);

                const r = effectRenderer(ctx);
                const pass = (name: string, src: string, u: string[], s: string[]): Pass =>
                    makePass(ctx, r, name, src, u, s);
                const advect = pass("advect", ADVECT, ["dt", "dissipation"], ["velocity", "src"]);
                const splatP = pass("splat", SPLAT, ["point", "value", "radius"], ["src"]);
                const seepP = pass("seep", SEEP, ["amount"], ["src", "source"]);
                const curlP = pass("curl", CURL, ["texel"], ["velocity"]);
                const vort = pass("vorticity", VORTICITY, ["texel", "strength", "dt"], ["velocity", "curl"]);
                const divP = pass("divergence", DIVERGENCE, ["texel"], ["velocity"]);
                const pres = pass("pressure", PRESSURE, ["texel"], ["pressure", "divergence"]);
                const grad = pass("gradient", GRADIENT, ["texel"], ["pressure", "velocity"]);
                const scale = pass("scale", SCALE_PRESSURE, ["k"], ["src"]);
                const all = [advect, splatP, seepP, curlP, vort, divP, pres, grad, scale];
                const bg = worldBackground(ctx, BACKGROUND, { dye: dye.src });

                // stirrers: hub nodes of different communities paddle in circles
                const home = Float32Array.from(pos);
                const byDegree = Array.from({ length: g.n }, (_, i) => i).sort((p, q) => g.degree[q] - g.degree[p]);
                const stirrers: Stirrer[] = [];
                const used = new Set<number>();
                for (const i of byDegree) {
                    if (stirrers.length >= 4) {
                        break;
                    }
                    if (used.has(g.community[i])) {
                        continue;
                    }
                    used.add(g.community[i]);
                    stirrers.push({
                        node: i,
                        home: [pos[i * 3], pos[i * 3 + 1]],
                        phase: stirrers.length * 1.7,
                        radius: 6 + 3 * (stirrers.length % 2),
                        speed: (stirrers.length % 2 ? -1 : 1) * (1.4 + 0.3 * stirrers.length),
                    });
                }

                // drag a node with the left button
                let dragging = -1;
                let dragTarget: [number, number] | undefined;
                const worldAt = (ev: PointerEvent): [number, number] => {
                    const rect = ctx.canvas.getBoundingClientRect();
                    const ray = ctx.scene.createPickingRay(
                        ev.clientX - rect.left,
                        ev.clientY - rect.top,
                        Matrix.Identity(),
                        ctx.camera,
                    );
                    const t = -ray.origin.z / ray.direction.z;
                    return [ray.origin.x + ray.direction.x * t, ray.origin.y + ray.direction.y * t];
                };
                const onDown = (ev: PointerEvent): void => {
                    if (ev.button !== 0) {
                        return;
                    }
                    const [x, y] = worldAt(ev);
                    let best = -1;
                    let bestD = g.nodeRadius * 4;
                    for (let i = 0; i < g.n; i++) {
                        const d = Math.hypot(pos[i * 3] - x, pos[i * 3 + 1] - y);
                        if (d < bestD) {
                            bestD = d;
                            best = i;
                        }
                    }
                    if (best >= 0) {
                        dragging = best;
                        dragTarget = [x, y];
                        ctx.camera.detachControl();
                        nodes.buffers.nodeState[best * 4 + 3] = 1;
                    }
                };
                const onMove = (ev: PointerEvent): void => {
                    if (dragging >= 0) {
                        dragTarget = worldAt(ev);
                    }
                };
                const onUp = (): void => {
                    if (dragging >= 0) {
                        nodes.buffers.nodeState[dragging * 4 + 3] = 0;
                        home[dragging * 3] = pos[dragging * 3];
                        home[dragging * 3 + 1] = pos[dragging * 3 + 1];
                        for (const s of stirrers) {
                            if (s.node === dragging) {
                                s.home = [pos[dragging * 3], pos[dragging * 3 + 1]];
                            }
                        }
                        dragging = -1;
                        ctx.camera.attachControl(ctx.canvas, true);
                    }
                };
                ctx.canvas.addEventListener("pointerdown", onDown);
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);

                let started = false;
                let simTime = 0;
                const stop = everyFrame(ctx, (_t, frameDt) => {
                    if (!all.every((p) => p.ready())) {
                        return;
                    }
                    const dt = Math.max(frameDt, 1 / 120);
                    if (!started) {
                        // the sheet starts with each node's ink already pooled around it
                        scale.run(dye.dst, { src: source, k: 2.5 });
                        dye.swap();
                        started = true;
                    }
                    simTime += dt;
                    // move the stirring nodes and collect their motion
                    const moves: { x: number; y: number; vx: number; vy: number; node: number }[] = [];
                    for (const s of stirrers) {
                        if (s.node === dragging || live.autoStir <= 0) {
                            continue;
                        }
                        const a = simTime * s.speed * live.autoStir + s.phase;
                        const i = s.node;
                        const nx = s.home[0] + Math.cos(a) * s.radius - s.radius;
                        const ny = s.home[1] + Math.sin(a) * s.radius;
                        moves.push({
                            x: nx,
                            y: ny,
                            vx: (nx - pos[i * 3]) / dt,
                            vy: (ny - pos[i * 3 + 1]) / dt,
                            node: i,
                        });
                        pos[i * 3] = nx;
                        pos[i * 3 + 1] = ny;
                    }
                    if (dragging >= 0 && dragTarget) {
                        const i = dragging;
                        // ease toward the pointer so a fast flick stays a smooth stroke
                        const nx = pos[i * 3] + (dragTarget[0] - pos[i * 3]) * Math.min(1, dt * 20);
                        const ny = pos[i * 3 + 1] + (dragTarget[1] - pos[i * 3 + 1]) * Math.min(1, dt * 20);
                        moves.push({
                            x: nx,
                            y: ny,
                            vx: (nx - pos[i * 3]) / dt,
                            vy: (ny - pos[i * 3 + 1]) / dt,
                            node: i,
                        });
                        pos[i * 3] = nx;
                        pos[i * 3 + 1] = ny;
                    }
                    if (moves.length) {
                        nodes.update("nodePos");
                        nodes.update("nodeState");
                        sourceLayer.update("nodePos");
                        if (edges) {
                            for (let e = 0; e < g.m; e++) {
                                edges.buffers.edgeA.set(pos.subarray(g.src[e] * 3, g.src[e] * 3 + 3), e * 3);
                                edges.buffers.edgeB.set(pos.subarray(g.dst[e] * 3, g.dst[e] * 3 + 3), e * 3);
                            }
                            edges.update("edgeA");
                            edges.update("edgeB");
                        }
                    }

                    // 1. velocity: advect, stir, swirl
                    // fades are per 1/60 s step, so a slow renderer does not flood the sheet with ink
                    advect.run(vel.dst, { velocity: vel.src, src: vel.src, dt, dissipation: Math.pow(0.995, dt * 60) });
                    vel.swap();
                    const sigma = (live.inkRadius * g.nodeRadius * 3) / (2 * bounds.half);
                    const rad = sigma * sigma;
                    for (const m of moves) {
                        const [u, v] = toUV(m.x, m.y);
                        // a jump (the first frame, a teleport) is not a stroke
                        const sp = Math.hypot(m.vx, m.vy);
                        if (sp > 150) {
                            m.vx *= 150 / sp;
                            m.vy *= 150 / sp;
                        }
                        const k = (2 / bounds.half) * live.stirForce;
                        splatP.run(vel.dst, {
                            src: vel.src,
                            point: [u, v],
                            value: [m.vx * k, m.vy * k, 0, 0],
                            radius: rad,
                        });
                        vel.swap();
                        const c = nodes.buffers.nodeColor.subarray(m.node * 4, m.node * 4 + 3);
                        const speed = Math.min(1, Math.hypot(m.vx, m.vy) / 40);
                        const ink = 0.6 * speed;
                        splatP.run(dye.dst, {
                            src: dye.src,
                            point: [u, v],
                            value: [c[0] * ink, c[1] * ink, c[2] * ink, ink],
                            radius: rad * 0.6,
                        });
                        dye.swap();
                    }
                    curlP.run(curl, { velocity: vel.src, texel });
                    vort.run(vel.dst, { velocity: vel.src, curl, texel, strength: live.swirl, dt });
                    vel.swap();
                    // 2. pressure projection keeps the liquid incompressible
                    divP.run(divergence, { velocity: vel.src, texel });
                    scale.run(pressure.dst, { src: pressure.src, k: 0.8 });
                    pressure.swap();
                    for (let it = 0; it < 20; it++) {
                        pres.run(pressure.dst, { pressure: pressure.src, divergence, texel });
                        pressure.swap();
                    }
                    grad.run(vel.dst, { pressure: pressure.src, velocity: vel.src, texel });
                    vel.swap();
                    // 3. ink: carried by the flow, slowly fading, refilled from the nodes
                    advect.run(dye.dst, {
                        velocity: vel.src,
                        src: dye.src,
                        dt,
                        dissipation: Math.pow(live.inkFade, dt * 60),
                    });
                    dye.swap();
                    seepP.run(dye.dst, { src: dye.src, source, amount: live.seep * dt });
                    dye.swap();
                    bg.material.setTexture("dye", dye.src);
                });
                return () => {
                    stop();
                    ctx.canvas.removeEventListener("pointerdown", onDown);
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                };
            },
        });
    },
};

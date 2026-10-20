/**
 * Layout force-field wind map: tens of thousands of particles drift over the background along
 * the graph's force field and leave fading trails, like the famous animated wind maps
 * (earth.nullschool.net, webgl-wind). The field comes from the nodes: each one adds a soft
 * "pressure" bump, and the wind blows down the pressure gradient (the layout's repulsion pushing
 * away from crowded clusters) or, with "swirl", around it along the isobars, the way real wind
 * circles a high-pressure system. Particles take the color of the community whose air they are
 * in, so the currents show where each community's influence reaches.
 *
 * Particle positions live in a float texture (one texel per particle) updated by a fragment
 * pass each frame (ping-pong); the particles are drawn as short segments from their previous to
 * their new position into a trail buffer that fades a little every frame.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, QUALITY_SETTINGS, range } from "../harness";
import {
    autoRender,
    boundsUniforms,
    DENSITY_SPLAT,
    effectRenderer,
    everyFrame,
    graphBounds,
    makePass,
    makeTarget,
    nodeSplat,
    PingPong,
    screenBackground,
    splat,
} from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Force Wind Map", ...labMeta };

interface Args extends GraphArgs {
    particleCount: number;
    swirl: number;
    windSpeed: number;
    fieldRadius: number;
    trailFade: number;
    brightness: number;
    showField: number;
}

const FIELD = 256;

const INIT = `
void main() {
    vec2 p = hash22(vUV * 937.1 + 3.7);
    gl_FragColor = vec4(p, hash12(vUV * 511.3) * 4.0, 0.0);
}
`;

const UPDATE = `
uniform sampler2D pos;
uniform sampler2D field;
uniform float dt;
uniform float t;
uniform float swirl;
uniform float speed;
void main() {
    vec4 s = texture2D(pos, vUV);
    vec2 p = s.xy;
    float e = 1.5 / ${FIELD}.0;
    float dx = texture2D(field, p + vec2(e, 0.0)).a - texture2D(field, p - vec2(e, 0.0)).a;
    float dy = texture2D(field, p + vec2(0.0, e)).a - texture2D(field, p - vec2(0.0, e)).a;
    vec2 g = vec2(dx, dy);
    float gl = length(g);
    vec2 dir = gl > 1e-7 ? g / gl : vec2(0.0);
    // down the gradient (repulsion) blended with along the isolines (swirl)
    vec2 v = normalize(-dir * (1.0 - swirl) + vec2(-dir.y, dir.x) * swirl + 1e-6) * smoothstep(0.0, 0.004, gl);
    float sp = length(v);
    p += v * speed * 0.1 * dt;
    float age = s.z + dt * (sp < 0.05 ? 6.0 : 1.0);
    vec2 seed = vUV * 113.7 + vec2(t * 3.1, t * 1.7);
    if (age > 4.0 || p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) {
        p = hash22(seed);
        age = hash12(seed + 9.1) * 0.5;
        sp = -1.0;
    }
    gl_FragColor = vec4(p, age, sp);
}
`;

const PARTICLE_VERTEX = `
uniform sampler2D posNew;
uniform sampler2D posOld;
uniform sampler2D field;
void main() {
    vec4 a = texture2D(posOld, particleUV);
    vec4 b = texture2D(posNew, particleUV);
    // a respawned particle has no tail
    if (b.w < 0.0 || length(b.xy - a.xy) > 0.05) a = b;
    vec2 wa = boundsCenter + (a.xy * 2.0 - 1.0) * boundsHalf;
    vec2 wb = boundsCenter + (b.xy * 2.0 - 1.0) * boundsHalf;
    vec4 ca = viewProjection * vec4(wa, 0.0, 1.0);
    vec4 cb = viewProjection * vec4(wb, 0.0, 1.0);
    vec2 sa = ca.xy / ca.w * resolution * 0.5;
    vec2 sb = cb.xy / cb.w * resolution * 0.5;
    vec2 d = sb - sa;
    float len = length(d);
    vec2 ax = len > 1e-3 ? d / len : vec2(1.0, 0.0);
    vec2 ay = vec2(-ax.y, ax.x);
    float hw = 0.9 * pixelRatio;
    // extend the ends only as far as a short segment needs: consecutive segments of one particle
    // then meet without overlapping, so additive blending does not bead the trail into dots
    float ext = max(0.0, hw - 0.5 * len);
    vec2 sp = mix(sa, sb, position.x * 0.5 + 0.5) + ax * position.x * ext + ay * position.y * hw;
    gl_Position = vec4(sp / (resolution * 0.5), 0.0, 1.0);
    vec4 f = texture2D(field, b.xy);
    vColor = f.rgb / max(f.a, 1e-4);
    float life = smoothstep(0.0, 0.4, b.z) * (1.0 - smoothstep(3.3, 4.0, b.z));
    vAlpha = life * (0.4 + 0.6 * clamp(b.w, 0.0, 1.0)) * smoothstep(0.0, 0.02, f.a);
}
`;

const PARTICLE = `
void main() {
    vec3 c = mix(vColor, vec3(1.0), 0.35);
    gl_FragColor = vec4(c * vAlpha, vAlpha);
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
uniform sampler2D field;
// the world point under this pixel: the camera ray through it meets the z = 0 plane
vec2 worldUV() {
    mat4 inv = inverse(viewProjection);
    vec4 n = inv * vec4(vUV * 2.0 - 1.0, -1.0, 1.0);
    vec4 f = inv * vec4(vUV * 2.0 - 1.0, 1.0, 1.0);
    vec3 a = n.xyz / n.w;
    vec3 b = f.xyz / f.w;
    vec3 w = mix(a, b, a.z / (a.z - b.z));
    return (w.xy - boundsCenter) / boundsHalf * 0.5 + 0.5;
}
void main() {
    vec3 acc = texture2D(trails, vUV).rgb * brightness;
    vec4 f = texture2D(field, worldUV());
    vec3 c = vec3(0.012, 0.016, 0.028) + f.rgb / max(f.a, 1e-4) * (1.0 - exp(-f.a * 0.5)) * 0.25 * showField;
    gl_FragColor = vec4(c + (vec3(1.0) - exp(-acc * 1.2)), 1.0);
}
`;

const NODE = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = mix(vColor.rgb, vec3(1.0), 0.3);
    c = mix(c, vec3(0.02), stroke(d + 0.15, 0.15));
    c = mix(c, vec3(1.0), 0.5 * max(vState.x, vState.y));
    gl_FragColor = vec4(c, a);
}
`;

const EDGE = `
void main() {
    gl_FragColor = vec4(vec3(0.85), labEdgeCoverage() * 0.15);
}
`;

export const ForceWindMap = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 0.6,
        edgeWidth: 1,
        particleCount: 64,
        swirl: 0.75,
        windSpeed: 1,
        fieldRadius: 30,
        trailFade: 0.94,
        brightness: 1.2,
        showField: 0.3,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        dim: { table: { disable: true } },
        particleCount: {
            control: "select",
            options: [32, 64, 128, 256],
            labels: { 32: "1k", 64: "4k", 128: "16k", 256: "65k" },
        },
        swirl: range(0, 1),
        windSpeed: range(0.1, 4),
        fieldRadius: range(5, 50),
        trailFade: range(0.8, 0.99, 0.005),
        brightness: range(0.2, 4),
        showField: range(0, 1),
    },
    render: (args: Args) => {
        const rebuild = { n: args.particleCount, fade: args.trailFade, swirl: args.swirl, speed: args.windSpeed };
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: 2,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                fieldRadius: args.fieldRadius,
                brightness: args.brightness,
                showField: args.showField,
                measure: 0,
                boundsCenter: [0, 0],
                boundsHalf: 1,
            },
            nodeLayer: { fragment: NODE },
            edgeLayer: { fragment: EDGE },
            rebuildOn: [rebuild],
            setup: (ctx) => {
                const g = ctx.graph;
                const bounds = graphBounds(g, 0.35);
                const bu = boundsUniforms(bounds);
                ctx.set("boundsCenter", bu.boundsCenter);
                ctx.set("boundsHalf", bu.boundsHalf);

                const field = makeTarget(ctx, "field", { size: { width: FIELD, height: FIELD }, type: "half" });
                nodeSplat(ctx, [field], {
                    name: "pressure",
                    radius: "fieldRadius",
                    fragment: DENSITY_SPLAT,
                    space: "world",
                });
                autoRender(ctx, field);

                const { n } = rebuild;
                const pos = new PingPong(ctx, "particles", {
                    size: { width: n, height: n },
                    type: "float",
                    nearest: true,
                });
                const uvs = new Float32Array(n * n * 2);
                for (let y = 0; y < n; y++) {
                    for (let x = 0; x < n; x++) {
                        uvs[(y * n + x) * 2] = (x + 0.5) / n;
                        uvs[(y * n + x) * 2 + 1] = (y + 0.5) / n;
                    }
                }
                // full resolution at high quality; the post ratio of the quality below that
                const frameSize = QUALITY_SETTINGS[ctx.quality].postRatio;
                const frame = makeTarget(ctx, "wind-frame", { size: frameSize, type: "half" });
                const particles = splat(ctx, [frame], {
                    name: "particles",
                    count: n * n,
                    geometry: "quad",
                    attributes: { particleUV: [2, uvs] },
                    varyings: "varying vec3 vColor;\nvarying float vAlpha;",
                    vertex: PARTICLE_VERTEX,
                    fragment: PARTICLE,
                    blend: "add",
                });
                particles.material.setTexture("posNew", pos.src);
                particles.material.setTexture("posOld", pos.dst);
                particles.material.setTexture("field", field);
                autoRender(ctx, frame);

                const acc = new PingPong(ctx, "wind-acc", { size: frameSize, type: "half" });
                const renderer = effectRenderer(ctx);
                const init = makePass(ctx, renderer, "init", INIT, [], []);
                const update = makePass(
                    ctx,
                    renderer,
                    "update",
                    UPDATE,
                    ["dt", "t", "swirl", "speed"],
                    ["pos", "field"],
                );
                const accumulate = makePass(ctx, renderer, "accumulate", ACCUMULATE, ["decay"], ["prev", "frame"]);
                const bg = screenBackground(ctx, BACKGROUND, { trails: acc.src, field });

                let started = false;
                const stop = everyFrame(ctx, (time, dt) => {
                    if (!init.ready() || !update.ready() || !accumulate.ready()) {
                        return;
                    }
                    if (!started) {
                        init.run(pos.src, {});
                        init.run(pos.dst, {});
                        started = true;
                    }
                    // trails first (the frame target drew last positions), then move the particles
                    accumulate.run(acc.dst, { prev: acc.src, frame, decay: Math.pow(rebuild.fade, dt * 60) });
                    acc.swap();
                    bg.material.setTexture("trails", acc.src);
                    update.run(pos.dst, {
                        pos: pos.src,
                        field,
                        dt,
                        t: time,
                        swirl: rebuild.swirl,
                        speed: rebuild.speed,
                    });
                    pos.swap();
                    particles.material.setTexture("posNew", pos.src);
                    particles.material.setTexture("posOld", pos.dst);
                });
                return stop;
            },
        });
    },
};

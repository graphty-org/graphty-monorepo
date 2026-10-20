/**
 * God rays from a hub: the selected node (the top hub at first; click another to move the light)
 * becomes a sun. A half-resolution pass paints the sun's disc and halo with every node and edge
 * in front of it blacked out, a radial blur smears that light toward the sun (the GPU Gems 3
 * "volumetric light scattering" march), and the result is added over the scene, so nodes and
 * edges cast long shadow shafts through the light.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addPass, byRank, rgb, toScreen } from "./common";

export default { title: "Shader Lab/Scene render targets, backdrops and transitions/God Rays", ...labMeta };

interface Args extends GraphArgs {
    lightColor: string;
    sunSize: number;
    exposure: number;
    density: number;
    decay: number;
    occlusion: number;
    flicker: number;
}

const BACKGROUND = "#04050a";

// the sun node glows white-hot; the rest are lit from its direction
const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    if (vState.y > 0.5) {
        gl_FragColor = vec4(mix(lightColor, vec3(1.0), 0.7) * 2.0, 1.0);
        return;
    }
    vec3 toSun = selectedPos - vCenterWorld;
    vec3 l = normalize((view * vec4(toSun, 0.0)).xyz);
    float diff = max(dot(n, l), 0.0);
    float near = 1.0 / (1.0 + dot(toSun, toSun) * 0.0006);
    vec3 c = vColor.rgb * (0.12 + 0.9 * diff * near) + lightColor * pow(diff, 20.0) * 0.4 * near;
    c = mix(c, vec3(1.0), 0.4 * vState.x);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT) * 0.55;
    gl_FragColor = vec4(c, labEdgeCoverage() * 0.6);
}
`;

const DEFAULTS: Args = {
    ...graphArgs,
    lightColor: "#ffd9a0",
    sunSize: 1,
    exposure: 0.9,
    density: 0.95,
    decay: 0.965,
    occlusion: 1,
    flicker: 0.3,
};

let live = DEFAULTS;

export const GodRays = {
    args: DEFAULTS,
    argTypes: {
        ...graphArgTypes,
        lightColor: { control: "color" },
        sunSize: range(0.2, 3),
        exposure: range(0, 3),
        density: range(0.2, 1.5),
        decay: range(0.9, 1),
        occlusion: range(0, 1),
        flicker: range(0, 1),
    },
    render: (args: Args) => {
        live = args;
        return mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: BACKGROUND,
            uniforms: { lightColor: args.lightColor },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                const top = byRank(ctx)[0];
                ctx.select(top);
                let sun = [0, 0, 0, 0];
                ctx.onFrame(() => {
                    const pos = ctx.nodes?.buffers.nodeState;
                    let s = -1;
                    for (let i = 0; pos && i < ctx.graph.n; i++) {
                        if (pos[i * 4 + 1] > 0.5) {
                            s = i;
                            break;
                        }
                    }
                    if (s < 0) {
                        // a click on empty space clears the selection: the light goes back to the top hub
                        s = top;
                        ctx.select(top);
                    }
                    const p = ctx.graph.pos;
                    sun = toScreen(ctx, p[s * 3], p[s * 3 + 1], p[s * 3 + 2]);
                });
                const sunUv = (): number[] => [
                    sun[0] / ctx.engine.getRenderWidth(),
                    sun[1] / ctx.engine.getRenderHeight(),
                ];
                const common = {
                    sun: sunUv,
                    sunRadius: () => Math.max(6, sun[2] * 4 * live.sunSize),
                    light: () => rgb(live.lightColor),
                };
                // 1: the light source with occluders blacked out (written at half resolution)
                const occlude = addPass(ctx, {
                    samples: 4,
                    uniforms: {
                        ...common,
                        bg: () => rgb(BACKGROUND),
                        occlusion: () => live.occlusion,
                        flicker: () => live.flicker,
                    },
                    fragment: `
void main() {
    vec2 px = vUV * resolution;
    vec2 sp = sun * resolution;
    float d = length(px - sp);
    vec3 scene = texture2D(textureSampler, vUV).rgb;
    float occ = smoothstep(0.015, 0.08, length(scene - bg)) * occlusion;
    // the sun's own node is the light, not an occluder
    occ *= smoothstep(sunRadius * 0.45, sunRadius * 0.7, d);
    float a = atan(px.y - sp.y, px.x - sp.x);
    float corona = 0.6 + 0.4 * flicker * noise(vec2(a * 4.0, time * 0.7)) + 0.4 * (1.0 - flicker);
    float l = smoothstep(sunRadius, sunRadius * 0.5, d) + 0.5 * exp(-d / (sunRadius * 3.0)) * corona
            + 0.07 * exp(-d / (resolution.y * 0.3));
    gl_FragColor = vec4(light * l * (1.0 - occ), 1.0);
}`,
                });
                // 2: radial blur toward the sun (ratio 0.5: the light source above is written at
                // half resolution)
                addPass(ctx, {
                    ratio: 0.5,
                    uniforms: { ...common, density: () => live.density, decay: () => live.decay },
                    fragment: `
void main() {
    const int N = LAB_Q(24, 40, 72);
    vec2 delta = (vUV - sun) * density / float(N);
    vec2 uv = vUV;
    float w = 1.0;
    vec3 sum = vec3(0.0);
    float j = hash12(gl_FragCoord.xy + fract(time) * 37.0);
    uv -= delta * j;
    for (int i = 0; i < N; i++) {
        uv -= delta;
        sum += texture2D(textureSampler, uv).rgb * w;
        w *= pow(decay, 72.0 / float(N));
    }
    gl_FragColor = vec4(sum / float(N) * 4.0, 1.0);
}`,
                });
                // 3: add the shafts over the original scene
                addPass(ctx, {
                    ratio: 0.5,
                    uniforms: { exposure: () => live.exposure },
                    samplers: { sceneSampler: () => ({ input: occlude }) },
                    fragment: `
void main() {
    vec3 base = texture2D(sceneSampler, vUV).rgb;
    vec3 rays = texture2D(textureSampler, vUV).rgb * exposure;
    vec3 c = base + rays;
    c = c / (1.0 + max(luminance(c) - 1.0, 0.0) * 0.6);
    gl_FragColor = vec4(c, 1.0);
}`,
                });
            },
        });
    },
};

/**
 * Every node is a plasma globe whose filaments reach toward its neighbors: each of the (up to)
 * four highest-degree neighbors gets a crackling tendril aimed at where that neighbor is on
 * screen, recomputed every frame so it tracks as the camera moves. Hover a globe and an extra,
 * brighter tendril follows the cursor, like a fingertip on the glass. Thin faint "ambient"
 * filaments wander without meaning, as in a real globe.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { colorArg, SURFACE_GLSL, trackNeighborAngles } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Plasma Globe", ...labMeta };

interface Args extends GraphArgs {
    tendrilWidth: number;
    wiggle: number;
    flicker: number;
    brightness: number;
    ambient: number;
    glass: number;
    glowColor: string;
    coreColor: string;
}

const NODE_FRAGMENT = `${SURFACE_GLSL}
float wrapPi(float a) { return mod(a + PI, TAU) - PI; }
// glow of one filament from the center electrode toward angle target
float tendril(float target, float r, float ang, float seed, float width) {
    float fq = time * flicker;
    float k = floor(fq);
    float blend = smoothstep(0.0, 1.0, fract(fq));
    float n0 = noise(vec2(r * 3.0 + seed, k * 1.7 + seed));
    float n1 = noise(vec2(r * 3.0 + seed, (k + 1.0) * 1.7 + seed));
    float jitter = (mix(n0, n1, blend) - 0.5) * 2.0;
    // the wiggle vanishes at both ends, so each filament leaves the electrode and lands on its target
    float env = sin(PI * clamp(r / 0.9, 0.0, 1.0));
    float theta = target + env * (wiggle * jitter * 1.1 + 0.1 * wiggle * sin(r * 14.0 - time * 7.0 + seed));
    float d = abs(wrapPi(ang - theta)) * r;
    float w = width * (0.6 + 0.6 * r);
    float g = exp(-d / w) + 0.35 * exp(-d / (w * 6.0));
    g *= smoothstep(0.08, 0.18, r) * smoothstep(0.97, 0.88, r);
    // where it touches the glass
    vec2 tip = 0.9 * vec2(cos(theta), sin(theta));
    g += 0.9 * exp(-length(vUV - tip) / (w * 2.5)) * step(0.7, r);
    return g;
}
void main() {
    vec3 n = labSphereNormal();
    float facing = -n.z;
    float r = length(vUV);
    float ang = atan(vUV.y, vUV.x);
    float seed = vInfo.x * 100.0;
    // thicker filaments on small globes so they stay visible zoomed out
    float width = 0.018 * tendrilWidth * max(1.0, 22.0 / max(vPixelRadius, 1.0));

    float glow = 0.0;
    for (int k = 0; k < 4; k++) {
        float v = vCustom[k];
        if (v < 0.0) continue;
        glow += tendril(unpackNeighbor(v).x, r, ang, seed + float(k) * 13.7, width);
    }
    float faint = 0.0;
    for (int k = 0; k < 3; k++) {
        if (float(k) >= ambient) break;
        float target = hash11(seed + float(k) * 3.1) * TAU + time * (0.25 + 0.2 * float(k)) * (mod(float(k), 2.0) * 2.0 - 1.0);
        faint += tendril(target, r, ang, seed + 50.0 + float(k) * 7.3, width * 0.45) * 0.35;
    }
    // the cursor: a bright filament toward the mouse while hovered
    float cursor = 0.0;
    if (vState.x > 0.5 && mouse.x >= 0.0) {
        vec4 cc = projection * vec4(vCenterView, 1.0);
        vec2 px = (cc.xy / cc.w * 0.5 + 0.5) * resolution;
        vec2 dm = mouse - px;
        cursor = tendril(atan(dm.y, dm.x), r, ang, seed + 99.0, width * 1.6) * 1.6;
    }

    vec3 interior = mix(vec3(0.02, 0.01, 0.05), glowColor * 0.12, exp(-r * 2.5));
    vec3 col = interior;
    col += glowColor * (glow + faint) * brightness;
    col += mix(glowColor, coreColor, 0.7) * cursor * brightness;
    col += coreColor * pow(min(glow + cursor, 3.0) / 3.0, 2.0) * brightness;
    // center electrode
    col += coreColor * (1.0 - smoothstep(0.07, 0.13, r)) * 1.2 + glowColor * exp(-r * 9.0) * 0.6 * brightness;
    // glass shell
    col += vec3(0.55, 0.6, 0.9) * pow(1.0 - facing, 3.0) * glass * 0.8;
    col += vec3(1.0) * specular(n, 200.0) * glass * 0.8;
    col += vec3(1.0) * stroke(r - 0.97, 0.025) * vState.y;
    gl_FragColor = vec4(col, 1.0);
}
`;

export const PlasmaGlobe = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 1.8,
        edgeWidth: 1,
        tendrilWidth: 1,
        wiggle: 0.5,
        flicker: 7,
        brightness: 1.3,
        ambient: 1,
        glass: 0.7,
        glowColor: "#b04dff",
        coreColor: "#ffd6ff",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        tendrilWidth: range(0.3, 4),
        wiggle: range(0, 1.5),
        flicker: range(0, 25, 0.5),
        brightness: range(0, 3),
        ambient: range(0, 3, 1),
        glass: range(0, 1),
        glowColor: colorArg,
        coreColor: colorArg,
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#04030a",
            uniforms: {
                tendrilWidth: args.tendrilWidth,
                wiggle: args.wiggle,
                flicker: args.flicker,
                brightness: args.brightness,
                ambient: args.ambient,
                glass: args.glass,
                glowColor: args.glowColor,
                coreColor: args.coreColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            setup: trackNeighborAngles,
        }),
};

/**
 * Iso-contour topography: node density becomes terrain. Each node raises a soft hill (a Gaussian
 * splatted into a float buffer); the summed height is drawn as a relief map with hypsometric
 * tints (sea, lowland green, tan uplands, snowy peaks), contour lines with a heavier index line
 * every fifth level, and hill shading from a light in the north-west. Communities become
 * mountains and the sparse space between them becomes sea.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { autoRender, DENSITY_SCALE, DENSITY_SPLAT, makeTarget, MEASURES, nodeSplat, screenBackground } from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Iso Contours", ...labMeta };

const STYLES = ["topographic", "blueprint", "night"] as const;

interface Args extends GraphArgs {
    measure: (typeof MEASURES)[number];
    style: (typeof STYLES)[number];
    bandwidth: number;
    levels: number;
    seaLevel: number;
    relief: number;
    lineStrength: number;
}

const BACKGROUND = `
uniform sampler2D density;
float heightAt(vec2 uv) {
    float d = texture2D(density, uv).a;
    return log(1.0 + d * 1.2) / log(1.0 + 12.0);
}
vec3 hypsometric(float h) {
    if (h < seaLevel) {
        float k = h / max(seaLevel, 1e-3);
        return mix(vec3(0.05, 0.13, 0.30), vec3(0.32, 0.55, 0.72), k * k);
    }
    float k = (h - seaLevel) / max(1.0 - seaLevel, 1e-3);
    vec3 c = mix(vec3(0.33, 0.55, 0.30), vec3(0.62, 0.68, 0.38), smoothstep(0.0, 0.25, k));
    c = mix(c, vec3(0.62, 0.48, 0.32), smoothstep(0.2, 0.5, k));
    c = mix(c, vec3(0.45, 0.36, 0.30), smoothstep(0.45, 0.7, k));
    return mix(c, vec3(0.97), smoothstep(0.72, 0.9, k));
}
void main() {
    vec2 texel = 1.0 / (resolution * ${DENSITY_SCALE.toFixed(2)});
    float h = heightAt(vUV);
    float hx = heightAt(vUV + vec2(texel.x, 0.0)) - heightAt(vUV - vec2(texel.x, 0.0));
    float hy = heightAt(vUV + vec2(0.0, texel.y)) - heightAt(vUV - vec2(0.0, texel.y));
    vec3 n = normalize(vec3(-hx * relief * 40.0, -hy * relief * 40.0, 1.0));
    float shade = clamp(dot(n, normalize(vec3(-0.6, 0.6, 0.7))), 0.0, 1.0);
    // contour lines: anti-aliased by the level's screen derivative
    float lv = h * levels;
    float f = fract(lv);
    float dist = min(f, 1.0 - f) / max(fwidth(lv), 1e-4);
    float major = 1.0 - step(0.01, abs(mod(floor(lv + 0.5), 5.0)));
    float line = 1.0 - smoothstep(0.5 + major * 0.7, 1.5 + major * 0.7, dist);
    line *= step(0.005, h);
    vec3 c;
    if (style < 0.5) {
        c = hypsometric(h) * (0.55 + 0.6 * shade);
        vec3 ink = h < seaLevel ? vec3(0.75, 0.88, 1.0) : vec3(0.25, 0.15, 0.08);
        c = mix(c, ink, line * lineStrength * (0.55 + 0.45 * major));
    } else if (style < 1.5) {
        c = vec3(0.06, 0.22, 0.45) * (0.8 + 0.4 * shade);
        vec2 grid = abs(fract(gl_FragCoord.xy / 40.0) - 0.5);
        c += vec3(0.1, 0.2, 0.3) * (1.0 - smoothstep(0.0, 0.02, min(grid.x, grid.y))) * 0.4;
        c = mix(c, vec3(0.85, 0.93, 1.0), line * lineStrength * (0.5 + 0.5 * major));
    } else {
        c = vec3(0.01, 0.015, 0.03) + vec3(0.0, 0.1, 0.12) * shade * h;
        vec3 glow = mix(vec3(0.1, 0.9, 0.8), vec3(1.0, 0.4, 0.8), h);
        c += glow * line * lineStrength * (0.6 + 0.6 * major) * smoothstep(0.0, 0.05, h);
    }
    gl_FragColor = vec4(c, 1.0);
}
`;

const NODE = `
void main() {
    float d = length(vUV) - 1.0;
    float a = fill(d);
    if (a <= 0.0) discard;
    vec3 c = vColor.rgb;
    c = mix(c, vec3(0.08), stroke(d + 0.12, 0.12));
    c = mix(c, vec3(1.0), 0.5 * max(vState.x, vState.y));
    gl_FragColor = vec4(c, a);
}
`;

const EDGE = `
void main() {
    gl_FragColor = vec4(vec3(0.1, 0.08, 0.06), labEdgeCoverage() * 0.25);
}
`;

export const IsoContours = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 0.55,
        edgeWidth: 1,
        measure: "count",
        style: "topographic",
        bandwidth: 9,
        levels: 14,
        seaLevel: 0.12,
        relief: 1,
        lineStrength: 0.7,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        measure: { control: "select", options: MEASURES },
        style: { control: "inline-radio", options: STYLES },
        bandwidth: range(2, 30),
        levels: range(3, 40, 1),
        seaLevel: range(0, 0.6),
        relief: range(0, 3),
        lineStrength: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                measure: MEASURES.indexOf(args.measure),
                style: STYLES.indexOf(args.style),
                bandwidth: args.bandwidth,
                levels: args.levels,
                seaLevel: args.seaLevel,
                relief: args.relief,
                lineStrength: args.lineStrength,
            },
            nodeLayer: { fragment: NODE },
            edgeLayer: { fragment: EDGE },
            setup: (ctx) => {
                const density = makeTarget(ctx, "density", { size: DENSITY_SCALE, type: "half" });
                nodeSplat(ctx, [density], { name: "density-splat", radius: "bandwidth", fragment: DENSITY_SPLAT });
                autoRender(ctx, density);
                screenBackground(ctx, BACKGROUND, { density });
            },
        }),
};

/**
 * Metaball community hulls: each node adds a smooth bump to its community's field (eight
 * communities, one per color channel of two float buffers), and wherever a community's summed
 * field passes a threshold a gooey translucent blob is drawn. Nearby nodes of one community melt
 * into one hull; outliers bud off as droplets; where two communities press together a crisp
 * seam forms between them. The blobs breathe, so hulls merge and split live, and the "membrane"
 * look turns them into iridescent soap film.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { autoRender, GLSL_COMMUNITY, makeTarget, nodeSplat, screenBackground } from "./common";

export default { title: "Shader Lab/Splatting Fields And Simulations/Metaball Hulls", ...labMeta };

const LOOKS = ["goo", "membrane", "outline"] as const;

interface Args extends GraphArgs {
    look: (typeof LOOKS)[number];
    blobRadius: number;
    threshold: number;
    breathe: number;
    fillOpacity: number;
    outline: number;
}

// A node writes (1 - r^2)^2 into the channel of its community; two meshes cover communities 0-3 and 4-7.
const splatFragment = (half: number): string => `
void main() {
    float c = mod(floor(vData.w + 0.5), 8.0);
    if (floor(c / 4.0) != ${half.toFixed(1)}) discard;
    float r2 = dot(vUV, vUV);
    if (r2 > 1.0) discard;
    float f = (1.0 - r2) * (1.0 - r2);
    float ch = mod(c, 4.0);
    gl_FragColor = vec4(ch < 0.5 ? f : 0.0, abs(ch - 1.0) < 0.5 ? f : 0.0, abs(ch - 2.0) < 0.5 ? f : 0.0, ch > 2.5 ? f : 0.0);
}
`;

const RADIUS = "blobRadius * (1.0 + breathe * 0.25 * sin(time * 1.3 + nodeInfo.x * 6.2832)) * (0.8 + 0.4 * nodeInfo.w)";

const BACKGROUND = `
uniform sampler2D fieldA;
uniform sampler2D fieldB;
${GLSL_COMMUNITY}
// (best value, its community, second best value)
vec3 top2(vec2 uv) {
    vec4 a = texture2D(fieldA, uv);
    vec4 b = texture2D(fieldB, uv);
    float best = -1.0; float idx = 0.0; float second = 0.0;
    float v[8];
    v[0] = a.x; v[1] = a.y; v[2] = a.z; v[3] = a.w; v[4] = b.x; v[5] = b.y; v[6] = b.z; v[7] = b.w;
    for (int i = 0; i < 8; i++) {
        if (v[i] > best) { second = max(best, 0.0); best = v[i]; idx = float(i); }
        else if (v[i] > second) { second = v[i]; }
    }
    return vec3(best, idx, second);
}
void main() {
    vec3 t = top2(vUV);
    float v = t.x;
    vec3 col = communityRGB(t.y);
    vec3 bg = vec3(0.035, 0.04, 0.06) + vec3(0.02, 0.025, 0.04) * (1.0 - length(vUV - 0.5));
    // signed distance to the hull in pixels, from the field and its screen gradient
    float g = max(length(vec2(dFdx(v), dFdy(v))), 1e-5);
    float sd = (threshold - v) / g;
    float inside = clamp(0.5 - sd, 0.0, 1.0);
    // a seam where two communities meet: their fields are equal there
    float d2 = t.x - t.z;
    float g2 = max(length(vec2(dFdx(d2), dFdy(d2))), 1e-5);
    float seam = (1.0 - smoothstep(0.5, 1.8, d2 / g2)) * step(threshold, t.z + 0.02);
    // smoothed normal of the field surface (neighbor taps), for the shading
    vec2 px = 3.0 / resolution;
    float vx = top2(vUV + vec2(px.x, 0.0)).x - top2(vUV - vec2(px.x, 0.0)).x;
    float vy = top2(vUV + vec2(0.0, px.y)).x - top2(vUV - vec2(0.0, px.y)).x;
    vec3 n = normalize(vec3(-vx * 2.5, -vy * 2.5, 1.0));
    float rim = 1.0 - smoothstep(0.0, 18.0, -sd);
    vec3 c = bg;
    if (look < 0.5) {
        // goo: translucent jelly, brighter toward the rim, a specular glint
        vec3 body = col * (0.35 + 0.45 * rim) + pow(max(dot(n, normalize(vec3(-0.5, 0.6, 0.8))), 0.0), 24.0) * 0.6;
        c = mix(bg, body, inside * mix(fillOpacity, 1.0, rim * 0.6));
        c = mix(c, col * 1.25 + 0.1, inside * (1.0 - smoothstep(outline - 1.0, outline, -sd)) * step(0.5, outline));
    } else if (look < 1.5) {
        // membrane: soap film, interference colors that swirl with the surface slope
        float fres = pow(1.0 - n.z, 0.6);
        float film = v * 3.0 + n.x * 2.0 + n.y * 1.5 + time * 0.08 + noise(gl_FragCoord.xy * 0.006 + time * 0.1) * 0.6;
        vec3 irid = palette(film, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
        vec3 body = mix(col * 0.25, irid, 0.35 + 0.65 * fres) * (0.35 + 0.9 * rim);
        body += pow(max(dot(n, normalize(vec3(-0.4, 0.5, 0.9))), 0.0), 40.0) * 0.9;
        c = mix(bg, mix(bg, body, fillOpacity + 0.5 * rim), inside);
        c = mix(c, irid * 1.3, inside * (1.0 - smoothstep(outline - 1.0, outline, -sd)) * step(0.5, outline));
    } else {
        // outline: just a clean contour around each community, like a hand-drawn Euler diagram
        c = mix(bg, col * 0.22 + bg, inside * fillOpacity);
        c = mix(c, col, (1.0 - smoothstep(max(outline, 1.0) - 1.0, max(outline, 1.0), abs(sd))));
    }
    c = mix(c, bg * 0.5, seam * inside * 0.9);
    gl_FragColor = vec4(c, 1.0);
}
`;

const NODE = `
void main() {
    vec3 n = labSphereNormal();
    float l = 0.35 + 0.65 * max(dot(n, normalize(vec3(-0.4, 0.5, -0.8))), 0.0);
    vec3 c = mix(vColor.rgb, vec3(1.0), 0.25) * l + pow(max(-n.z, 0.0), 30.0) * 0.4;
    c = mix(c, vec3(1.0), 0.5 * max(vState.x, vState.y));
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float same = step(abs(vData.y - vData.z), 0.5);
    gl_FragColor = vec4(mix(vec3(0.8), c, same), labEdgeCoverage() * mix(0.12, 0.35, same));
}
`;

export const MetaballHulls = {
    args: {
        ...graphArgs,
        dim: 2,
        nodeSize: 0.9,
        edgeWidth: 1,
        look: "goo",
        blobRadius: 7,
        threshold: 1,
        breathe: 0.5,
        fillOpacity: 0.55,
        outline: 2.5,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        look: { control: "inline-radio", options: LOOKS },
        blobRadius: range(2, 25),
        threshold: range(0.05, 1.5),
        breathe: range(0, 1),
        fillOpacity: range(0, 1),
        outline: range(0, 8),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                look: LOOKS.indexOf(args.look),
                blobRadius: args.blobRadius,
                threshold: args.threshold,
                breathe: args.breathe,
                fillOpacity: args.fillOpacity,
                outline: args.outline,
            },
            nodeLayer: { fragment: NODE },
            edgeLayer: { fragment: EDGE },
            setup: (ctx) => {
                const fieldA = makeTarget(ctx, "field-a", { size: 0.5, type: "half" });
                const fieldB = makeTarget(ctx, "field-b", { size: 0.5, type: "half" });
                nodeSplat(ctx, [fieldA], { name: "blob-a", radius: RADIUS, fragment: splatFragment(0) });
                nodeSplat(ctx, [fieldB], { name: "blob-b", radius: RADIUS, fragment: splatFragment(1) });
                autoRender(ctx, fieldA);
                autoRender(ctx, fieldB);
                screenBackground(ctx, BACKGROUND, { fieldA, fieldB });
            },
        }),
};

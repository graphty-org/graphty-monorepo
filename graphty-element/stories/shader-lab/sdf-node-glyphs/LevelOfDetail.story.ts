/**
 * Level of detail: far away a node is a plain dot; zoom in and it gains a border, then a value
 * gauge, then a community icon, then a degree badge. The vertex shader already knows each node's
 * radius on screen in pixels (vPixelRadius), so the fragment shader cross-fades each layer in over
 * a band of sizes and nothing pops. Scroll to zoom, or drag `lodBias` to fake the zoom.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { QUIET_EDGE } from "./glyph-common";

export default { title: "Shader Lab/SDF Node Glyphs/Level Of Detail", ...labMeta };

interface Args extends GraphArgs {
    lodBias: number;
    showLevel: boolean;
    gaugeColor: string;
    badgeColor: string;
}

const NODE_FRAGMENT = `
float icon(float k, vec2 p) {
    k = mod(k, 6.0);
    if (k < 0.5) return sdStar5(p, 0.42, 0.45);
    if (k < 1.5) return sdHexagon(p, 0.32);
    if (k < 2.5) return sdTriangle(vec2(p.x, p.y + 0.05), 0.38);
    if (k < 3.5) return sdRoundBox(p, vec2(0.3), 0.08);
    if (k < 4.5) return min(sdBox(p, vec2(0.36, 0.11)), sdBox(p, vec2(0.11, 0.36)));
    return abs(sdCircle(p, 0.26)) - 0.08;
}
void main() {
    float px = vPixelRadius * lodBias;
    float lBorder = smoothstep(5.0, 10.0, px);
    float lGauge = smoothstep(13.0, 20.0, px);
    float lIcon = smoothstep(24.0, 34.0, px);
    float lBadge = smoothstep(40.0, 54.0, px);

    vec2 p = vUV;
    float r = length(p);
    float d = r - 0.9;
    float a = fill(d);
    vec3 c = vColor.rgb * (0.9 + 0.1 * p.y);

    // 1: a light border
    c = mix(c, vec3(0.96, 0.95, 0.92), lBorder * stroke(d + 0.05, 0.05));
    // 2: a value gauge on an inner ring
    float ang = fract(atan(p.x, p.y) / TAU + 1.0);
    float ring = stroke(r - 0.7, 0.07);
    vec3 gaugeC = ang < vData.z ? gaugeColor : vColor.rgb * 0.45;
    c = mix(c, gaugeC, lGauge * ring);
    // 3: a community icon in the middle
    float kk = mod(vData.w, 12.0);
    float icD = icon(kk, p);
    if (kk > 5.5) icD = abs(icD + 0.02) - 0.045;   // communities 6-11: outlined icons
    float ic = fill(icD);
    c = mix(c, vec3(1.0), lIcon * ic * 0.92);
    // 4: a badge with one to four pips for degree, top right
    vec2 bp = p - vec2(0.7, 0.7);
    float bd = length(bp) - 0.3;
    float badge = fill(bd) * lBadge;
    float pips = floor(1.0 + vData.x * 3.99);
    float pip = 0.0;
    for (int k = 0; k < 4; k++) {
        float fk = float(k);
        if (fk < pips) {
            float x = (fk - (pips - 1.0) * 0.5) * 0.13;
            pip = max(pip, fill(length(bp - vec2(x, 0.0)) - 0.045));
        }
    }
    c = mix(c, badgeColor, badge);
    c = mix(c, vec3(1.0), badge * pip);
    float outline = lBadge * stroke(bd, 0.03);
    c = mix(c, vec3(0.06, 0.07, 0.1), outline);
    a = max(a, max(badge, outline));

    if (showLevel > 0.5) {
        float level = lBorder + lGauge + lIcon + lBadge;
        c = mix(c, rainbow(level / 5.0), 0.35);
    }
    c = mix(c, vec3(1.0), 0.3 * vState.x);
    float sel = vState.y * stroke(r - 1.02, 0.04);
    c = mix(c, vec3(1.0), sel);
    a = max(a, sel);
    if (a <= 0.003) discard;
    gl_FragColor = vec4(c, a);
}
`;

export const LevelOfDetail = {
    args: {
        ...graphArgs,
        graph: "large",
        dim: 2,
        nodeSize: 1.2,
        lodBias: 1,
        showLevel: false,
        gaugeColor: "#ffd166",
        badgeColor: "#e63946",
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        lodBias: range(0.1, 8, 0.05),
        showLevel: { control: "boolean" },
        gaugeColor: { control: "color" },
        badgeColor: { control: "color" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                lodBias: args.lodBias,
                showLevel: args.showLevel,
                gaugeColor: args.gaugeColor,
                badgeColor: args.badgeColor,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 1.1, blend: "alpha" },
            edgeLayer: { fragment: QUIET_EDGE },
        }),
};

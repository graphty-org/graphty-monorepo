/**
 * Focus by hop distance: click a node and its neighborhood stays crisp and colored while everything
 * farther away goes out of focus -- softer, grayer and more transparent with every hop, like a
 * camera's depth of field measured in graph steps instead of meters. The change eases in over
 * `easeTime` seconds. A reader's option (what to look at), not a property of the data.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE, topNode, trackSelection } from "./shared";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Focus By Hop", ...labMeta };

interface Args extends GraphArgs {
    sharpHops: number;
    falloffHops: number;
    blur: number;
    minAlpha: number;
    gray: number;
    easeTime: number;
}

// 0 = in focus, 1 = fully out of focus, for hop h (unreached counts as far), eased in after a click
const COMMON = `
float farness(float h) {
    if (selectedNode < 0.0) return 0.0;
    return h < 0.0 ? 1.0 : smoothstep(sharpHops, sharpHops + falloffHops, h);
}
float unfocus(float h) {
    float far = farness(h);
    float e = clamp((time - selectTime) / max(easeTime, 0.001), 0.0, 1.0);
    return far * e * e * (3.0 - 2.0 * e);
}
`;

// Two passes of the same shader: in-focus nodes opaque (they write depth, so nothing blurry draws
// over them), out-of-focus nodes alpha-blended over them.
const nodeFragment = (blurPass: boolean): string => `
${COMMON}
${SHADE}
void main() {
    if ((farness(vInfo.z) > 0.001) != ${blurPass}) discard;
    float f = unfocus(vInfo.z);
    float r = length(vUV);
    // a defocused disc: the edge widens into a soft falloff, scaled by on-screen size
    float soft = fwidth(r) + f * blur;
    float a = 1.0 - smoothstep(1.0 - soft, 1.0 + soft, r);
    if (a <= 0.003) discard;
    vec3 n = vec3(vUV / max(r, 1.0), -sqrt(max(0.0, 1.0 - min(r * r, 1.0))));
    vec3 c = labShade(n, vColor.rgb);
    // out of focus: flatten the shading (a blurred sphere loses its highlight) and desaturate
    c = mix(c, vec3(luminance(vColor.rgb) * 0.8), f * gray);
    c = mix(c, vec3(1.0), 0.4 * vState.x + 0.5 * vState.y * smoothstep(0.75, 0.95, r));
    gl_FragColor = vec4(c, a * mix(1.0, minAlpha, f));
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    vec2 hops = vCustom.xy;
    float h = hops.x < 0.0 || hops.y < 0.0 ? -1.0 : max(hops.x, hops.y);
    float f = unfocus(h);
    float w = fwidth(vSide) + f * 1.2 * blur;
    float cov = 1.0 - smoothstep(1.0 - w, 1.0 + w, abs(vSide));
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    c = mix(c, vec3(luminance(c) * 0.7), f * gray);
    float inFocus = selectedNode >= 0.0 ? 1.0 - f : 0.0;
    gl_FragColor = vec4(c * (1.0 + 0.4 * inFocus), cov * mix(0.55 + 0.35 * inFocus, minAlpha * 0.6, f));
}
`;

export const FocusByHop = {
    args: {
        ...graphArgs,
        edgeWidth: 2,
        sharpHops: 1,
        falloffHops: 2,
        blur: 0.6,
        minAlpha: 0.15,
        gray: 0.85,
        easeTime: 0.3,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        sharpHops: range(0, 5, 1),
        falloffHops: range(0.5, 6, 0.5),
        blur: range(0, 1.5),
        minAlpha: range(0, 1),
        gray: range(0, 1),
        easeTime: range(0, 2),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#0d0f16",
            uniforms: {
                sharpHops: args.sharpHops,
                falloffHops: args.falloffHops,
                blur: args.blur,
                minAlpha: args.minAlpha,
                gray: args.gray,
                easeTime: args.easeTime,
            },
            // soft edges need room outside the disc
            nodeLayer: { fragment: nodeFragment(false), quadScale: 1.8 },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                addNodeOverlay(ctx, { name: "blurred", fragment: nodeFragment(true), quadScale: 1.8, blend: "alpha" });
                trackSelection(ctx, 0);
                ctx.select(topNode(ctx));
            },
        }),
};

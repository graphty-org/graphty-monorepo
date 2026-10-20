/**
 * Fresnel rim selection glow: a sphere's edge faces away from you, so pow(1 - N.V, k) is a free
 * "rim" that hugs the silhouette. The hovered node gets a cool rim, the selected node a warm one
 * that eases in with a little overshoot and then breathes, its direct neighbors a thinner echo,
 * and an analytic additive halo (no blur pass) spills light just outside the two highlighted
 * spheres. "dim others" fades what is not near the selection, so the highlight reads at once.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { LIGHTING, SOFT_EDGE } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Fresnel Rim Selection", ...labMeta };

interface Args extends GraphArgs {
    rimPower: number;
    intensity: number;
    breath: number;
    halo: number;
    haloFalloff: number;
    hoverColor: string;
    selectColor: string;
    neighbors: number;
    dimOthers: number;
    edgeAlpha: number;
}

const EASE = `
float easeOutBack(float x) { float c1 = 1.70158; float c3 = c1 + 1.0; x = clamp(x, 0.0, 1.0); return 1.0 + c3 * pow(x - 1.0, 3.0) + c1 * pow(x - 1.0, 2.0); }
`;

const NODE_FRAGMENT = `${LIGHTING}${EASE}
void main() {
    vec3 n = labSphereNormal();
    vec3 l = labLight();
    float ndv = max(-n.z, 0.0);
    vec3 base = mix(vColor.rgb, vec3(luminance(vColor.rgb)), 0.25);
    vec3 c = base * (0.22 + 0.7 * max(dot(n, l), 0.0)) + vec3(0.25) * pow(max(dot(normalize(l + vec3(0.0, 0.0, -1.0)), n), 0.0), 40.0);
    float edge = 1.0 - ndv;
    float grow = easeOutBack((time - selectTime) * 2.5);
    float breathe = 0.5 + 0.5 * sin(time * breath * TAU);
    float rimSel = pow(edge, mix(rimPower * 1.5, rimPower * 0.6, breathe)) * vState.y * grow;
    float rimHov = pow(edge, rimPower) * vState.x * smoothstep(0.0, 0.25, time - hoverTime);
    float isNb = abs(vInfo.z - 1.0) < 0.5 ? 1.0 : 0.0;
    float rimNb = pow(edge, rimPower * 1.8) * isNb * neighbors * grow;
    bool near = vInfo.z >= 0.0 && vInfo.z < 1.5;
    if (selectedNode >= 0.0 && !near && vState.x < 0.5) c *= 1.0 - dimOthers;
    c += selectColor * (rimSel + rimNb) * intensity + hoverColor * rimHov * intensity;
    gl_FragColor = vec4(c, 1.0);
}
`;

const HALO_VERTEX = `${EASE}
void main() {
    bool sel = haloSlot > 0.5;
    float idx = sel ? selectedNode : hoverNode;
    float sz = sel ? selSize : hoverSize;
    vAge = time - (sel ? selectTime : hoverTime);
    vSlot = haloSlot;
    if (idx < 0.0 || (!sel && hoverNode == selectedNode)) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vUV = vec2(0.0);
        return;
    }
    vec4 vc = view * vec4(sel ? selectedPos : hoverPos, 1.0);
    float rad = nodeRadius * nodeSize * sz;
    float spread = 1.0 + 3.0 * halo;
    gl_Position = projection * (vc + vec4(position.xy * rad * spread, 0.0, 0.0));
    vUV = position.xy * spread;
}
`;

const HALO_FRAGMENT = `${EASE}
void main() {
    float r = length(vUV);
    if (r < 0.98) discard;
    float breathe = 0.5 + 0.5 * sin(time * breath * TAU);
    float k = haloFalloff * (vSlot > 0.5 ? mix(1.3, 0.75, breathe) : 1.0);
    float g = exp(-(r - 1.0) * k) * smoothstep(0.98, 1.02, r);
    float grow = vSlot > 0.5 ? easeOutBack(vAge * 2.5) : smoothstep(0.0, 0.25, vAge);
    vec3 col = vSlot > 0.5 ? selectColor : hoverColor;
    gl_FragColor = vec4(col * g * grow * intensity * 0.8, 1.0);
}
`;

export const FresnelRimSelection = {
    args: {
        ...graphArgs,
        nodeSize: 1.3,
        rimPower: 2.5,
        intensity: 2.4,
        breath: 0.6,
        halo: 0.9,
        haloFalloff: 4,
        hoverColor: "#66ccff",
        selectColor: "#ffb340",
        neighbors: 0.7,
        dimOthers: 0.55,
        edgeAlpha: 0.2,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        rimPower: range(0.5, 8),
        intensity: range(0, 4),
        breath: range(0, 3),
        halo: range(0, 1.5),
        haloFalloff: range(1, 15),
        hoverColor: { control: "color" },
        selectColor: { control: "color" },
        neighbors: range(0, 1.5),
        dimOthers: range(0, 0.9),
        edgeAlpha: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#090b12",
            uniforms: {
                rimPower: args.rimPower,
                intensity: args.intensity,
                breath: args.breath,
                halo: args.halo,
                haloFalloff: args.haloFalloff,
                hoverColor: args.hoverColor,
                selectColor: args.selectColor,
                neighbors: args.neighbors,
                dimOthers: args.dimOthers,
                edgeAlpha: args.edgeAlpha,
                hoverSize: 1,
                selSize: 1,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: SOFT_EDGE },
            setup: (ctx) => {
                const halo = ctx.addInstances({
                    name: "halo",
                    count: 2,
                    attributes: { haloSlot: [1, Float32Array.from([0, 1])] },
                    varyings: "varying vec2 vUV;\nvarying float vAge;\nvarying float vSlot;\n",
                    vertex: HALO_VERTEX,
                    fragment: HALO_FRAGMENT,
                    blend: "add",
                });
                halo.mesh.renderingGroupId = 1;
                // the halo needs the hovered and selected nodes' sizes, which only the node buffers hold
                ctx.onFrame(() => {
                    const { nodes } = ctx;
                    if (!nodes) {
                        return;
                    }
                    const state = nodes.buffers.nodeState;
                    const info = nodes.buffers.nodeInfo;
                    for (let i = 0; i < ctx.graph.n; i++) {
                        if (state[i * 4] > 0.5) {
                            ctx.set("hoverSize", info[i * 4 + 3]);
                        }
                        if (state[i * 4 + 1] > 0.5) {
                            ctx.set("selSize", info[i * 4 + 3]);
                        }
                    }
                });
            },
        }),
};

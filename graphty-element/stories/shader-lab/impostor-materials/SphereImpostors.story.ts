/**
 * Ray-cast sphere impostors: every node is two triangles, and the fragment shader works out
 * where the view ray hits a sphere, so the result is a perfectly round, correctly lit ball that
 * also writes its true depth (spheres that overlap cut into each other like real ones). The
 * "cloud" control swaps the graph for a galaxy of up to 200,000 nodes in one draw call.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { cloudGraph, LIGHTING, SOFT_EDGE } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Sphere Impostors", ...labMeta };

const COLOR_BY = ["community", "rank", "value", "degree"] as const;

interface Args extends GraphArgs {
    cloud: number;
    colorBy: (typeof COLOR_BY)[number];
    lightAngle: number;
    shininess: number;
    specular: number;
    rim: number;
    rimColor: string;
    ambient: number;
    edgeAlpha: number;
}

const NODE_FRAGMENT = `${LIGHTING}
vec3 baseColor() {
    if (colorBy < 0.5) return vColor.rgb;
    float v = colorBy < 1.5 ? sqrt(vData.y) : (colorBy < 2.5 ? vData.z : sqrt(vData.x));
    return viridis(v);
}
void main() {
    vec3 n = labSphereNormal();
    vec3 v = -labEyeRay(n);
    float a = lightAngle * TAU;
    vec3 l = normalize(vec3(cos(a) * 0.8, 0.6, sin(a) * 0.8 - 0.4));
    vec3 h = normalize(l + v);
    float ndl = max(dot(n, l), 0.0);
    float ndv = max(dot(n, v), 0.0);
    vec3 base = baseColor();
    // hemisphere ambient: cool from above, warm bounce from below
    vec3 amb = mix(vec3(0.20, 0.17, 0.15), vec3(0.32, 0.36, 0.45), n.y * 0.5 + 0.5) * ambient * 2.0;
    vec3 c = base * (amb + ndl * 0.95);
    c += specular * pow(max(dot(n, h), 0.0), shininess) * vec3(1.0);
    c += rimColor * rim * pow(1.0 - ndv, 3.0);
    c = mix(c, c + vec3(0.35), vState.x);
    float ring = smoothstep(0.82, 0.86, length(vUV)) * vState.y;
    c = mix(c, vec3(1.0, 0.95, 0.6), ring);
    gl_FragColor = vec4(labTone(c * 1.1), 1.0);
}
`;

export const SphereImpostors = {
    args: {
        ...graphArgs,
        graph: "large",
        cloud: 0,
        colorBy: "community",
        lightAngle: 0.15,
        shininess: 48,
        specular: 0.6,
        rim: 0.35,
        rimColor: "#9fc4ff",
        ambient: 0.45,
        edgeAlpha: 0.18,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        cloud: {
            control: "select",
            options: [0, 20000, 100000, 200000],
            labels: { 0: "off (use the graph)" },
        },
        colorBy: { control: "inline-radio", options: COLOR_BY },
        lightAngle: range(0, 1),
        shininess: range(2, 256, 1),
        specular: range(0, 2),
        rim: range(0, 2),
        rimColor: { control: "color" },
        ambient: range(0, 1),
        edgeAlpha: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.cloud > 0 ? cloudGraph(args.cloud) : args.graph,
            nodes: args.nodes,
            dim: args.cloud > 0 ? 3 : args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#07080d",
            uniforms: {
                colorBy: COLOR_BY.indexOf(args.colorBy),
                lightAngle: args.lightAngle,
                shininess: args.shininess,
                specular: args.specular,
                rim: args.rim,
                rimColor: args.rimColor,
                ambient: args.ambient,
                edgeAlpha: args.edgeAlpha,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: args.cloud > 0 ? false : { fragment: SOFT_EDGE },
        }),
};

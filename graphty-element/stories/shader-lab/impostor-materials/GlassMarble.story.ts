/**
 * Glass marble with an inner swirl: the view ray is bent (refracted) where it enters the sphere,
 * then marched through the inside, gathering color from twisted "cat's eye" ribbons in the
 * community's color. The ribbons are fixed in world space, so they shift and bend as the camera
 * moves, and the glass reflects a studio environment at grazing angles (fresnel).
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { LIGHTING, SOFT_EDGE } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Glass Marble", ...labMeta };

interface Args extends GraphArgs {
    ior: number;
    vanes: number;
    twist: number;
    thickness: number;
    spin: number;
    secondColor: string;
    glassTint: string;
    reflection: number;
    edgeAlpha: number;
}

const NODE_FRAGMENT = `${LIGHTING}
const int STEPS = 28;
void main() {
    vec3 n = labSphereNormal();
    vec3 rd = labEyeRay(n);
    float ndv = max(dot(n, -rd), 0.0);
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    vec3 reflC = labStudio(labToWorld(reflect(rd, n)));

    vec3 t = refract(rd, n, 1.0 / ior);
    float chord = max(-2.0 * dot(n, t), 0.0);
    float spinA = time * spin + vInfo.x * TAU;
    float tilt = (vInfo.x - 0.5) * 1.6;
    vec3 acc = vec3(0.0);
    float trans = 1.0;
    // a per-pixel start offset turns the layered slices of a fixed-step march into fine grain
    float jitter = hash12(gl_FragCoord.xy);
    for (int i = 0; i < STEPS; i++) {
        float s = (float(i) + jitter) / float(STEPS) * chord;
        vec3 q = labToWorld(n + t * s);
        q.xy = rot2(tilt) * q.xy;
        q.xz = rot2(spinA) * q.xz;
        float rho = length(q.xz);
        float ang = atan(q.z, q.x) + twist * q.y;
        float vane = abs(sin(ang * vanes * 0.5)) * rho;
        float dens = (1.0 - smoothstep(thickness * 0.4, thickness, vane)) * (1.0 - smoothstep(0.55, 0.8, length(q)));
        float idx = mod(floor(ang * vanes / TAU + 0.5), 2.0);
        vec3 col = idx < 0.5 ? vColor.rgb * 1.25 : secondColor;
        col *= 0.75 + 0.5 * (1.0 - s / max(chord, 1e-3));
        float a = clamp(dens * 0.3, 0.0, 1.0);
        acc += trans * a * col;
        trans *= 1.0 - a;
    }
    vec3 e = n + t * chord;
    vec3 outDir = refract(t, -e, ior);
    if (dot(outDir, outDir) < 1e-4) outDir = reflect(t, -e);
    // what shows through: a soft gradient rather than the studio, whose horizon and softboxes
    // read as a black wedge and stray squares inside the glass
    vec3 ow = labToWorld(outDir);
    vec3 tint = mix(glassTint, vColor.rgb, 0.3);
    vec3 behind = tint * mix(vec3(0.3, 0.29, 0.32), vec3(0.7, 0.75, 0.85), smoothstep(-0.7, 0.8, ow.y));
    behind += tint * 0.6 * pow(max(dot(ow, labToWorld(labLight())), 0.0), 6.0);
    vec3 inside = acc + trans * behind;
    vec3 c = mix(inside, reflC, clamp(fres * reflection, 0.0, 1.0));
    vec3 l = labLight();
    c += vec3(1.2) * pow(max(dot(reflect(rd, n), l), 0.0), 300.0);
    c = mix(c, c + vec3(0.25), vState.x);
    c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.88, 0.93, length(vUV)) * vState.y);
    gl_FragColor = vec4(labTone(c), 1.0);
}
`;

export const GlassMarble = {
    args: {
        ...graphArgs,
        nodeSize: 1.3,
        ior: 1.5,
        vanes: 4,
        twist: 2.2,
        thickness: 0.12,
        spin: 0.25,
        secondColor: "#f2efe6",
        glassTint: "#cfe6ff",
        reflection: 1,
        edgeAlpha: 0.2,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        ior: range(1, 2.4),
        vanes: range(2, 10, 2),
        twist: range(0, 8),
        thickness: range(0.02, 0.4),
        spin: range(0, 2),
        secondColor: { control: "color" },
        glassTint: { control: "color" },
        reflection: range(0, 2),
        edgeAlpha: range(0, 1),
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
                ior: args.ior,
                vanes: args.vanes,
                twist: args.twist,
                thickness: args.thickness,
                spin: args.spin,
                secondColor: args.secondColor,
                glassTint: args.glassTint,
                reflection: args.reflection,
                edgeAlpha: args.edgeAlpha,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: SOFT_EDGE },
        }),
};

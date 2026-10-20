/**
 * Eyeball that watches you: every node is an eye. The iris is placed on the sphere where the
 * gaze direction points out of it, so turning the gaze toward the cursor (or, with "watch
 * selected", toward the clicked node) rolls the eye. The iris has radial fibers in the node's
 * community color, the sclera has faint veins, a hovered node's pupil dilates, and eyelids blink
 * at random moments.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { LIGHTING, SOFT_EDGE } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Eyeball", ...labMeta };

interface Args extends GraphArgs {
    irisSize: number;
    pupil: number;
    dilate: number;
    reach: number;
    blinkEvery: number;
    sleepy: number;
    veins: number;
    watchSelected: boolean;
    skin: string;
    edgeAlpha: number;
}

const NODE_FRAGMENT = `${LIGHTING}
vec3 gazeDir() {
    vec3 g;
    vec4 cc = projection * vec4(vCenterView, 1.0);
    vec2 cpx = (cc.xy / cc.w * 0.5 + 0.5) * resolution;
    bool isSel = abs(vInfo.y - selectedNode) < 0.5;
    if (watchSelected > 0.5 && selectedNode >= 0.0 && !isSel) {
        g = normalize((view * vec4(selectedPos, 1.0)).xyz - vCenterView);
    } else if (mouse.x >= 0.0) {
        vec2 d = (mouse - cpx) / resolution.y;
        g = normalize(vec3(d * reach, -1.0));
    } else {
        float t = time * 0.35;
        g = normalize(vec3(noise(vec2(t, vInfo.x * 50.0)) - 0.5, noise(vec2(t + 9.0, vInfo.x * 31.0)) - 0.5, -1.0));
    }
    g.z = min(g.z, -0.2);
    return normalize(g);
}
void main() {
    vec3 n = labSphereNormal();
    vec3 l = labLight();
    vec3 g = gazeDir();
    float ang = acos(clamp(dot(n, g), -1.0, 1.0));
    float rho = ang / irisSize;
    vec3 u = normalize(cross(g, vec3(0.0, 1.0, 0.0)));
    vec3 v = cross(u, g);
    float phi = atan(dot(n, v), dot(n, u));
    vec2 ring = vec2(cos(phi), sin(phi));
    float seed = vInfo.x * 40.0;

    // sclera with veins creeping in from the back
    vec3 nw = labToWorld(n);
    float vn = abs(noise(nw * 3.5 + seed) - 0.5);
    float vw = max(0.02, fwidth(vn) * 1.5);
    float vein = (1.0 - smoothstep(0.0, vw, vn)) * smoothstep(1.4, 3.2, rho) * veins * smoothstep(14.0, 40.0, vPixelRadius);
    vec3 c = mix(vec3(0.96, 0.93, 0.9), vec3(0.75, 0.12, 0.12), vein);
    c *= mix(vec3(1.0), vec3(0.9, 0.85, 0.85), smoothstep(1.0, 3.0, rho));

    // iris: radial fibers, a bright collarette, a dark limbal ring
    float hovered = abs(vInfo.y - hoverNode) < 0.5 ? smoothstep(0.0, 0.35, time - hoverTime) : 0.0;
    float pr = pupil * (1.0 + dilate * hovered);
    float fib = noise(vec3(ring * 22.0, rho * 3.0 + seed));
    float fib2 = fbm(vec3(ring * 4.0, rho * 2.0 + seed));
    vec3 base = vColor.rgb;
    vec3 iris = mix(mix(base, vec3(1.0, 0.8, 0.4), 0.35) * 1.3, base * 0.55, smoothstep(pr, 1.0, rho));
    iris *= 0.55 + 0.7 * fib * (0.6 + 0.8 * fib2);
    iris *= 1.0 - 0.75 * smoothstep(0.82, 1.0, rho);
    float irisMask = 1.0 - smoothstep(0.97, 1.03, rho);
    c = mix(c, iris, irisMask);
    float pupilMask = 1.0 - smoothstep(pr - 0.03, pr + 0.03, rho);
    c = mix(c, vec3(0.02, 0.02, 0.04), pupilMask);

    // light: soft diffuse plus a wet catchlight on the cornea
    c *= 0.35 + 0.75 * clamp(dot(n, l) * 0.6 + 0.5, 0.0, 1.0);
    vec3 h = normalize(l + vec3(0.0, 0.0, -1.0));
    c += vec3(1.0) * pow(max(dot(n, h), 0.0), 220.0) * 1.5;
    c += vec3(0.25) * pow(max(dot(n, h), 0.0), 25.0) * irisMask;

    // eyelids: a resting upper lid and random blinks
    float phase = time / blinkEvery + vInfo.x * 13.0;
    float cyc = floor(phase);
    float tIn = fract(phase) * blinkEvery - hash11(cyc + vInfo.x * 91.0) * max(blinkEvery - 0.3, 0.0);
    float close = (tIn > 0.0 && tIn < 0.24) ? sin(tIn / 0.24 * PI) : 0.0;
    float lidLine = mix(0.95 - sleepy, -1.05, close) - 0.18 * vUV.x * vUV.x;
    float lid = smoothstep(lidLine - 0.02, lidLine + 0.02, vUV.y);
    vec3 skinC = skin * (0.45 + 0.6 * clamp(dot(n, l) * 0.6 + 0.5, 0.0, 1.0));
    float lash = (1.0 - smoothstep(0.0, 0.07, abs(vUV.y - lidLine))) * step(lidLine, 0.99);
    c = mix(c, skinC, lid);
    c = mix(c, vec3(0.05, 0.03, 0.03), lash);
    c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.9, 0.95, length(vUV)) * vState.y);
    gl_FragColor = vec4(c, 1.0);
}
`;

export const Eyeball = {
    args: {
        ...graphArgs,
        nodeSize: 1.5,
        irisSize: 0.52,
        pupil: 0.38,
        dilate: 0.7,
        reach: 3,
        blinkEvery: 4,
        sleepy: 0.15,
        veins: 0.7,
        watchSelected: true,
        skin: "#c98f76",
        edgeAlpha: 0.15,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        irisSize: range(0.25, 0.9),
        pupil: range(0.1, 0.8),
        dilate: range(0, 1.2),
        reach: range(0.5, 8),
        blinkEvery: range(1, 15),
        sleepy: range(0, 1),
        veins: range(0, 1),
        watchSelected: { control: "boolean" },
        skin: { control: "color" },
        edgeAlpha: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#0c0a0d",
            uniforms: {
                irisSize: args.irisSize,
                pupil: args.pupil,
                dilate: args.dilate,
                reach: args.reach,
                blinkEvery: args.blinkEvery,
                sleepy: args.sleepy,
                veins: args.veins,
                watchSelected: args.watchSelected,
                skin: args.skin,
                edgeAlpha: args.edgeAlpha,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: SOFT_EDGE },
        }),
};

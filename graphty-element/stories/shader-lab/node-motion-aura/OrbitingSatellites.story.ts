/**
 * Orbiting satellites: tiny moons circle each node. The number of moons is a count you can read
 * at a glance (here degree, 1 to `maxMoons`), and how fast they go is activity (here the node's
 * value). The orbits are tilted rings seen in perspective; a moon passing behind its planet is
 * hidden by it. Everything is drawn by one additive overlay quad per node.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE } from "./shared";

export default { title: "Shader Lab/Hop Data Hover Motion And Auras/Orbiting Satellites", ...labMeta };

interface Args extends GraphArgs {
    maxMoons: number;
    speed: number;
    orbit: number;
    tilt: number;
    moonSize: number;
    moonColor: string;
    ringOpacity: number;
}

const NODE_FRAGMENT = `
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    vec3 c = labShade(n, vColor.rgb);
    c = mix(c, vec3(1.0), 0.35 * vState.x + 0.5 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

// Quad spans +-QUAD node radii. Moon k sits on an ellipse (the orbit circle tilted toward us).
const MOON_FRAGMENT = `
void main() {
    float count = floor(1.0 + vData.x * (maxMoons - 1.0) + 0.5);
    float spin = speed * (0.25 + 1.5 * vData.z);
    float R = orbit;
    float ct = cos(tilt);
    // each node's orbit plane turns a little, so neighbors do not move in lockstep
    mat2 turn = rot2(vInfo.x * TAU);
    vec2 p = turn * vUV;
    // the orbit ring
    vec2 q = vec2(p.x, p.y / max(ct, 0.05));
    float ringD = abs(length(q) - R) * ct;
    float behindRing = step(0.0, p.y) * step(length(vUV), 1.0);
    vec3 col = vColor.rgb * mix(vec3(1.0), moonColor, 0.5) * exp(-ringD * ringD * 900.0) * ringOpacity * (1.0 - behindRing);
    float glow = 0.0;
    vec3 moons = vec3(0.0);
    for (int k = 0; k < 12; k++) {
        if (float(k) >= count) break;
        float a = time * spin + float(k) * TAU / count + vInfo.x * 17.0;
        vec2 m = vec2(cos(a), sin(a) * ct) * R;
        // moons behind the planet (upper half of the tilted ring, inside its disc) are hidden
        bool behind = sin(a) > 0.0 && length(m) < 1.0;
        // moons nearer to us look bigger
        float sz = moonSize * (1.0 - 0.25 * sin(a) * sin(tilt));
        float d = length(p - m);
        float core = 1.0 - smoothstep(sz - fwidth(d), sz + fwidth(d), d);
        float halo = exp(-d * d / (sz * sz * 6.0)) * 0.25;
        if (behind) { core *= 0.0; halo *= 0.15; }
        // lit moon: brighter on the side facing the planet's key light
        vec2 lp = (p - m) / sz;
        float shade = 0.55 + 0.45 * clamp(dot(lp, vec2(-0.6, 0.6)), -1.0, 1.0);
        moons += moonColor * (core * shade * 1.2 + halo);
        // a faint trail behind each moon along the orbit
        float ang = atan(q.y, q.x);
        float lag = mod(a - ang, TAU);
        glow += exp(-ringD * ringD * 1600.0) * exp(-lag * 3.0) * (1.0 - behindRing) * 0.4;
    }
    col += moons + moonColor * glow;
    float lum = max(col.r, max(col.g, col.b));
    if (lum < 0.003) discard;
    gl_FragColor = vec4(col, 1.0);
}
`;

export const OrbitingSatellites = {
    args: {
        ...graphArgs,
        nodeSize: 0.8,
        edgeWidth: 1,
        maxMoons: 5,
        speed: 1.5,
        orbit: 2.1,
        tilt: 1.05,
        moonSize: 0.2,
        moonColor: "#cfe8ff",
        ringOpacity: 0.35,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        maxMoons: range(1, 12, 1),
        speed: range(0, 6),
        orbit: range(1.3, 3.2),
        tilt: range(0, 1.5),
        moonSize: range(0.05, 0.5),
        moonColor: { control: "color" },
        ringOpacity: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#05060c",
            uniforms: {
                maxMoons: args.maxMoons,
                speed: args.speed,
                orbit: args.orbit,
                tilt: args.tilt,
                moonSize: args.moonSize,
                moonColor: args.moonColor,
                ringOpacity: args.ringOpacity,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            setup: (ctx) => {
                // lifted toward the camera so moons in front are not hidden by the planet's own depth
                addNodeOverlay(ctx, { name: "moons", fragment: MOON_FRAGMENT, quadScale: 3.4, lift: 1.1 });
            },
        }),
};

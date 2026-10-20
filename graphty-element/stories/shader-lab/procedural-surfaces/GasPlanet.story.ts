/**
 * Every node is a rotating gas giant: domain-warped latitude bands in its community's colors,
 * a swirling storm on outliers (value above a threshold) and rings on hubs (degree above a
 * threshold). The sphere is ray-cast in the fragment shader; the ring is the view ray hitting the
 * planet's equatorial plane. An additive halo layer draws the atmosphere glow.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addHalo, DIM_EDGE_FRAGMENT, SURFACE_GLSL } from "./common";

export default { title: "Shader Lab/Procedural Surfaces/Gas Planet", ...labMeta };

interface Args extends GraphArgs {
    bands: number;
    turbulence: number;
    spin: number;
    stormThreshold: number;
    ringThreshold: number;
    atmosphere: number;
    hueShift: number;
}

const NODE_FRAGMENT = `${SURFACE_GLSL}
void main() {
    float rnd = vInfo.x;
    // the planet's spin axis in world space, tilted a little per node
    float tilt = 0.12 + 0.45 * hash11(rnd * 91.7 + 3.0);
    float az = TAU * hash11(rnd * 13.1 + 1.0);
    vec3 axis = normalize(vec3(sin(tilt) * cos(az), cos(tilt), sin(tilt) * sin(az)));
    vec3 bx = normalize(vec3(1.0, 0.0, 0.0) - axis * axis.x);
    vec3 bz = cross(axis, bx);
    vec3 axisV = normalize((view * vec4(axis, 0.0)).xyz);
    vec3 L = normalize(LIGHT_DIR);
    float r2 = dot(vUV, vUV);

    // ---- ring: the view ray (orthographic) meets the equatorial plane ----
    float ringA = 0.0; vec3 ringC = vec3(0.0); float ringZ = 1e5;
    if (vData.x >= ringThreshold) {
        float nz = abs(axisV.z) < 0.03 ? (axisV.z < 0.0 ? -0.03 : 0.03) : axisV.z;
        float z = -(vUV.x * axisV.x + vUV.y * axisV.y) / nz;
        vec3 p = vec3(vUV, z);
        float rr = length(p);
        if (rr > 1.3 && rr < 2.25) {
            float dens = 0.55 + 0.45 * noise(vec2(rr * 18.0, rnd * 40.0)) * (0.7 + 0.3 * sin(rr * 9.0 + rnd * 6.0));
            dens *= smoothstep(1.3, 1.42, rr) * smoothstep(2.25, 2.1, rr);
            dens *= 1.0 - 0.9 * smoothstep(1.8, 1.83, rr) * smoothstep(1.9, 1.87, rr);
            vec3 offAxis = p - L * dot(p, L);
            float shadow = (dot(p, L) < 0.0 && length(offAxis) < 1.0) ? 0.2 : 1.0;
            float tone = 0.75 + 0.25 * hash11(floor(rr * 70.0) + rnd);
            ringC = mix(vec3(0.9, 0.82, 0.68), vColor.rgb, 0.4) * tone * shadow * (0.45 + 0.75 * abs(dot(axisV, L)));
            ringA = dens;
            ringZ = z;
        }
    }

    vec3 col;
    if (r2 < 1.0) {
        vec3 n = vec3(vUV, -sqrt(1.0 - r2));
        vec3 w = toWorld(n);
        float lat = dot(w, axis);
        float lon = atan(dot(w, bz), dot(w, bx)) + time * spin * (0.5 + rnd);
        float cl = sqrt(max(1.0 - lat * lat, 0.0));
        vec3 p = vec3(cos(lon) * cl, lat, sin(lon) * cl);

        // storm: swirl the sample point around a fixed spot on the planet
        float stormOn = step(stormThreshold, vData.z);
        float b0 = -0.3 + 0.25 * hash11(rnd * 7.7);
        vec3 s = normalize(vec3(cos(b0), b0, 0.2));
        float ds = distance(p, s);
        float sr = 0.46;
        float sw = stormOn * pow(smoothstep(sr, 0.0, ds), 1.5) * 7.0;
        vec3 q = p - s;
        vec3 qr = q * cos(sw) + cross(s, q) * sin(sw) + s * dot(s, q) * (1.0 - cos(sw));
        vec3 ps = s + qr;

        vec3 wp = ps * 2.2 + rnd * 37.0;
        float warp = fbm(wp + vec3(0.0, 0.0, time * 0.05));
        float lat2 = ps.y;
        float b = lat2 * bands + turbulence * (warp * 2.0 - 1.0) * 2.5
                + 0.8 * fbm(vec3(lat2 * bands * 0.5, wp.xz * 0.6));
        float stripe = 0.5 + 0.5 * sin(b);
        float fine = fbm(vec3(lat2 * bands * 2.5, ps.xz * 5.0) + warp * 2.0);
        vec3 tint = palette(rnd * 0.25 + hueShift + vData.w * 0.11,
            vec3(0.62, 0.52, 0.42), vec3(0.32, 0.28, 0.22), vec3(1.0), vec3(0.0, 0.1, 0.2));
        vec3 base = mix(vColor.rgb, tint, 0.5);
        col = mix(base * 0.55, mix(base, vec3(1.0, 0.95, 0.85), 0.35), smoothstep(0.1, 0.9, stripe));
        col = mix(col, base * vec3(1.1, 0.9, 0.8), 0.35 * smoothstep(0.55, 0.8, fbm(vec3(lat2 * 3.0, wp.xz))));
        col *= 0.78 + 0.45 * fine;

        float eye = stormOn * smoothstep(sr * 0.75, sr * 0.3, ds);
        vec3 stormCol = mix(vec3(0.95, 0.42, 0.22), vec3(1.0, 0.8, 0.6), smoothstep(0.0, sr * 0.6, ds + fine * 0.08));
        col = mix(col, stormCol * (0.8 + 0.35 * fine), eye * 0.9);

        float ndl = dot(n, L);
        float lit = smoothstep(-0.2, 0.55, ndl);
        col *= 0.06 + 1.0 * lit;
        float facing = -n.z;
        vec3 sky = mix(vec3(0.45, 0.65, 1.0), vColor.rgb, 0.35);
        col += atmosphere * sky * pow(1.0 - facing, 3.0) * (0.15 + 0.85 * lit);
        col = mix(col, col * 1.4 + 0.08, 0.6 * vState.x);

        if (ringA > 0.12 && ringZ < n.z) {
            col = mix(col, ringC, min(ringA, 0.95));
        }
        depthAt(n);
    } else {
        float rr = sqrt(r2);
        float sel = vState.y * stroke(rr - 1.12, 0.035);
        if (ringA < 0.12 && sel < 0.5) discard;
        col = ringA >= 0.12 ? ringC * (0.35 + 0.65 * ringA) : vec3(0.0);
        col = mix(col, vec3(1.0), sel);
        depthAt(vec3(vUV, ringA >= 0.12 ? ringZ : 0.0));
    }
    if (vState.y > 0.5 && r2 < 1.0) col += vec3(0.25) * smoothstep(0.88, 1.0, sqrt(r2));
    gl_FragColor = vec4(col, 1.0);
}
`;

const HALO_FRAGMENT = `
void main() {
    float r = length(vUV);
    if (r < 0.98) discard;
    vec2 dir = vUV / r;
    float side = 0.45 + 0.55 * max(dot(dir, normalize(vec2(-0.48, 0.56))), 0.0);
    float g = exp(-(r - 1.0) * 9.0) * side;
    vec3 c = mix(vec3(0.45, 0.65, 1.0), vColor.rgb, 0.35);
    gl_FragColor = vec4(c * g * atmosphere * 0.7, 1.0);
}
`;

export const GasPlanet = {
    args: {
        ...graphArgs,
        bands: 13,
        turbulence: 1.1,
        spin: 0.25,
        stormThreshold: 0.72,
        ringThreshold: 0.7,
        atmosphere: 1,
        hueShift: 0,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        bands: range(3, 30, 0.5),
        turbulence: range(0, 2),
        spin: range(0, 2),
        stormThreshold: range(0, 1),
        ringThreshold: range(0, 1),
        atmosphere: range(0, 3),
        hueShift: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#03040a",
            uniforms: {
                bands: args.bands,
                turbulence: args.turbulence,
                spin: args.spin,
                stormThreshold: args.stormThreshold,
                ringThreshold: args.ringThreshold,
                atmosphere: args.atmosphere,
                hueShift: args.hueShift,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, quadScale: 2.3 },
            edgeLayer: { fragment: DIM_EDGE_FRAGMENT },
            setup: (ctx) => {
                addHalo(ctx, HALO_FRAGMENT, 1.5);
            },
        }),
};

/**
 * Cut gemstone with dispersion: the sphere's normal is snapped to the nearest of N facet
 * directions, so the ball shades as flat cut faces that flash as the camera turns. Light bends
 * into each facet a little differently per color channel (dispersion), bounces off a back facet
 * and comes out split into rainbow "fire". Each community is its own jewel color, top-ranked
 * nodes are colorless diamonds, and the best-connected hubs can become mirror-tiled disco balls.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { LIGHTING, SOFT_EDGE } from "./common";

export default { title: "Shader Lab/Sphere Impostors And Lit Materials/Gemstone", ...labMeta };

const CUTS = ["brilliant", "geodesic"] as const;

interface Args extends GraphArgs {
    cut: (typeof CUTS)[number];
    facets: number;
    ior: number;
    dispersion: number;
    sparkle: number;
    diamondRank: number;
    discoHubs: boolean;
    discoDegree: number;
    turn: number;
    edgeAlpha: number;
}

const NODE_FRAGMENT = `${LIGHTING}
vec3 fib(float i, float count) {
    float y = 1.0 - 2.0 * (i + 0.5) / count;
    float r = sqrt(max(0.0, 1.0 - y * y));
    float a = i * 2.39996323;
    return vec3(cos(a) * r, y, sin(a) * r);
}
vec3 ringDir(float elevDeg, float azDeg) {
    float e = radians(elevDeg);
    float az = radians(azDeg);
    return vec3(cos(e) * cos(az), sin(e), cos(e) * sin(az));
}
// the 58 facet normals of a round brilliant cut: table, star, kite, upper girdle, lower girdle,
// pavilion and culet
vec3 brilliant(float i) {
    if (i < 0.5) return vec3(0.0, 1.0, 0.0);
    if (i < 8.5) return ringDir(68.0, (i - 1.0) * 45.0 + 22.5);
    if (i < 16.5) return ringDir(50.0, (i - 9.0) * 45.0);
    if (i < 32.5) return ringDir(36.0, (i - 17.0) * 22.5 + 11.25);
    if (i < 48.5) return ringDir(-42.0, (i - 33.0) * 22.5 + 11.25);
    if (i < 56.5) return ringDir(-55.0, (i - 49.0) * 45.0);
    return vec3(0.0, -1.0, 0.0);
}
// nearest facet direction to d (object space): xyz = facet normal, w = margin to the next facet
vec4 facetOf(vec3 d) {
    float best = -2.0;
    float second = -2.0;
    vec3 bn = d;
    float count = cut > 0.5 ? facets : 58.0;
    for (int i = 0; i < 64; i++) {
        if (float(i) >= count) break;
        vec3 f = cut > 0.5 ? fib(float(i), count) : brilliant(float(i));
        float k = dot(d, f);
        if (k > best) { second = best; best = k; bn = f; } else if (k > second) { second = k; }
    }
    return vec4(bn, best - second);
}
vec3 toObj(vec3 v, float a, float b) { v.xz = rot2(a) * v.xz; v.xy = rot2(b) * v.xy; return v; }
vec3 fromObj(vec3 v, float a, float b) { v.xy = rot2(-b) * v.xy; v.xz = rot2(-a) * v.xz; return v; }
// a contrasty version of the studio: dark surroundings and hot lights make the fire read
vec3 env(vec3 d) { vec3 e = labStudio(d); return pow(e, vec3(1.5)) * 1.4 + vec3(0.05, 0.045, 0.07); }

// one color channel's path through the stone (object space, unit sphere): refract in at p,
// bounce off two back facets, refract out. Each hit looks up the facet where the ray lands, so
// one front facet breaks into a mosaic of colored fragments.
vec3 fire(vec3 p, vec3 iw, vec3 fn, float eta, float ra, float rb) {
    vec3 t = refract(iw, fn, 1.0 / eta);
    for (int k = 0; k < 2; k++) {
        p = normalize(p + t * max(-2.0 * dot(p, t), 0.0));
        vec3 back = fromObj(facetOf(toObj(p, ra, rb)).xyz, ra, rb);
        vec3 out1 = refract(t, -back, eta);
        if (k == 1 && dot(out1, out1) > 1e-4) return env(out1) * 0.9;
        t = reflect(t, back);
    }
    return env(t) * 0.7;
}

vec3 gem(vec3 nw, vec3 iw, vec3 body, float diamond) {
    float ra = vInfo.x * 40.0 + time * turn;
    float rb = vInfo.x * 17.0;
    vec4 fo = facetOf(toObj(nw, ra, rb));
    vec3 fn = fromObj(fo.xyz, ra, rb);
    float disp = dispersion * (1.0 + diamond * 1.5);
    vec3 iorC = ior + disp * vec3(-1.0, 0.0, 1.0);
    vec3 inside = vec3(fire(nw, iw, fn, iorC.x, ra, rb).r, fire(nw, iw, fn, iorC.y, ra, rb).g, fire(nw, iw, fn, iorC.z, ra, rb).b);
    float ndv = max(dot(fn, -iw), 0.0);
    float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
    float fres = f0 + (1.0 - f0) * pow(1.0 - ndv, 5.0);
    vec3 refl = env(reflect(iw, fn));
    vec3 c = inside * mix(body, vec3(1.0), diamond) * (1.0 - fres) + refl * fres;
    // sparkle: a facet that mirrors the key light twinkles
    vec3 lw = labToWorld(labLight());
    float glint = pow(max(dot(reflect(iw, fn), lw), 0.0), 200.0);
    float tw = 0.5 + 0.5 * sin(time * 7.0 + hash13(fo.xyz * 91.0 + vInfo.x) * 60.0);
    c += sparkle * glint * tw * vec3(6.0);
    // facet edges catch a little light
    c += vec3(0.15) * (1.0 - smoothstep(0.0, 0.012, fo.w)) * (0.3 + diamond);
    return c;
}

vec3 disco(vec3 nw, vec3 iw) {
    float spinA = time * 0.4 + vInfo.x * 6.0;
    vec3 d = nw;
    d.xz = rot2(spinA) * d.xz;
    float rows = 14.0;
    float lat = asin(clamp(d.y, -1.0, 1.0));
    float row = floor((lat / PI + 0.5) * rows);
    float latQ = ((row + 0.5) / rows - 0.5) * PI;
    float perRow = max(3.0, floor(rows * 2.0 * cos(latQ)));
    float lon = atan(d.z, d.x);
    float col = floor((lon / TAU + 0.5) * perRow);
    float lonQ = ((col + 0.5) / perRow - 0.5) * TAU;
    vec3 tn = vec3(cos(latQ) * cos(lonQ), sin(latQ), cos(latQ) * sin(lonQ));
    tn.xz = rot2(-spinA) * tn.xz;
    vec2 cellUV = vec2(fract((lat / PI + 0.5) * rows), fract((lon / TAU + 0.5) * perRow));
    float grout = smoothstep(0.0, 0.08, min(min(cellUV.x, 1.0 - cellUV.x), min(cellUV.y, 1.0 - cellUV.y)));
    vec3 r = reflect(iw, normalize(mix(tn, nw, 0.1)));
    // a bright horizon band so the mirror tiles do not mostly reflect the near-black floor
    vec3 c = (labStudio(r) + vec3(0.7, 0.72, 0.8) * exp(-abs(r.y) * 4.0) + vec3(0.08)) * vec3(0.85, 0.88, 0.95);
    float h = hash12(vec2(row, col) + vInfo.x);
    c *= 0.6 + 0.4 * h;
    vec3 lw = labToWorld(labLight());
    c += vec3(8.0) * pow(max(dot(r, lw), 0.0), 120.0) * sparkle;
    return mix(vec3(0.03), c, grout);
}

void main() {
    vec3 n = labSphereNormal();
    vec3 iw = labToWorld(labEyeRay(n));
    vec3 nw = labToWorld(n);
    float isDisco = discoHubs * step(discoDegree, vData.x);
    float diamond = step(1.0 - diamondRank, sqrt(vData.y));
    vec3 body = pow(vColor.rgb, vec3(2.2)) * 2.2;
    vec3 c = isDisco > 0.5 ? disco(nw, iw) : gem(nw, iw, body, diamond);
    c = mix(c, c * 1.4 + 0.1, vState.x);
    c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.88, 0.93, length(vUV)) * vState.y);
    gl_FragColor = vec4(labTone(c), 1.0);
}
`;

export const Gemstone = {
    args: {
        ...graphArgs,
        nodeSize: 1.3,
        cut: "brilliant",
        facets: 22,
        ior: 2.0,
        dispersion: 0.06,
        sparkle: 1,
        diamondRank: 0.12,
        discoHubs: true,
        discoDegree: 0.8,
        turn: 0.15,
        edgeAlpha: 0.15,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        cut: { control: "inline-radio", options: CUTS },
        facets: range(6, 64, 1),
        ior: range(1.2, 2.6),
        dispersion: range(0, 0.25),
        sparkle: range(0, 3),
        diamondRank: range(0, 1),
        discoHubs: { control: "boolean" },
        discoDegree: range(0, 1),
        turn: range(0, 2),
        edgeAlpha: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#06070b",
            uniforms: {
                cut: CUTS.indexOf(args.cut),
                facets: args.facets,
                ior: args.ior,
                dispersion: args.dispersion,
                sparkle: args.sparkle,
                diamondRank: args.diamondRank,
                discoHubs: args.discoHubs,
                discoDegree: args.discoDegree,
                turn: args.turn,
                edgeAlpha: args.edgeAlpha,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: SOFT_EDGE },
        }),
};

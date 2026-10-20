/**
 * Foil shimmer for search matches: search hits wear a holographic foil (thin-film rainbow that
 * shifts with the viewing angle), and every couple of seconds a bright band sweeps across the
 * screen, catching each hit in turn with a glint of sparkles -- like tilting a trading card.
 * Everything else dims a little so the hits pop. Change `query` for a different set of hits.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { NODE_FLAG, SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Foil Shimmer Search", ...labMeta };

interface Args extends GraphArgs {
    query: number;
    matchShare: number;
    sweepSpeed: number;
    bandWidth: number;
    foil: number;
    sparkle: number;
    dimOthers: number;
}

const COMMON = `
${NODE_FLAG}
float isMatch(float i) { return nodeFlag(i, 40.0 + floor(query) * 7.0, matchShare); }
// the sweep band at a screen position: 1 in the band
float band(vec2 frag) {
    vec2 s = frag / resolution.y;
    float x = dot(s, normalize(vec2(1.0, 0.45)));
    float span = resolution.x / resolution.y + 1.0;
    float c = fract(time * sweepSpeed) * (span + 1.0) - 0.5;
    float d = (x - c) / bandWidth;
    return exp(-d * d);
}
// pastel, silvered rainbow: real foil is mostly bright metal with color in thin bands
vec3 thinFilm(float t) { return mix(palette(t, vec3(0.6), vec3(0.4), vec3(1.0), vec3(0.0, 0.33, 0.67)), vec3(0.92, 0.94, 1.0), 0.3); }
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    float m = isMatch(vInfo.y);
    vec3 c = labShade(n, vColor.rgb);
    if (m > 0.5) {
        float b = band(gl_FragCoord.xy);
        // foil hue follows the surface angle, the band position and slow drift
        float t = (n.x * 0.5 + n.y * 0.7 + (1.0 + n.z) * 1.4) + b * 0.5 + vInfo.x + time * 0.06;
        vec3 film = thinFilm(t);
        vec3 lit = labShade(n, mix(vColor.rgb, film, 0.75));
        c = mix(c, lit, foil);
        c += film * b * 0.7 * foil;
        // sparkles: a few cells flash while the band passes
        vec2 cell = floor(vUV * 6.0);
        float tw = hash13(vec3(cell, floor(time * 9.0) + vInfo.y));
        float spark = step(0.86, tw) * b;
        vec2 f = fract(vUV * 6.0) - 0.5;
        float star = exp(-abs(f.x) * 14.0) * exp(-abs(f.y) * 3.0) + exp(-abs(f.y) * 14.0) * exp(-abs(f.x) * 3.0);
        c += vec3(1.0) * spark * star * sparkle;
        // a thin gold-white rim so matches read even between sweeps
        c += vec3(1.0, 0.92, 0.7) * pow(1.0 + n.z, 4.0) * 0.8;
    } else {
        c = mix(c, vec3(luminance(c)) * 0.6, dimOthers);
    }
    c = mix(c, vec3(1.0), 0.3 * vState.x + 0.35 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float ma = isMatch(vInfo.x);
    float mb = isMatch(vInfo.y);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    if (ma > 0.5 && mb > 0.5) {
        float b = band(gl_FragCoord.xy);
        vec3 film = thinFilm(vT * 1.5 + vSide * 0.2 + time * 0.1 + b);
        vec3 col = mix(c, film, 0.6 * foil) + film * b * foil;
        gl_FragColor = vec4(col, cov * (0.75 + 0.25 * b));
        return;
    }
    float touch = max(ma, mb);
    vec3 col = mix(c, vec3(luminance(c)) * 0.6, dimOthers * (1.0 - touch * 0.5));
    col = mix(col, vec3(1.0), 0.4 * lit);
    gl_FragColor = vec4(col, cov * mix(mix(0.5, 0.25, dimOthers), 1.0, max(lit, touch * 0.4)));
}
`;

export const FoilShimmerSearch = {
    args: {
        ...graphArgs,
        query: 1,
        matchShare: 0.15,
        sweepSpeed: 0.35,
        bandWidth: 0.18,
        foil: 0.9,
        sparkle: 1.2,
        dimOthers: 0.55,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        query: range(0, 20, 1),
        matchShare: range(0, 1),
        sweepSpeed: range(0, 2),
        bandWidth: range(0.02, 1),
        foil: range(0, 1),
        sparkle: range(0, 3),
        dimOthers: range(0, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                query: args.query,
                matchShare: args.matchShare,
                sweepSpeed: args.sweepSpeed,
                bandWidth: args.bandWidth,
                foil: args.foil,
                sparkle: args.sparkle,
                dimOthers: args.dimOthers,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
        }),
};

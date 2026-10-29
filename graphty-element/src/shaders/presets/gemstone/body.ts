/**
 * @file The GLSL bodies of the `gemstone` preset (design/rendering/shader-styles.md section 7.1),
 * ported from the shader lab's gemstone.
 *
 * The sphere's normal snaps to the nearest of `facets` directions spread evenly over it, so the
 * ball shades as flat cut faces that flash as it turns. Light bends into a facet a little
 * differently per color channel (`dispersion`), bounces off two back facets and comes out split
 * into rainbow fire, tinted by the node's color. A facet that mirrors the key light twinkles.
 *
 * The lab's per-node choices (colorless diamonds for top-ranked nodes, disco balls for hubs) are
 * left to the layer's selector: the disco ball is its own preset.
 *
 * `LOW_DETAIL` is the small-size program the element draws while the median node on screen is
 * under 12 px: 8 facets and one refraction, no fire.
 */

import { STUDIO } from "../studio";

/** The facets, the object rotation and the contrasty studio both programs share. */
const FACETS = `${STUDIO}
// The i-th of count directions spread evenly over the sphere (a Fibonacci lattice).
vec3 gemFacet(float i, float count) {
    float y = 1.0 - 2.0 * (i + 0.5) / count;
    float r = sqrt(max(0.0, 1.0 - y * y));
    float a = i * 2.39996323;
    return vec3(cos(a) * r, y, sin(a) * r);
}
// The facet nearest to d (object space): xyz its normal, w the margin to the next facet.
vec4 facetOf(vec3 d, float count) {
    float best = -2.0;
    float second = -2.0;
    vec3 bn = d;
    for (int i = 0; i < 64; i++) {
        if (float(i) >= count) break;
        vec3 f = gemFacet(float(i), count);
        float k = dot(d, f);
        if (k > best) { second = best; best = k; bn = f; } else if (k > second) { second = k; }
    }
    return vec4(bn, best - second);
}
vec3 toObj(vec3 v, float a, float b) { v.xz = rot2(a) * v.xz; v.xy = rot2(b) * v.xy; return v; }
vec3 fromObj(vec3 v, float a, float b) { v.xy = rot2(-b) * v.xy; v.xz = rot2(-a) * v.xz; return v; }
// Dark surroundings and hot lights make the fire read.
vec3 env(vec3 d) { vec3 e = studio(d); return pow(e, vec3(1.5)) * 1.4 + vec3(0.05, 0.045, 0.07); }
`;

/** The body: `shade` and its helpers. */
export const BODY = `// Gemstone: flat facets, rainbow fire from per-channel refraction, twinkling glints.
${FACETS}
// One color channel's path through the stone (unit sphere, object rotation ra, rb): refract in,
// bounce off two back facets, refract out.
vec3 fire(vec3 p, vec3 iw, vec3 fn, float eta, float ra, float rb, float count) {
    vec3 t = refract(iw, fn, 1.0 / eta);
    for (int k = 0; k < 2; k++) {
        p = normalize(p + t * max(-2.0 * dot(p, t), 0.0));
        vec3 back = fromObj(facetOf(toObj(p, ra, rb), count).xyz, ra, rb);
        vec3 out1 = refract(t, -back, eta);
        if (k == 1 && dot(out1, out1) > 1e-4) return env(out1) * 0.9;
        t = reflect(t, back);
    }
    return env(t) * 0.7;
}

vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    vec3 iw = n.viewDir;
    float count = float(facets);
    float ra = n.seed * 40.0 + n.time * turn;
    float rb = n.seed * 17.0;
    vec4 fo = facetOf(toObj(nv, ra, rb), count);
    vec3 fn = fromObj(fo.xyz, ra, rb);
    vec3 iorC = ior + dispersion * vec3(-1.0, 0.0, 1.0);
    // One ray per color channel is the expensive part: medium traces red and blue and blends
    // green, low traces one ray for all three.
    int level = Q(0, 1, 2);
    vec3 inside;
    if (level == 0) {
        inside = fire(nv, iw, fn, iorC.y, ra, rb, count);
    } else if (level == 1) {
        vec3 fr = fire(nv, iw, fn, iorC.x, ra, rb, count);
        vec3 fb = fire(nv, iw, fn, iorC.z, ra, rb, count);
        inside = vec3(fr.r, 0.5 * (fr.g + fb.g), fb.b);
    } else {
        inside = vec3(
            fire(nv, iw, fn, iorC.x, ra, rb, count).r,
            fire(nv, iw, fn, iorC.y, ra, rb, count).g,
            fire(nv, iw, fn, iorC.z, ra, rb, count).b
        );
    }

    vec3 body = pow(n.color.rgb, vec3(2.2)) * 2.2;
    float ndv = max(dot(fn, -iw), 0.0);
    float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
    float fres = f0 + (1.0 - f0) * pow(1.0 - ndv, 5.0);
    vec3 c = inside * body * (1.0 - fres) + env(reflect(iw, fn)) * fres;
    float glint = pow(max(dot(reflect(iw, fn), lightDir), 0.0), 200.0);
    float twinkle = 0.5 + 0.5 * sin(n.time * 7.0 + hash13(fo.xyz * 91.0 + n.seed) * 60.0);
    c += sparkle * glint * twinkle * vec3(6.0);
    // Facet edges catch a little light.
    c += vec3(0.05) * (1.0 - smoothstep(0.0, 0.012, fo.w));
    return vec4(studioTone(c), 1.0);
}
`;

/** The small-size program: 8 facets, one refraction and a glint. */
export const LOW_DETAIL = `// Gemstone, small: 8 facets, one refraction.
${FACETS}
vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    vec3 iw = n.viewDir;
    float ra = n.seed * 40.0 + n.time * turn;
    float rb = n.seed * 17.0;
    vec3 fn = fromObj(facetOf(toObj(nv, ra, rb), 8.0).xyz, ra, rb);
    vec3 body = pow(n.color.rgb, vec3(2.2)) * 2.2;
    float ndv = max(dot(fn, -iw), 0.0);
    float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
    float fres = f0 + (1.0 - f0) * pow(1.0 - ndv, 5.0);
    vec3 c = env(refract(iw, fn, 1.0 / ior)) * 0.6 * body * (1.0 - fres) + env(reflect(iw, fn)) * fres;
    c += sparkle * pow(max(dot(reflect(iw, fn), lightDir), 0.0), 60.0) * vec3(2.0);
    return vec4(studioTone(c), 1.0);
}
`;

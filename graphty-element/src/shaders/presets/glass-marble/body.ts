/**
 * @file The GLSL bodies of the `glass-marble` preset (design/rendering/shader-styles.md section
 * 7.1), ported from the shader lab's glass marble.
 *
 * The view ray bends where it enters the sphere and is marched through the inside, gathering
 * color from twisted "cat's eye" ribbons: half in the node's color, half in `secondColor`. The
 * glass reflects a studio at grazing angles (fresnel) and lets a soft tinted light through.
 *
 * `LOW_DETAIL` is the small-size program the element draws while the median node on screen is
 * under 12 px: flat fresnel glass, no march.
 */

import { STUDIO } from "../studio";

/** The body: `shade` and its helpers. */
export const BODY = `// Glass marble: refracted ray march through twisted ribbons, studio reflections.
${STUDIO}
const float TAU = 6.28318531;

vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    vec3 rd = n.viewDir;
    float ndv = max(dot(nv, -rd), 0.0);
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    vec3 reflC = studio(reflect(rd, nv));

    vec3 t = refract(rd, nv, 1.0 / ior);
    float chord = max(-2.0 * dot(nv, t), 0.0);
    float spinA = n.time * spin + n.seed * TAU;
    float tilt = (n.seed - 0.5) * 1.6;
    float fv = float(vanes);
    vec3 acc = vec3(0.0);
    float trans = 1.0;
    // A per-pixel start offset turns the layered slices of a fixed-step march into fine grain.
    float jitter = hash12(n.uv * 317.0 + n.seed * 13.0);
    int steps = Q(12, 20, 28);
    for (int i = 0; i < 28; i++) {
        if (i >= steps) break;
        float s = (float(i) + jitter) / float(steps) * chord;
        vec3 q = nv + t * s;
        q.xy = rot2(tilt) * q.xy;
        q.xz = rot2(spinA) * q.xz;
        float rho = length(q.xz);
        float ang = atan(q.z, q.x) + twist * q.y;
        float vane = abs(sin(ang * fv * 0.5)) * rho;
        float dens = (1.0 - smoothstep(thickness * 0.4, thickness, vane)) * (1.0 - smoothstep(0.55, 0.8, length(q)));
        float idx = mod(floor(ang * fv / TAU + 0.5), 2.0);
        vec3 col = idx < 0.5 ? n.color.rgb * 1.25 : secondColor;
        col *= 0.75 + 0.5 * (1.0 - s / max(chord, 1e-3));
        float a = clamp(dens * 0.3, 0.0, 1.0);
        acc += trans * a * col;
        trans *= 1.0 - a;
    }

    vec3 e = nv + t * chord;
    vec3 outDir = refract(t, -e, ior);
    if (dot(outDir, outDir) < 1e-4) outDir = reflect(t, -e);
    // What shows through: a soft gradient, brightest toward the key light, in the node's color
    // more than the glass's, so the marble reads as its node's color.
    vec3 tint = mix(glassTint, n.color.rgb, 0.6);
    vec3 behind = tint * mix(vec3(0.3, 0.29, 0.32), vec3(0.7, 0.75, 0.85), smoothstep(-0.7, 0.8, outDir.y));
    behind += tint * 0.6 * pow(max(dot(outDir, lightDir), 0.0), 6.0);
    vec3 c = mix(acc + trans * behind, reflC, clamp(fres * reflection, 0.0, 1.0));
    c += vec3(1.2) * pow(max(dot(reflect(rd, nv), lightDir), 0.0), 300.0);
    return vec4(studioTone(c), 1.0);
}
`;

/**
 * The small-size program: a miniature that still reads as a marble a few pixels across -- glass in
 * the node's color with one bright ribbon through it, a bright rim and a broad highlight. (A
 * fresnel ball in the ribbons' mean color read as a flat gray dot on a light canvas.)
 */
export const LOW_DETAIL = `// Glass marble, small: one bright ribbon in the node's color, a bright rim, a broad highlight.
${STUDIO}
vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    vec3 rd = n.viewDir;
    float ndv = max(dot(nv, -rd), 0.0);
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 3.0);
    vec3 tint = mix(glassTint, n.color.rgb, 0.3);
    // One ribbon across the ball, waved by the twist, turning with the marble's spin.
    vec2 p = rot2(n.time * spin + n.seed * 6.28318531) * n.uv;
    float ribbon = 1.0 - smoothstep(thickness, thickness + 0.3, abs(p.y + 0.25 * sin(p.x * twist)));
    vec3 inside = mix(mix(tint, n.color.rgb, 0.6) * 0.8, n.color.rgb * 1.35 + 0.08, ribbon);
    inside = mix(inside, secondColor, 0.25 * ribbon * (1.0 - ndv));
    vec3 c = mix(inside, studio(reflect(rd, nv)), clamp(fres * reflection * 0.6, 0.0, 1.0));
    c += tint * 0.6 * pow(1.0 - ndv, 2.5);
    c += vec3(0.9) * pow(max(dot(reflect(rd, nv), lightDir), 0.0), 40.0);
    return vec4(studioTone(c * 1.2), 1.0);
}
`;

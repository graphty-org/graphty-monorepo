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
    // What shows through: a soft gradient, brightest toward the key light.
    vec3 tint = mix(glassTint, n.color.rgb, 0.3);
    vec3 behind = tint * mix(vec3(0.3, 0.29, 0.32), vec3(0.7, 0.75, 0.85), smoothstep(-0.7, 0.8, outDir.y));
    behind += tint * 0.6 * pow(max(dot(outDir, lightDir), 0.0), 6.0);
    vec3 c = mix(acc + trans * behind, reflC, clamp(fres * reflection, 0.0, 1.0));
    c += vec3(1.2) * pow(max(dot(reflect(rd, nv), lightDir), 0.0), 300.0);
    return vec4(studioTone(c), 1.0);
}
`;

/** The small-size program: flat fresnel glass in the ribbons' mean color. */
export const LOW_DETAIL = `// Glass marble, small: fresnel glass over the ribbons' mean color.
${STUDIO}
vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    vec3 rd = n.viewDir;
    float ndv = max(dot(nv, -rd), 0.0);
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    vec3 tint = mix(glassTint, n.color.rgb, 0.3);
    vec3 core = mix(n.color.rgb * 1.25, secondColor, 0.5) * 0.55;
    vec3 inside = mix(tint * 0.45, core + tint * 0.25, ndv);
    vec3 c = mix(inside, studio(reflect(rd, nv)), clamp(fres * reflection, 0.0, 1.0));
    c += vec3(1.2) * pow(max(dot(reflect(rd, nv), lightDir), 0.0), 300.0);
    return vec4(studioTone(c), 1.0);
}
`;

/**
 * @file The GLSL body of the `nebula` preset (design/rendering/shader-styles.md section 7.5),
 * ported from the shader lab's nebula and starfield backdrop.
 *
 * Each pixel's view direction samples three-deep domain-warped gas (two deep at low quality) in
 * three colors, darkened by dust lanes, with three layers of hashed stars that drift and twinkle.
 * The sky turns with the camera. Every motion runs at `drift`, so at drift 0 the backdrop is
 * still and the element draws it again only when the camera moves.
 *
 * `tintBy: groups` colors the gas near the largest groups of the graph's group outlines
 * with each group's color (`BackgroundInput.groupTint`); with no group outline it changes
 * nothing.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Nebula: domain-warped gas, dust lanes and three drifting layers of stars.
const float TAU = 6.28318531;

float starLayer(vec3 dir, float cells, float seed, float spin, float t) {
    vec3 p = dir;
    p.xz = rot2(t * spin) * p.xz;
    p *= cells;
    vec3 id = floor(p);
    vec3 h = hash33(id + seed);
    vec3 f = fract(p) - (0.15 + 0.7 * h);
    float present = step(1.0 - 0.35 * stars, h.x);
    // A star's size is in cell units, so it is a point on the sky whatever the slope of the
    // screen through the cell. The pixel footprint of the whole cell position is only a floor
    // for anti-aliasing, and a star spread over it keeps its light, so it dims instead of
    // swelling: a far star is a faint point, never a streak or a node-sized blob.
    float star = 0.06 * (0.8 + 1.8 * h.y * h.y);
    float size = max(star, 0.5 * length(fwidth(p)));
    float core = exp(-dot(f, f) / (size * size)) * (star * star) / (size * size);
    float tw = 1.0 - twinkle * 0.5 * (1.0 + sin(t * (2.0 + 5.0 * h.z) + h.y * TAU));
    return present * core * (0.25 + 0.75 * h.y * h.y) * tw;
}

vec4 shade(BackgroundInput b) {
    vec3 dir = b.viewDir;
    vec3 p = dir * 2.2;
    // Every motion runs at drift: still at 0.
    float clock = b.time * drift;
    float t = clock * 0.05;
    // Three-deep domain warp (Inigo Quilez, "warp"); two deep at low quality.
    vec3 q = vec3(fbm(p + vec3(0.0, t, 0.0)), fbm(p + vec3(5.2, 1.3, 2.8 - t)), fbm(p + vec3(1.7, 9.2, t)));
    vec3 r = q;
    if (Q(0.0, 1.0, 1.0) > 0.5) {
        r = vec3(fbm(p + warp * 4.0 * q + vec3(1.7, 9.2, 0.0)), fbm(p + warp * 4.0 * q + vec3(8.3, 2.8, 0.0)), 0.0);
    }

    float f = fbm(p + warp * 4.0 * r + t);
    vec3 gas = mix(gasA, gasB, clamp(f * f * 3.0, 0.0, 1.0));
    gas = mix(gas, gasC, clamp(length(q) * 0.9 - 0.3, 0.0, 1.0));
    gas = mix(gas, gasB * 1.6, clamp(r.x * r.x, 0.0, 1.0) * 0.6);
    float body = smoothstep(0.25, 0.85, f * 0.6 + r.y * 0.6);
    // Dark dust lanes.
    float dust = smoothstep(0.45, 0.75, fbm(p * 2.7 + 3.0 * q));
    if (tintBy == 1) {
        gas = mix(gas, b.groupTint.rgb * 1.4, b.groupTint.a * 0.6);
    }

    vec3 c = gas * body * density * (1.0 - 0.7 * dust);
    c += gas * 0.08 * density;
    // Stars: far, middle and near layers drift at different speeds.
    float s = starLayer(dir, 140.0, 1.0, 0.002, clock)
        + starLayer(dir, 70.0, 7.0, 0.005, clock) * 0.9
        + starLayer(dir, 32.0, 13.0, 0.01, clock) * 0.7;
    vec3 starColor = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash13(floor(dir * 70.0)));
    c += starColor * s * (1.0 - 0.6 * dust * body);
    // The gas and the stars are light added over what is beneath: the dark sky between them is
    // as opaque as sky says, so at 0 the background color or image shows through it.
    float a = mix(clamp(max(c.r, max(c.g, c.b)) * 3.0, 0.0, 1.0), 1.0, sky);
    return vec4(c / max(a, 1e-3), a);
}
`;

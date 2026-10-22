/**
 * @file The GLSL body of the `shockwave` preset (design/rendering/shader-styles.md section 7.3),
 * the shader lab's shockwave made small and fast, as the owner asked, for a click.
 *
 * One ring runs out from a node as it starts carrying the effect (on a Selected layer: the click
 * that selects it), to about four radii in 0.7 s, easing out, with a faint ripple behind it and a
 * little chromatic split. It never moves a node, plays once, and draws nothing at rest or after
 * its 0.7 s, so the last frame the entrance claims is empty.
 */

export const BODY = `
float ringAt(float r, float age) {
    if (age < 0.0 || age > 0.7) {
        return 0.0;
    }

    float k = age / 0.7;
    float radius = 1.0 + 2.7 * (1.0 - (1.0 - k) * (1.0 - k));
    float width = 0.12 + 0.3 * k;
    float x = (r - radius) / width;
    return exp(-x * x) * (1.0 - k) * (1.0 - k);
}

vec4 shade(NodeInput n) {
    float age = ringAge;
    if (age >= 0.7) {
        return vec4(0.0);
    }

    float r = length(n.uv);
    float split = 0.05 * chroma;
    vec3 ring = vec3(ringAt(r - split, age), ringAt(r, age), ringAt(r + split, age));
    // the ripple: a fainter ring a little behind the first
    float ripple = ringAt(r + 0.55, age - 0.08) * 0.35;
    vec3 c = ringColor * (ring + vec3(ripple)) * ringGlow;
    float a = clamp(max(max(c.r, c.g), c.b), 0.0, 1.0);
    // Straight alpha: the ring's light over its coverage.
    return vec4(c / max(a, 1e-4), a * 0.8);
}
`;

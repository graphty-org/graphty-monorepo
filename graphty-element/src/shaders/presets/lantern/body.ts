/**
 * @file The GLSL bodies of the `lantern` preset (design/rendering/shader-styles.md section
 * 7.1), ported from the shader lab's lantern glow.
 *
 * Each node is a paper lantern lit from inside in its own color: the light is strongest where the
 * paper is thinnest to the eye (the middle), ribs and caps shadow it, and a little moonlight keeps
 * a dark lantern readable. `intensity` is how brightly it glows, so binding it to a number per
 * node keeps the hue free for the color layers beneath. The preset declares `bloom`, so the
 * scene's shared bloom pass spreads the light; `bloom` adds the hot core that feeds it.
 *
 * The flicker is slow (about two and a half swings a second) with a small fast shimmer, so it
 * never flashes more than three times a second.
 *
 * `LOW_DETAIL` is the small-size program the element draws while the median node on screen is
 * under 12 px: the same light without the paper grain.
 */

/** The light inside the paper, which both programs share. */
const LIGHT = `
const float PI = 3.14159265;
float lanternLight(NodeInput n) {
    float lum = intensity;
    float wobble = (noise(vec2(n.time * 2.5, n.seed * 77.0)) - 0.5) * 0.5
        + (noise(vec2(n.time * 11.0, n.seed * 31.0 + 5.0)) - 0.5) * 0.06;
    return lum * (1.0 + flicker * wobble);
}
vec3 lanternColor(NodeInput n, float lum) {
    return mix(n.color.rgb, vec3(1.0, 0.95, 0.85), 0.08 + 0.12 * clamp(lum, 0.0, 1.0));
}
`;

/** The body: `shade` and its helpers. */
export const BODY = `// Lantern: a paper lantern lit from inside, ribs, caps and paper grain.
${LIGHT}
vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    float ndv = max(dot(nv, -n.viewDir), 0.0);
    float lum = lanternLight(n);
    vec3 lightC = lanternColor(n, lum);

    // Ribs and caps follow the node's own up, so they stay put as the camera turns.
    vec3 up = normalize(n.local);
    float lat = asin(clamp(up.y, -1.0, 1.0)) / PI + 0.5;
    float rib = smoothstep(0.75, 1.0, 1.0 - abs(fract(lat * float(ribs)) - 0.5) * 2.0);
    float caps = smoothstep(0.82, 0.86, abs(up.y));
    float paper = 0.85 + 0.15 * fbm(up * 18.0 + n.seed * 5.0);

    float glow = exp(-falloff * (1.0 - ndv));
    float core = pow(ndv, 10.0) * (0.3 + 0.4 * bloom);
    vec3 c = lightC * (0.05 + 0.55 * lum) * (glow + core) * paper;
    c *= 1.0 - 0.55 * rib * step(0.5, float(ribs));
    c = mix(c, vec3(0.04, 0.03, 0.03) + lightC * 0.02, caps);
    c += vec3(0.05, 0.06, 0.09) * max(dot(nv, lightDir), 0.0);
    return vec4(c, 1.0);
}
`;

/** The small-size program: the light and the caps, no ribs or grain. */
export const LOW_DETAIL = `// Lantern, small: the light and the caps.
${LIGHT}
vec4 shade(NodeInput n) {
    vec3 nv = n.normal;
    float ndv = max(dot(nv, -n.viewDir), 0.0);
    float lum = lanternLight(n);
    vec3 lightC = lanternColor(n, lum);
    float glow = exp(-falloff * (1.0 - ndv));
    float core = pow(ndv, 10.0) * (0.3 + 0.4 * bloom);
    vec3 c = lightC * (0.05 + 0.55 * lum) * (glow + core) * 0.9;
    c = mix(c, vec3(0.04, 0.03, 0.03) + lightC * 0.02, smoothstep(0.82, 0.86, abs(normalize(n.local).y)));
    c += vec3(0.05, 0.06, 0.09) * max(dot(nv, lightDir), 0.0);
    return vec4(c, 1.0);
}
`;

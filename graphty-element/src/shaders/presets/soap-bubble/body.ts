/**
 * @file The GLSL body of the `soap-bubble` preset (design/rendering/shader-styles.md section
 * 7.5), ported from the shader lab's soap bubble thin-film, community "shields" mode.
 *
 * A soap film is a few hundred nanometers thick, and light reflecting off its front and back
 * surfaces interferes, so each wavelength is brightened or cancelled by the film's thickness. The
 * body computes that per color channel from a swirling thickness field that drains thinner
 * toward the top, adds a fresnel-weighted reflection of the studio and two catchlights, and leaves
 * the middle of the bubble almost clear, so the group's nodes show through it.
 */

import { STUDIO } from "../studio";

/** The body: `shade` and its helpers. */
export const BODY = `// Soap bubble: thin-film interference on one sphere per group.
${STUDIO}
const float TAU = 6.28318531;
const float PI = 3.14159265;

vec4 shade(GroupInput g) {
    vec3 n = g.normal;
    vec3 rd = vec3(0.0, 0.0, 1.0);
    float ndv = max(-n.z, 0.0);
    float seed = fract(g.group * 0.37 + 0.1 + g.depth * 0.21);
    // Film thickness in nanometers: drains thinner toward the top, swirls with time.
    float clock = g.time * swirl;
    vec3 q = n * 1.6 + vec3(seed * 7.0, -clock * 0.12, seed * 3.0);
    q.xz += vec2(sin(clock * 0.35 + q.y * 2.3), cos(clock * 0.3 + q.y * 1.9)) * 0.5;
    float th = thickness * (0.55 + 0.45 * (0.5 - 0.5 * n.y)) + (fbm(q * 1.7) - 0.5) * turbulence * 700.0;
    th = max(th, 0.0);
    float sinT2 = (1.0 - ndv * ndv) / (1.33 * 1.33);
    float opd = 2.0 * 1.33 * th * sqrt(max(1.0 - sinT2, 0.0));
    vec3 film = 0.5 + 0.5 * cos(TAU * opd / vec3(650.0, 532.0, 450.0) + PI);
    // The thinnest film goes black.
    film *= smoothstep(20.0, 120.0, th);
    vec3 r = reflect(rd, n);
    // A soft horizon: on a thin film a crisp one reads as a hard band across the bubble.
    vec3 env = studioSoft(r, 0.3);
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 3.0);
    vec3 c = film * (0.45 + env * 0.9) * (0.6 + 0.8 * fres) * shine;
    float a = clamp((1.0 - clarity) * 0.25 + fres * 0.85 + luminance(env * film) * 0.25, 0.0, 1.0);
    // A sharp window-like highlight and a soft one opposite, the classic bubble catchlights.
    float spec = pow(max(dot(r, normalize(lightDir)), 0.0), 400.0);
    float spec2 = pow(max(dot(r, normalize(vec3(0.5, -0.4, -0.7))), 0.0), 80.0);
    c += vec3(3.0) * spec + vec3(0.6) * spec2;
    a = clamp(max(a, spec + spec2 * 0.5), 0.0, 1.0);
    // Anti-alias the rim: the element discards past the sphere's edge, where the film is brightest.
    float edge = length(n.xy);
    a *= 1.0 - smoothstep(1.0 - 1.5 * fwidth(edge), 1.0, edge);
    // Straight alpha, over the groups beneath.
    return vec4(min(c, vec3(1.0)), a);
}
`;

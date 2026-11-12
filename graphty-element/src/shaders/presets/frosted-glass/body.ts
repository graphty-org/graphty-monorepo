/**
 * @file The GLSL body of the `frosted-glass` preset (design/rendering/shader-styles.md section
 * 7.1), a new look (the owner's suggestion).
 *
 * Diffuse, translucent glass: the room's light scattered into a soft milky body, a fine frosted
 * grain, a soft bright rim where the glass is seen edge-on, and a broad blurred highlight.
 * `frost` goes from nearly clear (a sharper highlight, little grain) to fully frosted; `rim` is
 * the strength of the soft rim; `tint` is how much the node's color tints the glass. The glass
 * is see-through: the canvas shows through its middle, less as the frost thickens and less at the
 * rim, where the glass is seen edge-on (alpha about 0.55 + 0.35 x frost + rim).
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Frosted glass: a milky translucent body, fine grain, a soft rim and a blurred highlight.
vec4 shade(NodeInput n) {
    vec3 glass = mix(vec3(0.93, 0.96, 1.0), n.color.rgb, tint);
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    // Light scattered through the body: brightest toward the key light, never dark.
    float wrap = clamp((dot(n.normal, lightDir) + 0.7) / 1.7, 0.0, 1.0);
    vec3 sky = mix(vec3(0.55, 0.6, 0.68), vec3(0.95, 0.97, 1.0), n.normal.y * 0.5 + 0.5);
    vec3 body = glass * mix(vec3(0.62), sky, 0.5) * (0.55 + 0.5 * wrap);
    // Thin frost shows a darker core; thick frost fills it with milky light.
    body = mix(body * (0.55 + 0.45 * (1.0 - facing)), body + glass * 0.12, frost);
    // The grain: fine, still, fixed to the node.
    float grain = noise(n.uv * 70.0 + n.seed * 31.0) - 0.5;
    body += vec3(grain * 0.09 * frost);
    // The soft rim, and a highlight that spreads as the frost thickens.
    float edge = rim * pow(1.0 - facing, 2.2);
    body += mix(glass, vec3(1.0), 0.5) * 0.75 * edge;
    vec3 h = normalize(lightDir + vec3(0.0, 0.0, -1.0));
    float spread = mix(90.0, 10.0, frost);
    float spec = mix(0.9, 0.35, frost) * pow(max(dot(n.normal, h), 0.0), spread);
    body += vec3(spec);
    // Translucent: the frost and the rim scatter more light back, so they are more opaque.
    float a = clamp(0.55 + 0.35 * frost + edge + spec, 0.0, 1.0);
    return vec4(min(body, vec3(1.0)), a);
}
`;

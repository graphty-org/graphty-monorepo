/**
 * @file The GLSL body of the `fiber-optic` preset (design/rendering/shader-styles.md section 7.4),
 * ported from the glass of the shader lab's fiber optic strands.
 *
 * Each edge is a glass rod in its own color: a bright rim where the eye looks through the most
 * glass, a lit core and a soft sheen down one side. On a dark canvas the body is dark glass; on a
 * light canvas (`canvasColor`) it is a pale tint, so it never draws near black there. A line a few
 * pixels wide fades to the glass's average color rather than aliasing. The rim's hue
 * drifts a little along the rod and from rod to rod (`hueSpread`), so a bundle of fibers of one
 * color still reads as many strands. A fiber touching a selected or hovered node, or itself
 * selected or hovered, glows brighter. The packets of light are the `fiber-packets` effect.
 *
 * Still: it asks for no frame.
 */

export const BODY = `// Fiber optic: glass with a bright rim and a lit core, tinted by the line's color.
// The color turned about the gray axis by an angle, in radians.
vec3 fiberHue(vec3 c, float angle) {
    const vec3 k = vec3(0.57735027);
    float ca = cos(angle);
    float sa = sin(angle);
    return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
}
vec4 shade(EdgeInput e) {
    float s = abs(e.side);
    float rim = smoothstep(0.45, 0.85, s) * (1.0 - smoothstep(0.85, 1.0, s));
    float core = exp(-s * s * 14.0);
    float drift = (e.seed - 0.5) * 2.0 + (e.t - 0.5);
    vec3 tint = clamp(fiberHue(e.color.rgb, drift * hueSpread * 1.6), 0.0, 1.0);
    float g = clamp(glass, 0.0, 3.0);
    // On a dark canvas the glass is dark and the rim and core glow; on a light canvas the glass is
    // a pale tint of the canvas, the rim the line's own color and the core a highlight, so it never
    // goes near black there.
    float light = smoothstep(0.35, 0.65, dot(canvasColor, vec3(0.2126, 0.7152, 0.0722)));
    vec3 darkBody = e.color.rgb * 0.12 + tint * rim * 0.7 * g + mix(e.color.rgb, vec3(1.0), 0.35) * core * 0.6 * g;
    vec3 lightBody = mix(mix(canvasColor, e.color.rgb, 0.35), tint, min(rim * (0.4 + 0.6 * g), 1.0));
    lightBody = mix(lightBody, mix(e.color.rgb, vec3(1.0), 0.6), min(core * (0.2 + 0.4 * g), 1.0));
    vec3 c = mix(darkBody, lightBody, light);
    // A sheen down one side, as light catches a glass rod; thin lines skip it.
    c += vec3(exp(-pow((e.side + 0.45) * 5.0, 2.0)) * 0.12 * g * (1.0 - light) * smoothstep(2.0, 6.0, e.widthPx));
    // A line a few pixels wide cannot show a rim and a core without aliasing into a stipple, so it
    // fades to the glass's average color.
    vec3 thin = mix(e.color.rgb * 0.6 + tint * 0.4, mix(canvasColor, tint, 0.75), light);
    c = mix(thin, c, smoothstep(1.5, 5.0, e.widthPx));
    float lit = max(max(e.selected, e.hovered), max(e.sourceSelected, e.targetSelected));
    c = mix(c, min(c * 1.8, vec3(1.0)), lit);
    return vec4(clamp(c, 0.0, 1.0), e.color.a);
}
`;

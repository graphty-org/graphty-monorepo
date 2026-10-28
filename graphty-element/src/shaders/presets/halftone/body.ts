/**
 * @file The GLSL body of the `halftone` preset (design/rendering/shader-styles.md section 7.1),
 * the dot screen of the shader lab's toon ink as a style of its own (the owner's change).
 *
 * The node printed on paper: its color as a flat tone, ink dots on the shadow side that grow
 * with the darkness, paper dots showing through on the lit side, and a thin ink rim. The screen
 * is set at 45 degrees, `dotScale` screen pixels apart, and is fixed to the node, so a moving
 * node carries its dots with it.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Halftone: the node printed on paper with a rotated dot screen.
vec4 shade(NodeInput n) {
    float a = lightAngle * 6.28318;
    vec3 l = normalize(vec3(cos(a) * 0.75, 0.65, sin(a) * 0.75 - 0.5));
    float lit = clamp(dot(n.normal, l) * 0.5 + 0.5, 0.0, 1.0);
    vec3 c = mix(paper, n.color.rgb, 0.88);
    // Screen pixels from the node's center: the uv changes by one radius over pixelSize pixels.
    float perPixel = max(max(fwidth(n.uv.x), fwidth(n.uv.y)), 1e-5);
    vec2 cell = rot2(0.785398) * (n.uv / perPixel) / dotScale;
    vec2 f = fract(cell) - 0.5;
    float aa = 0.5 / dotScale + 0.04;
    float shadow = clamp(1.0 - lit * 1.6, 0.0, 1.0);
    float inkR = sqrt(shadow) * 0.62;
    float inkDot = 1.0 - smoothstep(inkR - aa, inkR + aa, length(f));
    c = mix(c, inkColor, inkDot * step(0.01, shadow) * 0.9);
    // Paper showing through on the lit side, on the screen's other diagonal.
    float light = clamp((lit - 0.62) / 0.38, 0.0, 1.0);
    vec2 g = fract(cell + 0.5) - 0.5;
    float paperR = sqrt(light) * 0.5;
    float paperDot = 1.0 - smoothstep(paperR - aa, paperR + aa, length(g));
    c = mix(c, paper, paperDot * step(0.01, light));
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    float edge = max(fwidth(facing), 0.01);
    float bend = length(fwidth(n.normal)) / max(length(fwidth(n.uv)), 1e-5);
    float rim = (1.0 - smoothstep(0.2 - edge, 0.2 + edge, facing)) * smoothstep(0.3, 0.6, bend);
    float crease = clamp((length(fwidth(n.normal)) - 0.35) * 4.0, 0.0, 1.0);
    c = mix(c, inkColor, max(rim, crease));
    return vec4(c, 1.0);
}
`;

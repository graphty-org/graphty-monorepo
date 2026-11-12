/**
 * @file The GLSL body of the `colorblind-patterns` preset (design/rendering/shader-styles.md
 * section 7.1), ported from the shader lab's colorblind patterns.
 *
 * One of eight patterns -- diagonal stripes, horizontal stripes, dots, a checker, a cross-hatch,
 * rings, diamonds, solid -- inked over the color the layers beneath chose, with a dark outline so
 * neighbors separate. The pattern is a screen-facing print, so it reads the same on every shape,
 * and its cycles never get closer than about 7 pixels, so a small node never aliases to mush.
 * The lab's color-vision preview is a whole-canvas preview and is not part of the preset.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Patterns: one of eight inks over the fill color, so nodes read apart without color.

// 1 inside the ink of pattern k, anti-aliased. q is in node radii, f the cycles per radius.
float patternInk(int k, vec2 q, float f) {
    if (k == 0) { float x = (q.x + q.y) * f * 0.7071; return fillAA(abs(fract(x) - 0.5) - 0.22); }
    if (k == 1) { float x = q.y * f; return fillAA(abs(fract(x) - 0.5) - 0.2); }
    if (k == 2) { vec2 g = fract(q * f) - 0.5; return fillAA(length(g) - 0.26); }
    if (k == 3) { vec2 g = fract(q * f * 0.5) - 0.5; return fillAA(g.x * g.y); }
    if (k == 4) {
        float la = fillAA(0.36 - abs(fract((q.x + q.y) * f * 0.7071) - 0.5));
        float lb = fillAA(0.36 - abs(fract((q.x - q.y) * f * 0.7071) - 0.5));
        return max(la, lb);
    }
    if (k == 5) { float x = length(q) * f; return fillAA(abs(fract(x) - 0.5) - 0.22); }
    if (k == 6) { vec2 g = abs(fract(q * f * 0.6) - 0.5); return fillAA(g.x + g.y - 0.32); }
    return 0.0;
}

vec4 shade(NodeInput n) {
    // At least ~7 px per cycle, so small nodes stay legible.
    float f = clamp(n.pixelSize / 7.0, 1.5, density);
    vec2 q = rot2(rotate) * n.uv;
    float ink = patternInk(pattern, q, f);
    vec3 base = n.color.rgb;
    // Dark ink on a light fill, light ink on a dark one.
    vec3 inkColor = luminance(base) > 0.45 ? base * (1.0 - contrast) : mix(base, vec3(1.0), contrast);
    vec3 c = mix(base, inkColor, ink);
    // A little modeling from the key light, so a sphere reads round without losing the print.
    float diffuse = max(dot(n.normal, lightDir), 0.0);
    c *= 0.86 + 0.14 * diffuse;
    // The outline, where the surface turns away from the camera, so shapes separate.
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    c = mix(c, vec3(0.08), fillAA(facing - 0.3));
    return vec4(c, n.color.a);
}
`;

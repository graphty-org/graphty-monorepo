/**
 * @file The GLSL body of the `cel-shade` preset (design/rendering/shader-styles.md section 7.1),
 * ported from the shader lab's toon ink, without the boil (the owner's change: a still line) and
 * without the halftone, which is its own preset.
 *
 * Light quantized into hard bands, one crisp highlight, and a hand-drawn ink line around the
 * silhouette whose width varies along it. The line follows any shape: it is drawn where the
 * surface turns away from the camera, and on a shape with hard edges (a box) also along its
 * creases, where the normal turns sharply between neighboring pixels.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Cel shade: hard light bands, a crisp highlight and a still ink line.
vec4 shade(NodeInput n) {
    float a = lightAngle * 6.28318;
    vec3 l = normalize(vec3(cos(a) * 0.75, 0.65, sin(a) * 0.75 - 0.5));
    float lit = clamp(dot(n.normal, l) * 0.5 + 0.5, 0.0, 1.0);
    float steps = float(bands);
    float q = min(floor(lit * steps), steps - 1.0) / max(steps - 1.0, 1.0);
    vec3 base = mix(n.color.rgb, vec3(1.0), 0.12);
    vec3 c = base * mix(0.5, 1.08, q);
    vec3 h = normalize(l + vec3(0.0, 0.0, -1.0));
    float spec = max(dot(n.normal, h), 0.0);
    float aa = max(fwidth(spec), 0.002);
    c = mix(c, vec3(1.0), smoothstep(0.975 - aa, 0.975 + aa, spec));
    // The pen: its width wanders along the rim, the same on every frame.
    vec2 dir = n.uv / max(length(n.uv), 1e-4);
    float w = inkWidth * (0.55 + 0.9 * noise(vec3(dir * 3.5, n.seed * 26.0)));
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    float edge = max(fwidth(facing), 0.01);
    float band = w * 0.7;
    float rim = sqrt(band * (2.0 - band));
    float bend = length(fwidth(n.normal)) / max(length(fwidth(n.uv)), 1e-5);
    float ink = inkWidth > 0.0 ? (1.0 - smoothstep(rim - edge, rim + edge, facing)) * smoothstep(0.3, 0.6, bend) : 0.0;
    float crease = clamp((length(fwidth(n.normal)) - 0.35) * 4.0, 0.0, 1.0);
    ink = max(ink, crease * step(0.001, inkWidth));
    c = mix(c, inkColor, ink);
    return vec4(c, 1.0);
}
`;

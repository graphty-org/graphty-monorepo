/**
 * @file The GLSL body of the `clear-glass` preset (design/rendering/shader-styles.md section 7.1),
 * from the shader lab's matcap sampler: the studio reflections of its chrome and the clear body
 * and sharp highlight of its jade.
 *
 * A clear glass ball: a small studio (a sky, a floor and two soft boxes) seen bent through the
 * body, the same studio reflected at the rim by Fresnel's law, a bright colored rim where light
 * gathers, and a sharp highlight. The studio turns with the camera, as a matcap does. `tint` is
 * how much the node's color tints the glass.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Clear glass: the room seen through a clear ball, its reflection at the rim, a bright rim.
float softbox(vec3 d, vec3 s, vec2 size, float soft) {
    vec3 t = normalize(cross(s, vec3(0.0, 1.0, 0.0)));
    vec3 b = cross(t, s);
    float k = dot(d, s);
    if (k <= 0.0) return 0.0;
    vec2 p = vec2(dot(d, t), dot(d, b)) / k;
    vec2 q = abs(p) - size;
    return 1.0 - smoothstep(-soft, soft, max(q.x, q.y));
}
// A studio around the camera, by a view-space direction: sky, floor and two soft boxes.
vec3 studio(vec3 d) {
    d = normalize(d);
    vec3 sky = mix(vec3(0.62, 0.68, 0.78), vec3(0.10, 0.13, 0.24), smoothstep(0.0, 0.85, d.y));
    vec3 ground = mix(vec3(0.22, 0.20, 0.19), vec3(0.03, 0.03, 0.035), smoothstep(0.0, -0.5, d.y));
    vec3 c = mix(ground, sky, smoothstep(-0.03, 0.03, d.y));
    c += vec3(5.0, 4.8, 4.5) * softbox(d, normalize(vec3(0.55, 0.65, -0.5)), vec2(0.35, 0.22), 0.04);
    c += vec3(2.2, 2.6, 3.4) * softbox(d, normalize(vec3(-0.7, 0.35, 0.6)), vec2(0.18, 0.5), 0.05);
    return c;
}
vec3 tone(vec3 c) { return 1.0 - exp(-c * 1.15); }
vec4 shade(NodeInput n) {
    // The node's hue at full brightness: glass filters light, it does not darken it.
    vec3 hue = n.color.rgb / max(max(n.color.r, n.color.g), max(n.color.b, 0.05));
    vec3 glass = mix(vec3(1.0), hue, tint * 0.6);
    vec3 v = vec3(0.0, 0.0, 1.0);
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
    // Through the body: the room seen upside down through the ball, as through real glass.
    vec3 through = 0.15 + tone(studio(refract(v, n.normal, 0.66)) * 1.6);
    vec3 body = through * glass;
    vec3 reflected = tone(studio(reflect(v, n.normal)) + 0.15);
    vec3 c = mix(body, reflected, fresnel);
    // Light gathered at the rim, in the glass's own color, and a sharp highlight.
    c += mix(glass, vec3(1.0), 0.3) * 0.5 * pow(1.0 - facing, 2.5);
    vec3 h = normalize(lightDir + vec3(0.0, 0.0, -1.0));
    c += vec3(1.0) * pow(max(dot(n.normal, h), 0.0), 90.0);
    return vec4(min(c, vec3(1.0)), 1.0);
}
`;

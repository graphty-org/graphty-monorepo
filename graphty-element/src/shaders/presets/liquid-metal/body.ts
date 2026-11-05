/**
 * @file The GLSL body of the `liquid-metal` preset (design/rendering/shader-styles.md section
 * 7.1), a new look (the owner's suggestion), built on the studio reflection of the shader lab's
 * matcap chrome.
 *
 * Polished chrome reflecting a studio (a sky, a floor, soft boxes and a horizon band) whose
 * reflection flows slowly, as if the surface were liquid. `speed` is how fast it flows (0 holds it
 * still); `ripple` is how far the reflection is pushed around; `tint` is how much the node's color
 * tints the metal.
 */

/** The body: `shade` and its helpers. */
export const BODY = `// Liquid metal: chrome whose reflection flows slowly over the surface.
float softbox(vec3 d, vec3 s, vec2 size, float soft) {
    vec3 t = normalize(cross(s, vec3(0.0, 1.0, 0.0)));
    vec3 b = cross(t, s);
    float k = dot(d, s);
    if (k <= 0.0) return 0.0;
    vec2 p = vec2(dot(d, t), dot(d, b)) / k;
    vec2 q = abs(p) - size;
    return 1.0 - smoothstep(-soft, soft, max(q.x, q.y));
}
// A studio around the camera, by a view-space direction, with a bright horizon band.
vec3 studio(vec3 d) {
    d = normalize(d);
    vec3 sky = mix(vec3(0.62, 0.68, 0.78), vec3(0.10, 0.13, 0.24), smoothstep(0.0, 0.85, d.y));
    vec3 ground = mix(vec3(0.22, 0.20, 0.19), vec3(0.03, 0.03, 0.035), smoothstep(0.0, -0.5, d.y));
    vec3 c = mix(ground, sky, smoothstep(-0.03, 0.03, d.y));
    c += vec3(5.0, 4.8, 4.5) * softbox(d, normalize(vec3(0.55, 0.65, -0.5)), vec2(0.35, 0.22), 0.04);
    c += vec3(2.2, 2.6, 3.4) * softbox(d, normalize(vec3(-0.7, 0.35, -0.6)), vec2(0.18, 0.5), 0.05);
    // A light room: a broad horizon and a lifted floor and sky, so the chrome is not near black
    // on a light canvas.
    c += vec3(0.6, 0.65, 0.75) * exp(-abs(d.y) * 2.5) + vec3(0.3);
    return c;
}
vec4 shade(NodeInput n) {
    float t = n.time * speed + n.seed * 7.0;
    vec3 p = n.normal * 1.6;
    vec3 flow = vec3(noise(p + vec3(t, 0.0, 0.0)), noise(p.yzx + vec3(0.0, t * 0.8, 3.1)), 0.0) - vec3(0.5, 0.5, 0.0);
    vec3 normal = normalize(n.normal + flow * ripple * 0.9);
    vec3 r = reflect(vec3(0.0, 0.0, 1.0), normal);
    vec3 metal = mix(vec3(1.0), n.color.rgb * 1.6, tint);
    vec3 c = 1.0 - exp(-studio(r) * metal * 1.15);
    // A darker edge, where a liquid surface turns away and reflects the dark floor.
    float facing = clamp(-normal.z, 0.0, 1.0);
    c *= 0.75 + 0.25 * smoothstep(0.0, 0.35, facing);
    return vec4(c, 1.0);
}
`;

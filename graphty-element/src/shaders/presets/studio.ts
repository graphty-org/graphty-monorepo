/**
 * @file The studio environment the glass, gem and disco-ball presets reflect and refract, as GLSL
 * the bodies include: a sky over a floor, two softboxes and a rim strip, from the shader lab's
 * impostor materials (stories/shader-lab/impostor-materials/common.ts on feat/shader-lab).
 *
 * The lab looked the studio up by a world direction. A shader body sees only view-space
 * directions, so here the studio is fixed to the camera, as a matcap is: the lights stay where
 * the reader sees them however the camera turns.
 * ponytail: camera-fixed reflections; give NodeInput a world-space view ray if reflections that
 * move as the camera orbits are ever wanted.
 *
 * Plain strings; nothing here reaches Babylon.js, Lit or the DOM.
 */

/**
 * `studio(d)`: the studio's light along a view-space direction; `studioSoft(d, horizon)`: the same
 * with a wider horizon blend; `studioTone(c)`: a soft tone curve.
 */
export const STUDIO = `
float studioBox(vec3 d, vec3 s, vec2 size, float soft) {
    vec3 t = normalize(cross(s, vec3(0.0, 1.0, 0.0)));
    vec3 b = cross(t, s);
    float k = dot(d, s);
    if (k <= 0.0) return 0.0;
    vec2 p = vec2(dot(d, t), dot(d, b)) / k;
    vec2 q = abs(p) - size;
    return 1.0 - smoothstep(-soft, soft, max(q.x, q.y));
}
// horizon: the half-width of the blend from floor to sky; studio() is the crisp one.
vec3 studioSoft(vec3 d, float horizon) {
    d = normalize(d);
    vec3 sky = mix(vec3(0.62, 0.68, 0.78), vec3(0.10, 0.13, 0.24), smoothstep(0.0, 0.85, d.y));
    vec3 ground = mix(vec3(0.22, 0.20, 0.19), vec3(0.03, 0.03, 0.035), smoothstep(0.0, -0.5, d.y));
    vec3 c = mix(ground, sky, smoothstep(-horizon, horizon, d.y));
    c += vec3(5.0, 4.8, 4.5) * studioBox(d, normalize(vec3(0.55, 0.65, -0.5)), vec2(0.35, 0.22), 0.04);
    c += vec3(2.2, 2.6, 3.4) * studioBox(d, normalize(vec3(-0.7, 0.35, 0.6)), vec2(0.18, 0.5), 0.05);
    c += vec3(1.6) * studioBox(d, normalize(vec3(0.0, 0.15, 1.0)), vec2(0.9, 0.04), 0.03);
    return c;
}
vec3 studio(vec3 d) { return studioSoft(d, 0.03); }
// A filmic tone curve for light that runs past 1.
vec3 studioTone(vec3 c) { return 1.0 - exp(-c * 1.15); }
`;

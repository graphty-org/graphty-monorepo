/* graphty-shader 1
{
    "id": "lab/lantern-glow",
    "name": "Lantern glow",
    "params": [
        {
            "name": "intensity",
            "type": "number",
            "default": 1.1,
            "min": 0,
            "max": 4,
            "varies": true,
            "primary": true
        },
        {
            "name": "falloff",
            "type": "number",
            "default": 2.2,
            "min": 0,
            "max": 8
        },
        {
            "name": "ribs",
            "type": "integer",
            "default": 9,
            "min": 0,
            "max": 20
        },
        {
            "name": "flicker",
            "type": "number",
            "default": 0.3,
            "min": 0,
            "max": 1
        },
        {
            "name": "bloom",
            "type": "number",
            "default": 0.7,
            "min": 0,
            "max": 3
        }
    ]
}
*/
vec3 labLight() { return normalize(vec3(-0.45, 0.6, -0.65)); }
// view-space direction to world space (the view matrix is a rotation plus a translation)
vec3 labToWorld(vec3 v) { return (vec4(v, 0.0) * view).xyz; }
// direction from the camera through this fragment's sphere point, view space
vec3 labEyeRay(vec3 n) { return normalize(vCenterView + n * inp.size); }
float labBox(vec3 d, vec3 s, vec2 size, float soft) {
    vec3 t = normalize(cross(s, vec3(0.0, 1.0, 0.0)));
    vec3 b = cross(t, s);
    float k = dot(d, s);
    if (k <= 0.0) return 0.0;
    vec2 p = vec2(dot(d, t), dot(d, b)) / k;
    vec2 q = abs(p) - size;
    return 1.0 - smoothstep(-soft, soft, max(q.x, q.y));
}
vec3 labStudio(vec3 d) {
    d = normalize(d);
    vec3 sky = mix(vec3(0.62, 0.68, 0.78), vec3(0.10, 0.13, 0.24), smoothstep(0.0, 0.85, d.y));
    vec3 floorC = mix(vec3(0.22, 0.20, 0.19), vec3(0.03, 0.03, 0.035), smoothstep(0.0, -0.5, d.y));
    vec3 c = mix(floorC, sky, smoothstep(-0.03, 0.03, d.y));
    c += vec3(5.0, 4.8, 4.5) * labBox(d, normalize(vec3(0.55, 0.65, -0.5)), vec2(0.35, 0.22), 0.04);
    c += vec3(2.2, 2.6, 3.4) * labBox(d, normalize(vec3(-0.7, 0.35, 0.6)), vec2(0.18, 0.5), 0.05);
    c += vec3(1.6) * labBox(d, normalize(vec3(0.0, 0.15, 1.0)), vec2(0.9, 0.04), 0.03);
    return c;
}
// filmic-ish tone curve for values that run past 1
vec3 labTone(vec3 c) { return 1.0 - exp(-c * 1.15); }

vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    vec3 n = labSphereNormal();
    float ndv = max(-n.z, 0.0);
    float raw = encode < 0.5 ? vData.z : (encode < 1.5 ? sqrt(vData.y) : sqrt(vData.x));
    float val = clamp(raw, 0.0, 1.0);
    val *= 1.0 + flicker * (noise(vec2(inp.time * 9.0, inp.seed * 77.0)) - 0.5) * 0.5;
    vec3 hueC = hueMode < 0.5 ? inp.color.rgb : vec3(1.0, 0.62, 0.25);
    vec3 lightC = mix(hueC, vec3(1.0, 0.95, 0.85), 0.08 + 0.12 * val);

    vec3 nw = labToWorld(n);
    float lat = asin(clamp(nw.y, -1.0, 1.0)) / PI + 0.5;
    float rib = smoothstep(0.75, 1.0, 1.0 - abs(fract(lat * ribs) - 0.5) * 2.0);
    float caps = smoothstep(0.82, 0.86, abs(nw.y));
    float paper = 0.85 + 0.15 * fbm(nw * 18.0 + inp.seed * 5.0);

    float glow = exp(-falloff * (1.0 - ndv));
    float core = pow(ndv, 10.0) * 0.6;
    vec3 c = lightC * (0.05 + val * intensity) * (glow + core) * paper;
    c *= 1.0 - 0.55 * rib;
    c = mix(c, vec3(0.04, 0.03, 0.03) + lightC * 0.02, caps);
    // a little moonlight on the outside so dark lanterns still read as shapes
    c += vec3(0.05, 0.06, 0.09) * max(dot(n, labLight()), 0.0);
    c = mix(c, c * 1.5 + 0.06, inp.hovered);
    c = mix(c, vec3(1.0, 0.9, 0.6), smoothstep(0.9, 0.95, length(inp.uv)) * inp.selected);
    fragColor = vec4(c, 1.0);
    return fragColor;
}

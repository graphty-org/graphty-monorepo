/* graphty-shader 1
{
    "id": "lab/nebula",
    "name": "Nebula",
    "params": [
        {
            "name": "gasA",
            "type": "color",
            "default": "#2a0f4a"
        },
        {
            "name": "gasB",
            "type": "color",
            "default": "#d0407a",
            "primary": true
        },
        {
            "name": "gasC",
            "type": "color",
            "default": "#1f6fa8"
        },
        {
            "name": "density",
            "type": "number",
            "default": 0.8,
            "min": 0,
            "max": 2
        },
        {
            "name": "warp",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 2
        },
        {
            "name": "drift",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 5
        },
        {
            "name": "stars",
            "type": "number",
            "default": 0.6,
            "min": 0,
            "max": 1
        },
        {
            "name": "twinkle",
            "type": "number",
            "default": 0.6,
            "min": 0,
            "max": 1
        },
        {
            "name": "tintBy",
            "type": "enum",
            "default": "none",
            "values": [
                {
                    "value": "none",
                    "label": "none"
                },
                {
                    "value": "groups",
                    "label": "groups"
                }
            ]
        }
    ]
}
*/
vec3 worldDir() {
    vec3 d = normalize(vec3(vNdc.x / projection[0][0], vNdc.y / projection[1][1], 1.0));
    return normalize(vec3(dot(view[0].xyz, d), dot(view[1].xyz, d), dot(view[2].xyz, d)));
}

float starLayer(vec3 dir, float cells, float seed, float spin) {
    vec3 p = dir;
    p.xz = rot2(inp.time * spin) * p.xz;
    p *= cells;
    vec3 id = floor(p);
    vec3 h = hash33(id + seed);
    vec3 f = fract(p) - (0.15 + 0.7 * h);
    float present = step(1.0 - 0.35 * stars, h.x);
    float size = fwidth(p.x) * (0.8 + 1.8 * h.y * h.y);
    float core = exp(-dot(f, f) / max(size * size, 1e-6));
    float tw = 1.0 - twinkle * 0.5 * (1.0 + sin(inp.time * (2.0 + 5.0 * h.z) + h.y * TAU));
    return present * core * (0.4 + 1.6 * h.y * h.y) * tw;
}

vec4 shade(BackgroundInput inp) {
    vec4 fragColor = vec4(0.0);
    vec3 dir = worldDir();
    vec3 p = dir * 2.2;
    float t = inp.time * drift * 0.05;
    // three-deep domain warp (Inigo Quilez, "warp")
    vec3 q = vec3(fbm(p + vec3(0.0, t, 0.0)), fbm(p + vec3(5.2, 1.3, 2.8 - t)), fbm(p + vec3(1.7, 9.2, t)));
    vec3 r = q;   // low quality: two levels of warp instead of three
    vec3 r = vec3(fbm(p + warp * 4.0 * q + vec3(1.7, 9.2, 0.0)), fbm(p + warp * 4.0 * q + vec3(8.3, 2.8, 0.0)), 0.0);
    float f = fbm(p + warp * 4.0 * r + t);
    vec3 gas = mix(gasA, gasB, clamp(f * f * 3.0, 0.0, 1.0));
    gas = mix(gas, gasC, clamp(length(q) * 0.9 - 0.3, 0.0, 1.0));
    gas = mix(gas, gasB * 1.6, clamp(r.x * r.x, 0.0, 1.0) * 0.6);
    float body = smoothstep(0.25, 0.85, f * 0.6 + r.y * 0.6);
    // dark dust lanes
    float dust = smoothstep(0.45, 0.75, fbm(p * 2.7 + 3.0 * q));
    vec3 tint = vec3(0.0); float tw = 0.0;
    // The community tint (tintBy "groups") sums the four largest groups here; off by default.
    if (tw > 0.0) gas = mix(gas, tint / tw * 1.4, clamp(tw, 0.0, 1.0) * communityTint);
    vec3 c = gas * body * density * (1.0 - 0.7 * dust);
    c += gas * 0.08 * density;
    // stars: far, middle and near layers drift at different speeds
    float s = starLayer(dir, 140.0, 1.0, 0.002) + starLayer(dir, 70.0, 7.0, 0.005) * 1.2 + starLayer(dir, 32.0, 13.0, 0.01) * 1.5;
    vec3 starCol = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash13(floor(dir * 70.0)));
    c += starCol * s * (1.0 - 0.6 * dust * body);
    fragColor = vec4(c, 1.0);
    return fragColor;
}

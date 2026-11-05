/* graphty-shader 1
{
    "id": "lab/soap-bubble",
    "name": "soap-bubble",
    "params": [
        {
            "name": "thickness",
            "type": "number",
            "default": 520,
            "min": 100,
            "max": 1200,
            "primary": true
        },
        {
            "name": "turbulence",
            "type": "number",
            "default": 0.6,
            "min": 0,
            "max": 1.5
        },
        {
            "name": "swirl",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 4
        },
        {
            "name": "clarity",
            "type": "number",
            "default": 0.75,
            "min": 0,
            "max": 1
        },
        {
            "name": "shine",
            "type": "number",
            "default": 1.2,
            "min": 0.2,
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

vec4 bubbleShade(vec2 uv, float seed, float hot) {
    float r2 = dot(uv, uv);
    if (r2 > 1.0) return vec4(0.0);
    vec3 n = vec3(uv, -sqrt(1.0 - r2));
    vec3 rd = labEyeRay(n);
    float ndv = max(dot(n, -rd), 0.0);
    vec3 nw = labToWorld(n);
    // film thickness in nanometers: drains thinner toward the top, swirls with inp.time
    vec3 q = nw * 1.6 + vec3(seed * 7.0, -inp.time * 0.12 * swirl, seed * 3.0);
    q.xz += vec2(sin(inp.time * 0.35 * swirl + q.y * 2.3), cos(inp.time * 0.3 * swirl + q.y * 1.9)) * 0.5;
    float th = thickness * (0.55 + 0.45 * (0.5 - 0.5 * nw.y)) + (fbm(q * 1.7) - 0.5) * turbulence * 700.0;
    th = max(th, 0.0);
    float sinT2 = (1.0 - ndv * ndv) / (1.33 * 1.33);
    float opd = 2.0 * 1.33 * th * sqrt(1.0 - sinT2);
    vec3 film = 0.5 + 0.5 * cos(TAU * opd / vec3(650.0, 532.0, 450.0) + PI);
    film *= smoothstep(20.0, 120.0, th);                   // the thinnest film goes black
    vec3 env = labStudio(labToWorld(reflect(rd, n)));
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 3.0);
    vec3 c = film * (0.45 + env * 0.9) * (0.6 + 0.8 * fres) * shine;
    float a = clamp((1.0 - clarity) * 0.25 + fres * 0.85 + luminance(env * film) * 0.25, 0.0, 1.0);
    // a sharp window-like highlight and a soft one opposite, the classic bubble catchlights
    vec3 l = labLight();
    float spec = pow(max(dot(reflect(rd, n), l), 0.0), 400.0);
    float spec2 = pow(max(dot(reflect(rd, n), normalize(vec3(0.5, -0.4, -0.7))), 0.0), 80.0);
    c += vec3(3.0) * spec + vec3(0.6) * spec2;
    a = max(a, spec + spec2 * 0.5);
    // hovered or selected: a warm rim so the one bubble stands out of the crowd
    c = c * (1.0 + hot * 0.6) + vec3(1.0, 0.85, 0.5) * pow(1.0 - ndv, 2.0) * hot * 2.0;
    return vec4(c, clamp(max(a, pow(1.0 - ndv, 2.0) * hot) * (1.0 + hot * 0.4), 0.0, 1.0));
}

vec4 shade(GroupInput inp) {
    vec4 fragColor = vec4(0.0);
    fragColor = bubbleShade(inp.uv, vSeed, 0.0);
    return fragColor;
}

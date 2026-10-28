/* graphty-shader 1
{
    "id": "lab/halftone",
    "name": "Halftone",
    "params": [
        {
            "name": "dotScale",
            "type": "number",
            "default": 5,
            "min": 2,
            "max": 12,
            "primary": true
        },
        {
            "name": "inkColor",
            "type": "color",
            "default": "#1b1720"
        },
        {
            "name": "paper",
            "type": "color",
            "default": "#f3ead6"
        },
        {
            "name": "lightAngle",
            "type": "number",
            "default": 0.12,
            "min": 0,
            "max": 1
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
    float r = length(inp.uv);
    vec2 dir = inp.uv / max(r, 1e-4);
    float boilStep = floor(inp.time * boil);
    float seed = inp.seed * 37.0;
    // the drawn rim wobbles around the true sphere edge
    float wob = noise(vec3(dir * 2.2, seed + boilStep * 1.7)) - 0.5;
    float rimR = 1.0 + wob * wobble * 0.22;
    float sel = inp.selected;
    float w = inkWidth * (0.55 + 0.9 * noise(vec3(dir * 3.5, seed * 0.7 + boilStep * 2.3))) * (1.0 + sel * 0.8);
    float outer = rimR + w * 0.3;
    if (r > outer) return vec4(0.0);

    // the sphere under the pen line (r is rescaled so the shading fills the drawn shape)
    vec2 uv = inp.uv / max(rimR, 0.5);
    float r2 = min(dot(uv, uv), 1.0);
    vec3 n = vec3(uv, -sqrt(1.0 - r2));
    vec4 clip = projection * vec4(vCenterView + n * inp.size, 1.0);

    float a = lightAngle * TAU;
    vec3 l = normalize(vec3(cos(a) * 0.75, 0.65, sin(a) * 0.75 - 0.5));
    float ndl = dot(n, l);
    float lit = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
    float q = floor(lit * bands) / max(bands - 1.0, 1.0);
    vec3 base = mix(inp.color.rgb, vec3(1.0), 0.12 + 0.25 * inp.hovered);
    vec3 c = base * mix(0.5, 1.08, q);

    // halftone in the shadow: dot size grows with darkness
    float shade = clamp(1.0 - lit * 1.6, 0.0, 1.0);
    vec2 cell = rot2(0.785) * vec4(inp.uv * 256.0, 0.0, 1.0).xy / (halftone * pixelRatio);
    vec2 f = fract(cell) - 0.5;
    float dotR = sqrt(shade) * 0.55;
    float dots = 1.0 - smoothstep(dotR - 0.08, dotR + 0.08, length(f));
    c = mix(c, base * 0.28, dots * step(0.01, shade));

    // hard specular glint
    vec3 h = normalize(l + vec3(0.0, 0.0, -1.0));
    float spec = dot(n, h);
    c = mix(c, vec3(1.0), smoothstep(0.955, 0.965, spec));

    // ink: the band between the inner and outer edge of the pen stroke
    float ink = smoothstep(outer - w - 0.03, outer - w, r);
    vec3 inkC = mix(inkColor, vec3(0.82, 0.16, 0.12), sel);
    c = mix(c, inkC, ink);
    fragColor = vec4(c, 1.0);
    return fragColor;
}

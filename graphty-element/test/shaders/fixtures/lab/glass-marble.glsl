/* graphty-shader 1
{
    "id": "lab/glass-marble",
    "name": "Glass marble",
    "params": [
        {
            "name": "twist",
            "type": "number",
            "default": 2.2,
            "min": 0,
            "max": 8,
            "primary": true
        },
        {
            "name": "vanes",
            "type": "integer",
            "default": 4,
            "min": 2,
            "max": 10
        },
        {
            "name": "ior",
            "type": "number",
            "default": 1.5,
            "min": 1,
            "max": 2.4
        },
        {
            "name": "thickness",
            "type": "number",
            "default": 0.12,
            "min": 0.02,
            "max": 0.4
        },
        {
            "name": "spin",
            "type": "number",
            "default": 0.25,
            "min": 0,
            "max": 2,
            "varies": true
        },
        {
            "name": "reflection",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 2
        },
        {
            "name": "glassTint",
            "type": "color",
            "default": "#cfe6ff"
        },
        {
            "name": "secondColor",
            "type": "color",
            "default": "#f2efe6"
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

const int STEPS = 28;
vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    vec3 n = labSphereNormal();
    vec3 rd = labEyeRay(n);
    float ndv = max(dot(n, -rd), 0.0);
    float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    vec3 reflC = labStudio(labToWorld(reflect(rd, n)));

    vec3 t = refract(rd, n, 1.0 / ior);
    float chord = max(-2.0 * dot(n, t), 0.0);
    float spinA = inp.time * spin + inp.seed * TAU;
    float tilt = (inp.seed - 0.5) * 1.6;
    vec3 acc = vec3(0.0);
    float trans = 1.0;
    // a per-pixel start offset turns the layered slices of a fixed-step march into fine grain
    float jitter = hash12(vec4(inp.uv * 256.0, 0.0, 1.0).xy);
    for (int i = 0; i < STEPS; i++) {
        float s = (float(i) + jitter) / float(STEPS) * chord;
        vec3 q = labToWorld(n + t * s);
        q.xy = rot2(tilt) * q.xy;
        q.xz = rot2(spinA) * q.xz;
        float rho = length(q.xz);
        float ang = atan(q.z, q.x) + twist * q.y;
        float vane = abs(sin(ang * vanes * 0.5)) * rho;
        float dens = (1.0 - smoothstep(thickness * 0.4, thickness, vane)) * (1.0 - smoothstep(0.55, 0.8, length(q)));
        float idx = mod(floor(ang * vanes / TAU + 0.5), 2.0);
        vec3 col = idx < 0.5 ? inp.color.rgb * 1.25 : secondColor;
        col *= 0.75 + 0.5 * (1.0 - s / max(chord, 1e-3));
        float a = clamp(dens * 0.3, 0.0, 1.0);
        acc += trans * a * col;
        trans *= 1.0 - a;
    }
    vec3 e = n + t * chord;
    vec3 outDir = refract(t, -e, ior);
    if (dot(outDir, outDir) < 1e-4) outDir = reflect(t, -e);
    // what shows through: a soft gradient rather than the studio, whose horizon and softboxes
    // read as a black wedge and stray squares inside the glass
    vec3 ow = labToWorld(outDir);
    vec3 tint = mix(glassTint, inp.color.rgb, 0.3);
    vec3 behind = tint * mix(vec3(0.3, 0.29, 0.32), vec3(0.7, 0.75, 0.85), smoothstep(-0.7, 0.8, ow.y));
    behind += tint * 0.6 * pow(max(dot(ow, labToWorld(labLight())), 0.0), 6.0);
    vec3 inside = acc + trans * behind;
    vec3 c = mix(inside, reflC, clamp(fres * reflection, 0.0, 1.0));
    vec3 l = labLight();
    c += vec3(1.2) * pow(max(dot(reflect(rd, n), l), 0.0), 300.0);
    c = mix(c, c + vec3(0.25), inp.hovered);
    c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.88, 0.93, length(inp.uv)) * inp.selected);
    fragColor = vec4(labTone(c), 1.0);
    return fragColor;
}

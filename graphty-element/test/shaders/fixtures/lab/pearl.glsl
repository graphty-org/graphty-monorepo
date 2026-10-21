/* graphty-shader 1
{
    "id": "lab/pearl",
    "name": "Pearl",
    "params": [
        {
            "name": "tint",
            "type": "number",
            "default": 0.8,
            "min": 0,
            "max": 1,
            "primary": true
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

// Each material is a function of the view-space normal n (a matcap lookup is uv = n.xy * 0.5 + 0.5).
vec3 matClay(vec3 n, vec3 base) {
    vec3 l = labLight();
    float d = max(dot(n, l), 0.0);
    float wrap = clamp((dot(n, l) + 0.4) / 1.4, 0.0, 1.0);
    vec3 c = base * (0.18 + 0.75 * wrap * wrap) + vec3(0.06) * pow(d, 6.0);
    return c * (0.92 + 0.08 * noise(n.xy * 40.0));
}
vec3 matChrome(vec3 n, vec3 base) {
    vec3 rw = labToWorld(reflect(vec3(0.0, 0.0, 1.0), n));
    // the studio floor is near black; a bright horizon band keeps chrome readable on a dark page
    vec3 env = labStudio(rw) + vec3(0.6, 0.65, 0.75) * exp(-abs(rw.y) * 5.0) + vec3(0.07);
    return labTone(env * mix(vec3(1.0), base * 1.6, 0.25));
}
vec3 matJade(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndv = -n.z;
    vec3 deep = vec3(0.02, 0.18, 0.10) + base * 0.15;
    vec3 lit = vec3(0.45, 0.85, 0.55) * 0.6 + base * 0.35;
    float veins = smoothstep(0.55, 0.75, fbm(n * 3.0 + inp.seed * 10.0));
    vec3 c = mix(deep, lit, pow(ndv, 1.2) * 0.8 + 0.25 * max(dot(n, l), 0.0));
    c = mix(c, c * 1.5 + 0.08, veins * 0.5);
    c += vec3(0.9) * pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, -1.0)), 0.0), 60.0);
    c += labStudio(labToWorld(reflect(vec3(0.0, 0.0, 1.0), n))) * 0.06 * pow(1.0 - ndv, 2.0);
    return c;
}
vec3 matPearl(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndv = -n.z;
    vec3 irid = palette(ndv * 0.9 + n.y * 0.15 + inp.time * 0.03 * animate, vec3(0.82), vec3(0.14), vec3(1.0), vec3(0.0, 0.33, 0.67));
    vec3 c = irid * (0.55 + 0.45 * clamp((dot(n, l) + 0.3) / 1.3, 0.0, 1.0));
    c = mix(c, c * (0.7 + base * 0.6), 0.35);
    c += vec3(0.8) * pow(max(dot(normalize(l + vec3(0.0, 0.0, -1.0)), n), 0.0), 40.0);
    return c;
}
vec3 matVelvet(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndv = -n.z;
    float sheen = pow(1.0 - ndv, 2.0);
    vec3 c = base * 0.45 * (0.4 + 0.6 * max(dot(n, l), 0.0));
    c += mix(base, vec3(1.0), 0.35) * sheen * 1.1;
    return c * (0.9 + 0.1 * hash12(vec4(inp.uv * 256.0, 0.0, 1.0).xy));
}
vec3 matWax(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndl = dot(n, l);
    float sss = clamp((ndl + 0.6) / 1.6, 0.0, 1.0);
    vec3 warm = mix(base, vec3(1.0, 0.55, 0.35), 0.35);
    vec3 c = mix(warm * 0.25, base * 1.05 + 0.05, sss);
    c += warm * 0.35 * pow(1.0 - (-n.z), 3.0);
    c += vec3(0.25) * pow(max(dot(normalize(l + vec3(0.0, 0.0, -1.0)), n), 0.0), 12.0);
    return c;
}
vec3 matToon(vec3 n, vec3 base) {
    vec3 l = labLight();
    float ndl = max(dot(n, l), 0.0);
    float band = ndl > 0.65 ? 1.0 : (ndl > 0.25 ? 0.7 : 0.42);
    vec3 c = base * band;
    c = mix(c, vec3(1.0), step(0.96, max(dot(normalize(l + vec3(0.0, 0.0, -1.0)), n), 0.0)));
    c = mix(c, base * 0.15, smoothstep(0.86, 0.9, length(inp.uv)));
    return c;
}
vec3 material(float id, vec3 n, vec3 base) {
    if (id < 0.5) return matClay(n, base);
    if (id < 1.5) return matChrome(n, base);
    if (id < 2.5) return matJade(n, base);
    if (id < 3.5) return matPearl(n, base);
    if (id < 4.5) return matVelvet(n, base);
    if (id < 5.5) return matWax(n, base);
    return matToon(n, base);
}
vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    vec3 n = labSphereNormal();
    vec3 base = mix(vec3(0.75), inp.color.rgb, tint);
    float a = perCommunity > 0.5 ? mod(vData.w, 7.0) : materialA;
    float b = perCommunity > 0.5 ? mod(vData.w + 1.0, 7.0) : materialB;
    float k = animate > 0.5 ? 0.5 + 0.5 * sin(inp.time * 0.8 + inp.seed * 0.5) : mixAmount;
    vec3 c = mix(material(a, n, base), material(b, n, base), k);
    c = mix(c, c + vec3(0.3), inp.hovered);
    c = mix(c, vec3(1.0, 0.9, 0.5), smoothstep(0.85, 0.9, length(inp.uv)) * inp.selected);
    fragColor = vec4(c, 1.0);
    return fragColor;
}

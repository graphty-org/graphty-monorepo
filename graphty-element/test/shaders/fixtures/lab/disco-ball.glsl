/* graphty-shader 1
{
    "id": "lab/disco-ball",
    "name": "Disco ball",
    "params": [
        {
            "name": "facets",
            "type": "integer",
            "default": 22,
            "min": 6,
            "max": 64,
            "primary": true
        },
        {
            "name": "sparkle",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 3,
            "varies": true
        },
        {
            "name": "turn",
            "type": "number",
            "default": 0.15,
            "min": 0,
            "max": 2
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

vec3 fib(float i, float count) {
    float y = 1.0 - 2.0 * (i + 0.5) / count;
    float r = sqrt(max(0.0, 1.0 - y * y));
    float a = i * 2.39996323;
    return vec3(cos(a) * r, y, sin(a) * r);
}
vec3 ringDir(float elevDeg, float azDeg) {
    float e = radians(elevDeg);
    float az = radians(azDeg);
    return vec3(cos(e) * cos(az), sin(e), cos(e) * sin(az));
}
// the 58 facet normals of a round brilliant cut: table, star, kite, upper girdle, lower girdle,
// pavilion and culet
vec3 brilliant(float i) {
    if (i < 0.5) return vec3(0.0, 1.0, 0.0);
    if (i < 8.5) return ringDir(68.0, (i - 1.0) * 45.0 + 22.5);
    if (i < 16.5) return ringDir(50.0, (i - 9.0) * 45.0);
    if (i < 32.5) return ringDir(36.0, (i - 17.0) * 22.5 + 11.25);
    if (i < 48.5) return ringDir(-42.0, (i - 33.0) * 22.5 + 11.25);
    if (i < 56.5) return ringDir(-55.0, (i - 49.0) * 45.0);
    return vec3(0.0, -1.0, 0.0);
}
// nearest facet direction to d (object space): xyz = facet normal, w = margin to the next facet
vec4 facetOf(vec3 d) {
    float best = -2.0;
    float second = -2.0;
    vec3 bn = d;
    float count = cut > 0.5 ? facets : 58.0;
    for (int i = 0; i < 64; i++) {
        if (float(i) >= count) break;
        vec3 f = cut > 0.5 ? fib(float(i), count) : brilliant(float(i));
        float k = dot(d, f);
        if (k > best) { second = best; best = k; bn = f; } else if (k > second) { second = k; }
    }
    return vec4(bn, best - second);
}
vec3 toObj(vec3 v, float a, float b) { v.xz = rot2(a) * v.xz; v.xy = rot2(b) * v.xy; return v; }
vec3 fromObj(vec3 v, float a, float b) { v.xy = rot2(-b) * v.xy; v.xz = rot2(-a) * v.xz; return v; }
// a contrasty version of the studio: dark surroundings and hot lights make the fire read
vec3 env(vec3 d) { vec3 e = labStudio(d); return pow(e, vec3(1.5)) * 1.4 + vec3(0.05, 0.045, 0.07); }

// one color channel's path through the stone (object space, unit sphere): refract in at p,
// bounce off two back facets, refract out. Each hit looks up the facet where the ray lands, so
// one front facet breaks into a mosaic of colored fragments.
vec3 fire(vec3 p, vec3 iw, vec3 fn, float eta, float ra, float rb) {
    vec3 t = refract(iw, fn, 1.0 / eta);
    for (int k = 0; k < 2; k++) {
        p = normalize(p + t * max(-2.0 * dot(p, t), 0.0));
        vec3 back = fromObj(facetOf(toObj(p, ra, rb)).xyz, ra, rb);
        vec3 out1 = refract(t, -back, eta);
        if (k == 1 && dot(out1, out1) > 1e-4) return env(out1) * 0.9;
        t = reflect(t, back);
    }
    return env(t) * 0.7;
}

vec3 gem(vec3 nw, vec3 iw, vec3 body, float diamond) {
    float ra = inp.seed * 40.0 + inp.time * turn;
    float rb = inp.seed * 17.0;
    vec4 fo = facetOf(toObj(nw, ra, rb));
    vec3 fn = fromObj(fo.xyz, ra, rb);
    float disp = dispersion * (1.0 + diamond * 1.5);
    vec3 iorC = ior + disp * vec3(-1.0, 0.0, 1.0);
    // one ray per color channel is the expensive part: medium traces red and blue and blends
    // green, low traces one ray for all three
    vec3 inside = vec3(fire(nw, iw, fn, iorC.x, ra, rb).r, fire(nw, iw, fn, iorC.y, ra, rb).g, fire(nw, iw, fn, iorC.z, ra, rb).b);
    float ndv = max(dot(fn, -iw), 0.0);
    float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
    float fres = f0 + (1.0 - f0) * pow(1.0 - ndv, 5.0);
    vec3 refl = env(reflect(iw, fn));
    vec3 c = inside * mix(body, vec3(1.0), diamond) * (1.0 - fres) + refl * fres;
    // sparkle: a facet that mirrors the key light twinkles
    vec3 lw = labToWorld(labLight());
    float glint = pow(max(dot(reflect(iw, fn), lw), 0.0), 200.0);
    float tw = 0.5 + 0.5 * sin(inp.time * 7.0 + hash13(fo.xyz * 91.0 + inp.seed) * 60.0);
    c += sparkle * glint * tw * vec3(6.0);
    // facet edges catch a little light
    c += vec3(0.15) * (1.0 - smoothstep(0.0, 0.012, fo.w)) * (0.3 + diamond);
    return c;
}

vec3 disco(vec3 nw, vec3 iw) {
    float spinA = inp.time * 0.4 + inp.seed * 6.0;
    vec3 d = nw;
    d.xz = rot2(spinA) * d.xz;
    float rows = 14.0;
    float lat = asin(clamp(d.y, -1.0, 1.0));
    float row = floor((lat / PI + 0.5) * rows);
    float latQ = ((row + 0.5) / rows - 0.5) * PI;
    float perRow = max(3.0, floor(rows * 2.0 * cos(latQ)));
    float lon = atan(d.z, d.x);
    float col = floor((lon / TAU + 0.5) * perRow);
    float lonQ = ((col + 0.5) / perRow - 0.5) * TAU;
    vec3 tn = vec3(cos(latQ) * cos(lonQ), sin(latQ), cos(latQ) * sin(lonQ));
    tn.xz = rot2(-spinA) * tn.xz;
    vec2 cellUV = vec2(fract((lat / PI + 0.5) * rows), fract((lon / TAU + 0.5) * perRow));
    float grout = smoothstep(0.0, 0.08, min(min(cellUV.x, 1.0 - cellUV.x), min(cellUV.y, 1.0 - cellUV.y)));
    vec3 r = reflect(iw, normalize(mix(tn, nw, 0.1)));
    // a bright horizon band so the mirror tiles do not mostly reflect the near-black floor
    vec3 c = (labStudio(r) + vec3(0.7, 0.72, 0.8) * exp(-abs(r.y) * 4.0) + vec3(0.08)) * vec3(0.85, 0.88, 0.95);
    float h = hash12(vec2(row, col) + inp.seed);
    c *= 0.6 + 0.4 * h;
    vec3 lw = labToWorld(labLight());
    c += vec3(8.0) * pow(max(dot(r, lw), 0.0), 120.0) * sparkle;
    return mix(vec3(0.03), c, grout);
}

vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    vec3 n = labSphereNormal();
    vec3 iw = labToWorld(labEyeRay(n));
    vec3 nw = labToWorld(n);
    float isDisco = discoHubs * step(discoDegree, vData.x);
    float diamond = step(1.0 - diamondRank, sqrt(vData.y));
    vec3 body = pow(inp.color.rgb, vec3(2.2)) * 2.2;
    vec3 c = isDisco > 0.5 ? disco(nw, iw) : gem(nw, iw, body, diamond);
    c = mix(c, c * 1.4 + 0.1, inp.hovered);
    c = mix(c, vec3(1.0, 0.85, 0.4), smoothstep(0.88, 0.93, length(inp.uv)) * inp.selected);
    fragColor = vec4(labTone(c), 1.0);
    return fragColor;
}

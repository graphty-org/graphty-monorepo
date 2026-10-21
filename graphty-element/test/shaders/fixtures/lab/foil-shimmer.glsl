/* graphty-shader 1
{
    "id": "lab/foil-shimmer",
    "name": "Foil shimmer",
    "params": [
        {
            "name": "foil",
            "type": "number",
            "default": 0.9,
            "min": 0,
            "max": 1,
            "primary": true
        },
        {
            "name": "sweepSpeed",
            "type": "number",
            "default": 0.35,
            "min": 0,
            "max": 2
        },
        {
            "name": "bandWidth",
            "type": "number",
            "default": 0.18,
            "min": 0.02,
            "max": 1
        },
        {
            "name": "sparkle",
            "type": "number",
            "default": 1.2,
            "min": 0,
            "max": 3
        }
    ]
}
*/
float nodeFlag(float i, float salt, float share) { return step(hash11(i * 0.6180339 + salt * 1.7313 + 0.5), share); }

float isMatch(float i) { return nodeFlag(i, 40.0 + floor(query) * 7.0, matchShare); }
// the sweep band at a screen position: 1 in the band
float band(vec2 frag) {
    vec2 s = frag / resolution.y;
    float x = dot(s, normalize(vec2(1.0, 0.45)));
    float span = resolution.x / resolution.y + 1.0;
    float c = fract(inp.time * sweepSpeed) * (span + 1.0) - 0.5;
    float d = (x - c) / bandWidth;
    return exp(-d * d);
}
// pastel, silvered rainbow: real foil is mostly bright metal with color in thin bands
vec3 thinFilm(float t) { return mix(palette(t, vec3(0.6), vec3(0.4), vec3(1.0), vec3(0.0, 0.33, 0.67)), vec3(0.92, 0.94, 1.0), 0.3); }


vec3 labShade(vec3 n, vec3 base) {
    vec3 L = normalize(vec3(-0.45, 0.6, -0.65));
    float diff = max(dot(n, L), 0.0);
    vec3 h = normalize(L + vec3(0.0, 0.0, -1.0));
    float spec = pow(max(dot(n, h), 0.0), 48.0);
    float rim = pow(1.0 + n.z, 3.0);
    return base * (0.22 + 0.78 * diff) + vec3(0.55) * spec + base * rim * 0.35;
}

vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    vec3 n = labSphereNormal();
    float m = isMatch(vInfo.y);
    vec3 c = labShade(n, inp.color.rgb);
    if (m > 0.5) {
        float b = band(vec4(inp.uv * 256.0, 0.0, 1.0).xy);
        // foil hue follows the surface angle, the band position and slow drift
        float t = (n.x * 0.5 + n.y * 0.7 + (1.0 + n.z) * 1.4) + b * 0.5 + inp.seed + inp.time * 0.06;
        vec3 film = thinFilm(t);
        vec3 lit = labShade(n, mix(inp.color.rgb, film, 0.75));
        c = mix(c, lit, foil);
        c += film * b * 0.7 * foil;
        // sparkles: a few cells flash while the band passes
        vec2 cell = floor(inp.uv * 6.0);
        float tw = hash13(vec3(cell, floor(inp.time * 9.0) + vInfo.y));
        float spark = step(0.86, tw) * b;
        vec2 f = fract(inp.uv * 6.0) - 0.5;
        float star = exp(-abs(f.x) * 14.0) * exp(-abs(f.y) * 3.0) + exp(-abs(f.y) * 14.0) * exp(-abs(f.x) * 3.0);
        c += vec3(1.0) * spark * star * sparkle;
        // a thin gold-white rim so matches read even between sweeps
        c += vec3(1.0, 0.92, 0.7) * pow(1.0 + n.z, 4.0) * 0.8;
    } else {
        c = mix(c, vec3(luminance(c)) * 0.6, dimOthers);
    }
    c = mix(c, vec3(1.0), 0.3 * inp.hovered + 0.35 * inp.selected * pow(1.0 + n.z, 2.0));
    fragColor = vec4(c, 1.0);
    return fragColor;
}

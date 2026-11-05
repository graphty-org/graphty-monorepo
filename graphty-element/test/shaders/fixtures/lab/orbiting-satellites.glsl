/* graphty-shader 1
{
    "id": "lab/orbiting-satellites",
    "name": "Satellites",
    "place": "around",
    "params": [
        {
            "name": "moons",
            "type": "integer",
            "default": 3,
            "min": 1,
            "max": 12,
            "varies": true
        },
        {
            "name": "speed",
            "type": "number",
            "default": 1.5,
            "min": 0,
            "max": 6
        },
        {
            "name": "orbit",
            "type": "number",
            "default": 2.1,
            "min": 1.3,
            "max": 3.2
        },
        {
            "name": "tilt",
            "type": "number",
            "default": 1.05,
            "min": 0,
            "max": 1.5
        },
        {
            "name": "moonSize",
            "type": "number",
            "default": 0.2,
            "min": 0.05,
            "max": 0.5
        },
        {
            "name": "moonColor",
            "type": "color",
            "default": "#cfe8ff",
            "primary": true
        },
        {
            "name": "ringOpacity",
            "type": "number",
            "default": 0.35,
            "min": 0,
            "max": 1
        }
    ]
}
*/
vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    float count = floor(1.0 + vData.x * (maxMoons - 1.0) + 0.5);
    float spin = speed * (0.25 + 1.5 * vData.z);
    float R = orbit;
    float ct = cos(tilt);
    // each node's orbit plane turns a little, so neighbors do not move in lockstep
    mat2 turn = rot2(inp.seed * TAU);
    vec2 p = turn * inp.uv;
    // the orbit ring
    vec2 q = vec2(p.x, p.y / max(ct, 0.05));
    float ringD = abs(length(q) - R) * ct;
    float behindRing = step(0.0, p.y) * step(length(inp.uv), 1.0);
    vec3 col = inp.color.rgb * mix(vec3(1.0), moonColor, 0.5) * exp(-ringD * ringD * 900.0) * ringOpacity * (1.0 - behindRing);
    float glow = 0.0;
    vec3 moons = vec3(0.0);
    for (int k = 0; k < 12; k++) {
        if (float(k) >= count) break;
        float a = inp.time * spin + float(k) * TAU / count + inp.seed * 17.0;
        vec2 m = vec2(cos(a), sin(a) * ct) * R;
        // moons behind the planet (upper half of the tilted ring, inside its disc) are hidden
        bool behind = sin(a) > 0.0 && length(m) < 1.0;
        // moons nearer to us look bigger
        float sz = moonSize * (1.0 - 0.25 * sin(a) * sin(tilt));
        float d = length(p - m);
        float core = 1.0 - smoothstep(sz - fwidth(d), sz + fwidth(d), d);
        float halo = exp(-d * d / (sz * sz * 6.0)) * 0.25;
        if (behind) { core *= 0.0; halo *= 0.15; }
        // lit moon: brighter on the side facing the planet's key light
        vec2 lp = (p - m) / sz;
        float shade = 0.55 + 0.45 * clamp(dot(lp, vec2(-0.6, 0.6)), -1.0, 1.0);
        moons += moonColor * (core * shade * 1.2 + halo);
        // a faint trail behind each moon along the orbit
        float ang = atan(q.y, q.x);
        float lag = mod(a - ang, TAU);
        glow += exp(-ringD * ringD * 1600.0) * exp(-lag * 3.0) * (1.0 - behindRing) * 0.4;
    }
    col += moons + moonColor * glow;
    float lum = max(col.r, max(col.g, col.b));
    if (lum < 0.003) return vec4(0.0);
    fragColor = vec4(col, 1.0);
    return fragColor;
}

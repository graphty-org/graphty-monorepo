/* graphty-shader 1
{
    "id": "lab/mandala",
    "name": "Mandala",
    "place": "replace",
    "params": [
        {
            "name": "folds",
            "type": "integer",
            "default": 0,
            "min": 0,
            "max": 12,
            "varies": true
        },
        {
            "name": "hueShift",
            "type": "number",
            "default": 0,
            "min": 0,
            "max": 1,
            "varies": true
        },
        {
            "name": "detail",
            "type": "number",
            "default": 5,
            "min": 1,
            "max": 12,
            "primary": true
        },
        {
            "name": "spin",
            "type": "number",
            "default": 0.25,
            "min": -2,
            "max": 2
        },
        {
            "name": "flow",
            "type": "number",
            "default": 0.3,
            "min": 0,
            "max": 2
        },
        {
            "name": "rim",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 1
        }
    ]
}
*/
vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    vec2 p = inp.uv;
    float r = length(p);
    float a = fill(r - 0.96);
    float sel = inp.selected * stroke(r - 1.08, 0.035);
    float glowR = exp(-max(r - 0.96, 0.0) * 14.0) * (0.25 + 0.5 * inp.hovered);
    if (max(max(a, sel), glowR) <= 0.003) return vec4(0.0);

    float folds = floor(3.0 + vData.x * 11.0 + extraFolds);
    float dir = inp.seed > 0.5 ? 1.0 : -1.0;
    float spinNow = spin * (1.0 + 2.0 * inp.hovered);
    float ang = atan(p.y, p.x) + inp.time * spinNow * dir;
    float wedge = TAU / folds;
    ang = mod(ang, wedge);
    ang = abs(ang - wedge * 0.5);
    vec2 q = r * vec2(cos(ang), sin(ang));

    float seed = inp.seed * 31.0;
    // petals: a ring of circles in the wedge, plus fbm filigree
    float petal = length(q - vec2(0.62, 0.0)) - (0.16 + 0.05 * sin(inp.time * 1.3 + seed));
    float petal2 = length(q - vec2(0.33, 0.0)) - 0.1;
    float fil = fbm(q * detail + vec2(seed, inp.time * flow));
    float bands = sin(r * 22.0 - inp.time * 2.0 * flow + fil * 6.0);

    vec3 pa = vec3(0.55, 0.5, 0.5);
    vec3 pb = vec3(0.45, 0.45, 0.5);
    vec3 pc = vec3(1.0, 1.0, 1.0);
    vec3 pd = vec3(0.0, 0.15, 0.3) + vData.w * 0.13 + hueShift;
    vec3 c = palette(fil * 1.4 + r * 0.7 - inp.time * 0.05, pa, pb, pc, pd);
    c *= 0.55 + 0.45 * smoothstep(-0.3, 1.0, bands);
    // petals drawn as glowing outlines and soft fills
    vec3 petalC = palette(0.3 + r, pa, pb, pc, pd + 0.25);
    c = mix(c, petalC, fill(petal) * 0.55);
    c += petalC * stroke(petal, 0.012) * 1.3;
    c = mix(c, vec3(1.0, 0.95, 0.8), stroke(petal2, 0.01));
    // ink lines between wedges
    c *= 0.6 + 0.4 * smoothstep(0.0, 0.04, ang * r);
    // bright center jewel and a gold rim
    c += vec3(1.0, 0.9, 0.7) * exp(-r * 9.0) * 1.2;
    c = mix(c, vec3(1.0, 0.82, 0.45), rim * stroke(r - 0.9, 0.035));
    c *= mix(1.0, 0.75, smoothstep(0.7, 0.96, r));

    vec3 col = mix(inp.color.rgb * glowR * 2.0, c, a);
    col = mix(col, vec3(1.0), sel);
    fragColor = vec4(col, max(max(a, sel), glowR));
    return fragColor;
}

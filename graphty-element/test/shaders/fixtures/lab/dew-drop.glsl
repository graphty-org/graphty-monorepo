/* graphty-shader 1
{
    "id": "lab/dew-drop",
    "name": "Dew drop",
    "params": [
        {
            "name": "sparkle",
            "type": "number",
            "default": 1.6,
            "min": 0,
            "max": 3,
            "primary": true
        },
        {
            "name": "tint",
            "type": "number",
            "default": 0.25,
            "min": 0,
            "max": 1
        },
        {
            "name": "bloom",
            "type": "number",
            "default": 0.9,
            "min": 0,
            "max": 2
        }
    ]
}
*/
vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    float r = length(inp.uv);
    float a = fill(r - 1.0);
    if (a <= 0.0) return vec4(0.0);
    float nz = sqrt(max(1.0 - r * r, 0.0));
    vec3 tintc = mix(vec3(0.85, 0.92, 1.0), inp.color.rgb, tint);
    vec3 c = tintc * (0.05 + 0.15 * nz) + tintc * pow(1.0 - nz, 3.0) * 0.6;
    c += vec3(1.0) * pow(max(dot(normalize(vec3(inp.uv, nz)), normalize(vec3(-0.4, 0.5, 0.8))), 0.0), 40.0) * sparkle;
    c = mix(c, vec3(1.0), 0.4 * inp.hovered + 0.4 * inp.selected * stroke(r - 0.92, 0.06));
    fragColor = vec4(c, a * (0.55 + 0.45 * (1.0 - nz)));
    return fragColor;
}

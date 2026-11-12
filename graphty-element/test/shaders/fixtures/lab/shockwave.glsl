/* graphty-shader 1
{
    "id": "lab/shockwave",
    "name": "Shockwave",
    "place": "around",
    "params": [
        {
            "name": "ringColor",
            "type": "color",
            "default": "#9fd8ff",
            "primary": true
        },
        {
            "name": "ringGlow",
            "type": "number",
            "default": 0.9,
            "min": 0,
            "max": 1.5
        },
        {
            "name": "chroma",
            "type": "number",
            "default": 1,
            "min": 0,
            "max": 4
        }
    ]
}
*/
// The lab's shockwave, small and fast, as an effect: one ring of about four radii that runs out
// from the node over its entrance, with a little chromatic split, never moving a node.
float ringAt(float r, float age) {
    if (age < 0.0 || age > 0.7) return 0.0;
    float radius = 1.0 + 3.0 * (age / 0.7);
    float width = 0.18 + 0.25 * (age / 0.7);
    float x = (r - radius) / width;
    float fade = 1.0 - age / 0.7;
    return exp(-x * x) * fade * fade;
}
vec4 shade(NodeInput inp) {
    float r = length(inp.uv) * 4.0;
    float age = inp.sinceEntered;
    float split = 0.04 * chroma;
    vec3 ring = vec3(ringAt(r - split, age), ringAt(r, age), ringAt(r + split, age));
    vec3 c = ringColor * ring * ringGlow;
    float a = max(max(c.r, c.g), c.b);
    return vec4(c, clamp(a, 0.0, 1.0));
}

/* graphty-shader 1
{
    "id": "lab/metaball-hull",
    "name": "metaball-hull",
    "params": [
        {
            "name": "look",
            "type": "enum",
            "default": "membrane",
            "values": [
                {
                    "value": "goo",
                    "label": "goo"
                },
                {
                    "value": "membrane",
                    "label": "membrane"
                },
                {
                    "value": "outline",
                    "label": "outline"
                }
            ],
            "primary": true
        },
        {
            "name": "blobRadius",
            "type": "number",
            "default": 7,
            "min": 2,
            "max": 25
        },
        {
            "name": "threshold",
            "type": "number",
            "default": 1,
            "min": 0.05,
            "max": 1.5
        },
        {
            "name": "breathe",
            "type": "number",
            "default": 0,
            "min": 0,
            "max": 1
        },
        {
            "name": "fillOpacity",
            "type": "number",
            "default": 0.55,
            "min": 0,
            "max": 1
        },
        {
            "name": "outline",
            "type": "number",
            "default": 2.5,
            "min": 0,
            "max": 8
        }
    ]
}
*/
// The lab's metaball hulls as a group outline: the element splats the members' kernels into the field
// this reads (g.field, g.fieldGradient), so the lab's texture taps become the field's values.
vec4 shade(GroupInput g) {
    float v = g.field;
    vec3 col = g.color.rgb;
    float grad = max(length(g.fieldGradient), 1e-5);
    float sd = (threshold - v) / grad;
    float inside = clamp(0.5 - sd, 0.0, 1.0);
    vec3 n = normalize(vec3(-g.fieldGradient * 2.5, 1.0));
    float rim = 1.0 - smoothstep(0.0, 18.0, -sd);
    float alpha = 0.0;
    vec3 c = vec3(0.0);
    if (look == 0) {
        // goo: translucent jelly, brighter toward the rim, a specular glint
        vec3 body = col * (0.35 + 0.45 * rim) + pow(max(dot(n, normalize(vec3(-0.5, 0.6, 0.8))), 0.0), 24.0) * 0.6;
        alpha = inside * mix(fillOpacity, 1.0, rim * 0.6);
        c = body * alpha;
        float ink = inside * (1.0 - smoothstep(outline - 1.0, outline, -sd)) * step(0.5, outline);
        c = mix(c, col * 1.25 + 0.1, ink);
        alpha = max(alpha, ink);
    } else if (look == 1) {
        // membrane: soap film, interference colors that swirl with the surface slope
        float fres = pow(1.0 - n.z, 0.6);
        float film = v * 3.0 + n.x * 2.0 + n.y * 1.5 + g.time * 0.08 * breathe + noise(g.uv * 6.0 + g.time * 0.1 * breathe) * 0.6;
        vec3 irid = palette(film, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
        vec3 body = mix(col * 0.25, irid, 0.35 + 0.65 * fres) * (0.35 + 0.9 * rim);
        body += pow(max(dot(n, normalize(vec3(-0.4, 0.5, 0.9))), 0.0), 40.0) * 0.9;
        alpha = inside * clamp(fillOpacity + 0.5 * rim, 0.0, 1.0);
        c = body * alpha;
    } else {
        // outline: a clean contour around each group, like a hand-drawn Euler diagram
        float line = 1.0 - smoothstep(max(outline, 1.0) - 1.0, max(outline, 1.0), abs(sd));
        alpha = max(inside * fillOpacity * 0.22, line);
        c = col * alpha;
    }
    return vec4(c, alpha);
}

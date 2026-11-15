/* graphty-shader 1
{
    "id": "lab/hologram",
    "name": "Hologram",
    "params": [
        {
            "name": "holoColor",
            "type": "color",
            "default": "#38e8ff",
            "primary": true
        },
        {
            "name": "scanDensity",
            "type": "number",
            "default": 9,
            "min": 1,
            "max": 30
        },
        {
            "name": "flicker",
            "type": "number",
            "default": 0.6,
            "min": 0,
            "max": 1
        },
        {
            "name": "glitch",
            "type": "number",
            "default": 0.04,
            "min": 0,
            "max": 0.3
        },
        {
            "name": "gridLines",
            "type": "integer",
            "default": 8,
            "min": 2,
            "max": 16
        }
    ]
}
*/
float nodeFlag(float i, float salt, float share) { return step(hash11(i * 0.6180339 + salt * 1.7313 + 0.5), share); }

float isGhost(float i) { return nodeFlag(i, 3.0, ghostShare); }
// 0..1 how far a hovered ghost has materialized
float printed(float i) { return i == hoverNode ? clamp((inp.time - hoverTime) / printTime, 0.0, 1.0) : 0.0; }

vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    float id = vInfo.y;
    if (isGhost(id) < 0.5) return vec4(0.0);
    float p = printed(id);
    float tick = floor(inp.time * 10.0);
    float burst = step(1.0 - glitch, hash12(vec2(tick, id)));
    vec2 uv = inp.uv;
    // glitch: rows slide sideways for one tick
    float row = floor(uv.y * 5.0 + hash11(tick) * 4.0);
    uv.x += burst * (hash12(vec2(row, tick + id)) - 0.5) * 0.7;
    float r2 = dot(uv, uv);
    float d = sqrt(r2) - 1.0;
    float body = fill(d);
    if (body <= 0.0) return vec4(0.0);
    // not-yet-printed part only
    float y01 = uv.y * 0.5 + 0.5;
    if (y01 < p) return vec4(0.0);
    float z = sqrt(max(0.0, 1.0 - r2));
    vec3 n = vec3(uv, z);
    float fres = pow(1.0 - z, 2.2);
    // wireframe globe spinning on its axis
    float lon = atan(n.x, n.z) + inp.time * 0.8 + id;
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float gx = abs(fract(lon / TAU * gridLines) - 0.5);
    float gy = abs(fract(lat / PI * gridLines * 0.5) - 0.5);
    float lw = 0.06 + 0.02 * gridLines / 8.0;
    float grid = smoothstep(0.5 - lw, 0.5, gx) + smoothstep(0.5 - lw, 0.5, gy);
    grid *= 0.35 + 0.65 * z;
    // world-space scanlines crawl upward
    float wy = vCenterWorld.y + uv.y * inp.size;
    float scan = 0.5 + 0.5 * sin(wy * scanDensity - inp.time * 8.0);
    // a brighter sweep band every couple of seconds
    float sw = (fract(wy * 0.02 - inp.time * 0.35) - 0.5) * 12.0;
    float sweep = exp(-sw * sw);
    float fl = 1.0 - flicker * (0.35 * step(0.92, hash12(vec2(floor(inp.time * 24.0), id))) + 0.15 * (0.5 + 0.5 * sin(inp.time * 53.0 + id)));
    vec3 col = holoColor * (0.12 + 1.4 * fres + 0.35 * scan + 0.7 * min(grid, 1.0) + 0.8 * sweep);
    col += vec3(1.0) * burst * 0.3;
    // the print head while materializing
    col += vec3(0.8, 1.0, 1.0) * 3.0 * exp(-abs(y01 - p) * 60.0) * step(0.001, p) * step(p, 0.999);
    col *= fl * (0.6 + 0.4 * inp.hovered);
    fragColor = vec4(col, body * 0.9);
    return fragColor;
}

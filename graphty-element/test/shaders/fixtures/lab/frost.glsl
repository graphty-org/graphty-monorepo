/* graphty-shader 1
{
    "id": "lab/frost",
    "name": "Frost",
    "params": [
        {
            "name": "frostColor",
            "type": "color",
            "default": "#d8f2ff",
            "primary": true
        },
        {
            "name": "crystalScale",
            "type": "number",
            "default": 5,
            "min": 3,
            "max": 24
        },
        {
            "name": "sparkle",
            "type": "number",
            "default": 0.8,
            "min": 0,
            "max": 1
        }
    ]
}
*/
// secondary detail layers: one noise instead of a full fbm at low quality
const vec3 LIGHT_DIR = vec3(-0.48, 0.56, -0.67);
// view-space direction to world space (the view matrix is a rotation plus a translation)
vec3 toWorld(vec3 n) { return vec3(dot(view[0].xyz, n), dot(view[1].xyz, n), dot(view[2].xyz, n)); }
float lambert(vec3 n) { return max(dot(n, normalize(LIGHT_DIR)), 0.0); }
float specular(vec3 n, float power) {
    vec3 h = normalize(normalize(LIGHT_DIR) + vec3(0.0, 0.0, -1.0));
    return pow(max(dot(n, h), 0.0), power);
}
// write the depth of a point given in node-local units (radius 1, view-space axes)
void depthAt(vec3 local) {
    vec4 clip = projection * vec4(vCenterView + local * inp.size, 1.0);
}
// Worley noise on a sphere: three planar projections blended by the normal
vec2 voronoiTri(vec3 p, vec3 n) {
    vec3 w = pow(abs(n), vec3(4.0));
    w /= dot(w, vec3(1.0));
    return voronoi(p.yz) * w.x + voronoi(p.zx) * w.y + voronoi(p.xy) * w.z;
}

// the data attribute a story encodes: 0 = value, 1 = rank, 2 = degree
float pickData(float which) { return which < 0.5 ? vData.z : (which < 1.5 ? vData.y : vData.x); }
// a neighbor slot packed by trackNeighborAngles: x = screen angle, y = relative distance 0..1
vec2 unpackNeighbor(float v) { return vec2(floor(v) / 1000.0 * TAU - PI, fract(v)); }

float frostAmount() {
    float since = inp.time - vState.z;
    float f = vState.w > 0.5 ? since * growSpeed : vCustom.x - since * thawSpeed;
    return clamp(f, 0.0, 1.5);
}
vec4 shade(NodeInput inp) {
    vec4 fragColor = vec4(0.0);
    vec3 n = labSphereNormal();
    float facing = -n.z;
    float r = length(inp.uv);
    float f = frostAmount();

    vec3 base = inp.color.rgb * (0.22 + 0.9 * lambert(n)) + vec3(1.0) * specular(n, 60.0) * 0.6;

    // the front: frost covers points where f has passed 1 - r, made jagged by crystal cells
    vec2 uv = inp.uv * crystalScale + inp.seed * 31.0;
    vec2 v = voronoi(uv);
    float facet = v.y - v.x;
    float fern = fbm(inp.uv * crystalScale * 0.5 + inp.seed * 7.0);
    float front = (1.0 - r) + facet * 0.25 + fern * 0.3;
    float mask = smoothstep(front - 0.025, front + 0.025, f);
    float band = exp(-abs(f - front) * 25.0) * step(0.001, f) * (1.0 - step(1.45, f));

    // ice: faceted cells, bright crystal edges, feathery dendrites, a bluish fresnel
    // translucent blue ice over the node's own color, with each facet tilted to catch the light
    float tilt = hash12(floor(inp.uv * crystalScale * 0.5 + inp.seed * 9.0) + floor(v.x * 3.0));
    float lines = 1.0 - smoothstep(0.0, 0.03, facet);
    float dend = pow(1.0 - abs(noise(inp.uv * crystalScale * 0.9 + 3.0) * 2.0 - 1.0), 12.0);
    vec3 deep = mix(inp.color.rgb * 0.35, vec3(0.12, 0.3, 0.55), 0.7);
    vec3 ice = mix(deep, frostColor, 0.35 + 0.45 * lambert(n) + 0.2 * tilt);
    ice += vec3(0.85, 0.95, 1.0) * (lines * 0.7 + dend * 0.45);
    ice += vec3(1.0) * specular(n, 40.0) * 0.5;
    ice += vec3(0.45, 0.75, 1.0) * pow(1.0 - facing, 2.0) * 0.8;
    float glint = step(0.992, hash12(floor(inp.uv * 40.0) + floor(inp.time * 5.0 + inp.seed * 10.0)));
    ice += vec3(1.6) * glint * sparkle * mask;

    // thaw: a wet, darker sheen where frost is melting back
    float thawing = 1.0 - vState.w;
    vec3 wet = mix(base, vec3(0.6, 0.75, 0.85), 0.25) + specular(n, 120.0) * 0.8;
    vec3 col = mix(base, wet, thawing * smoothstep(0.0, 0.2, vCustom.x - (inp.time - vState.z) * thawSpeed + 0.2) * (1.0 - mask));
    col = mix(col, ice, mask * 0.94);
    col += vec3(0.75, 0.92, 1.0) * band * 0.6 * vState.w;
    col = mix(col, col + 0.2, inp.hovered * 0.6);
    col += vec3(1.0) * stroke(r - 0.96, 0.03) * inp.selected;
    fragColor = vec4(col, 1.0);
    return fragColor;
}

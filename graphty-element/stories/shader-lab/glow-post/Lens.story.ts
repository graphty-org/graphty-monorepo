/**
 * Magnifier and EdgeLens: a lens that follows the mouse (or drifts on its own when the mouse is
 * away) to read a dense region. Three ways to build it:
 * - magnifier: a full-screen pass. Pixels inside the circle read the picture nearer the center
 *   (a fisheye remap), with red, green and blue read at slightly different zooms near the rim
 *   (chromatic aberration, like real glass), a bright fresnel rim and a soft drop shadow.
 * - fisheye: the GEOMETRY moves instead. The node and edge vertex shaders push every point inside
 *   the lens outward on screen and grow the nodes there, so nothing is blurred: the magnified
 *   region is drawn at full sharpness, and edges bend smoothly through the distortion.
 * - edgelens: fisheye, plus edges that only pass through the lens (neither end inside) are
 *   pushed out of it, bending around the rim like rubber bands. What is left inside is only the
 *   nodes there and their own edges -- the EdgeLens idea of Wong, Carpendale and Greenberg (2003).
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";

export default { title: "Shader Lab/Glow Bloom And Post/Lens", ...labMeta };

const MODES = ["magnifier", "fisheye", "edgelens"] as const;

interface Args extends GraphArgs {
    mode: (typeof MODES)[number];
    radius: number;
    zoom: number;
    aberration: number;
    followMouse: boolean;
}

// Shared vertex GLSL: where the lens is and how it moves a screen point (device pixels).
const LENS_GLSL = `
vec2 lensCenter() {
    if (followMouse > 0.5 && mouse.x >= 0.0) return mouse;
    return resolution * (0.5 + vec2(0.16 * sin(time * 0.35), 0.12 * sin(time * 0.27 + 1.0)));
}
float lensR() { return radius * pixelRatio; }
// Sarkar-Brown fisheye: s in 0..1 of the radius maps to (m+1)s/(ms+1)
vec2 fisheye(vec2 p, vec2 c, float R, float m) {
    vec2 d = p - c; float r = length(d);
    if (r >= R || r < 1e-4) return p;
    float s = r / R;
    return c + d / r * R * (m + 1.0) * s / (m * s + 1.0);
}
vec2 toPx(vec3 w) { vec4 c = viewProjection * vec4(w, 1.0); return (c.xy / c.w * 0.5 + 0.5) * resolution; }
// move world point w so it lands on screen pixel q, at the same depth
vec3 fromPx(vec3 w, vec2 q) {
    vec4 c = viewProjection * vec4(w, 1.0);
    vec2 dNdc = (q / resolution * 2.0 - 1.0) - c.xy / c.w;
    vec2 dView = dNdc * c.w / vec2(projection[0][0], projection[1][1]);
    vec3 right = vec3(view[0][0], view[1][0], view[2][0]);
    vec3 up = vec3(view[0][1], view[1][1], view[2][1]);
    return w + right * dView.x + up * dView.y;
}
float geoOn() { return mode > 0.5 ? 1.0 : 0.0; }
`;

const NODE_HOOKS = `
${LENS_GLSL}
float lensGrow = 1.0;
#define LAB_NODE_CENTER
vec3 labNodeCenter(vec3 p) {
    if (geoOn() < 0.5) return p;
    vec2 c = lensCenter(); float R = lensR(); float m = zoom - 1.0;
    vec2 a = toPx(p);
    float s = length(a - c) / R;
    if (s >= 1.0) return p;
    lensGrow = mix(1.0, (m + 1.0) / ((m * s + 1.0) * (m * s + 1.0)), 0.6);
    return fromPx(p, fisheye(a, c, R, m));
}
#define LAB_NODE_SCALE
float labNodeScale() { return lensGrow; }
`;

const EDGE_HOOKS = `
${LENS_GLSL}
#define LAB_EDGE_CENTER
vec3 labEdgeCenter(vec3 a, vec3 b, float t) {
    vec3 p = mix(a, b, t);
    if (geoOn() < 0.5) return p;
    vec2 c = lensCenter(); float R = lensR(); float m = zoom - 1.0;
    vec2 pa = toPx(a); vec2 pb = toPx(b); vec2 q = toPx(p);
    bool passThrough = length(pa - c) > R && length(pb - c) > R;
    if (mode > 1.5 && passThrough) {
        // push the whole edge sideways, away from the lens center, just past the rim
        vec2 ab = pb - pa;
        float h = clamp(dot(c - pa, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
        vec2 dir = pa + ab * h - c;
        dir = length(dir) > 1e-3 ? normalize(dir) : normalize(vec2(-ab.y, ab.x));
        float need = max(0.0, R * 1.08 - dot(q - c, dir));
        float w = 1.0 - smoothstep(R * 0.6, R * 1.9, length(q - c - dir * dot(q - c, dir)));
        return fromPx(p, q + dir * need * w);
    }
    return fromPx(p, fisheye(q, c, R, m));
}
`;

const NODE_FRAGMENT = `
void main() {
    vec3 n = labSphereNormal();
    float diff = max(dot(n, normalize(vec3(-0.5, 0.6, -0.6))), 0.0);
    vec3 c = vColor.rgb * (0.4 + 0.7 * diff) + vec3(0.35) * pow(diff, 24.0);
    c = mix(c, vec3(1.0), 0.45 * vState.x + 0.3 * vState.y);
    gl_FragColor = vec4(c, 1.0);
}
`;

const EDGE_FRAGMENT = `
void main() {
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    gl_FragColor = vec4(mix(c, vec3(1.0), 0.5 * lit), labEdgeCoverage() * mix(0.45, 1.0, lit));
}
`;

const POST = `
vec2 lensCenter() {
    if (followMouse > 0.5 && mouse.x >= 0.0) return mouse;
    return resolution * (0.5 + vec2(0.16 * sin(time * 0.35), 0.12 * sin(time * 0.27 + 1.0)));
}
void main() {
    vec3 base = texture2D(textureSampler, vUV).rgb;
    vec2 c = lensCenter() / resolution;
    float R = radius * pixelRatio;
    if (mode > 0.5) {
        // the geometry lens: draw only a faint ring so the reader sees where it is
        float d = length(vUV * resolution - c * resolution) - R;
        gl_FragColor = vec4(mix(base, vec3(1.0), (1.0 - smoothstep(0.0, 1.5 * pixelRatio, abs(d))) * 0.35), 1.0);
        return;
    }
    vec2 p = (vUV - c) * resolution;
    float r = length(p);
    float s = r / R;
    // drop shadow under the glass
    float sh = smoothstep(1.25, 0.95, length(p + vec2(6.0, -8.0) * pixelRatio) / R) * (1.0 - step(s, 1.0));
    vec3 col = base * (1.0 - 0.35 * sh);
    if (s < 1.0) {
        // fisheye profile: strong in the middle, easing to 1x at the rim so the edge is continuous
        float m = zoom;
        float k = mix(1.0 / m, 1.0, pow(s, 3.0));
        float ab = aberration * 0.06 * pow(s, 2.5);
        vec2 dir = p / resolution;
        float rr = texture2D(textureSampler, c + dir * k * (1.0 + ab)).r;
        float gg = texture2D(textureSampler, c + dir * k).g;
        float bb = texture2D(textureSampler, c + dir * k * (1.0 - ab)).b;
        col = vec3(rr, gg, bb);
        // glass: a slight cool tint, a fresnel rim and a specular highlight
        col = mix(col, col * vec3(0.96, 0.99, 1.04), 0.6);
        float fres = pow(s, 6.0);
        col += vec3(0.85, 0.92, 1.0) * fres * 0.45;
        vec2 hl = p / R - vec2(-0.45, 0.5);
        col += vec3(1.0) * exp(-dot(hl, hl) * 18.0) * 0.18;
    }
    // the metal rim
    float rim = 1.0 - smoothstep(0.0, 2.5 * pixelRatio, abs(r - R) - 1.5 * pixelRatio);
    col = mix(col, vec3(0.75, 0.78, 0.82) * (0.7 + 0.3 * (p.y / R)), rim);
    gl_FragColor = vec4(col, 1.0);
}
`;

const DEFAULTS: Args = {
    ...graphArgs,
    graph: "large",
    dim: 2,
    nodeSize: 0.8,
    edgeWidth: 1,
    mode: "edgelens",
    radius: 160,
    zoom: 3,
    aberration: 0.6,
    followMouse: true,
};

export const Lens = {
    args: DEFAULTS,
    argTypes: {
        ...graphArgTypes,
        mode: { control: "inline-radio", options: MODES },
        radius: range(40, 400, 1),
        zoom: range(1, 8),
        aberration: range(0, 2),
        followMouse: { control: "boolean" },
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#0c0f17",
            uniforms: {
                mode: MODES.indexOf(args.mode),
                radius: args.radius,
                zoom: args.zoom,
                aberration: args.aberration,
                followMouse: args.followMouse,
            },
            nodeLayer: { fragment: NODE_FRAGMENT, vertexHooks: NODE_HOOKS },
            edgeLayer: { fragment: EDGE_FRAGMENT, vertexHooks: EDGE_HOOKS, segments: 32 },
            post: [POST],
        }),
};

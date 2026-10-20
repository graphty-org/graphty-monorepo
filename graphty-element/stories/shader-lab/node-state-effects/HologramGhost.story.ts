/**
 * Hologram ghost state: nodes that are predicted, filtered or not loaded yet render as flickering
 * cyan scanline holograms (a rotating wireframe globe with a Fresnel rim and glitch jitter), and
 * their edges as dashed hologram beams. Hover a ghost and it materializes, printed bottom to top.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, NODE_FLAG, SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Hologram Ghost", ...labMeta };

interface Args extends GraphArgs {
    ghostShare: number;
    holoColor: string;
    scanDensity: number;
    flicker: number;
    glitch: number;
    gridLines: number;
    printTime: number;
}

const COMMON = `
${NODE_FLAG}
float isGhost(float i) { return nodeFlag(i, 3.0, ghostShare); }
// 0..1 how far a hovered ghost has materialized
float printed(float i) { return i == hoverNode ? clamp((time - hoverTime) / printTime, 0.0, 1.0) : 0.0; }
`;

const NODE_FRAGMENT = `
${COMMON}
${SHADE}
void main() {
    float id = vInfo.y;
    float g = isGhost(id);
    float p = printed(id);
    // a ghost is drawn by the overlay, except the part a hover has already printed
    if (g > 0.5 && vUV.y * 0.5 + 0.5 > p) discard;
    vec3 n = labSphereNormal();
    vec3 c = labShade(n, vColor.rgb);
    c = mix(c, vec3(1.0), 0.35 * vState.x * (1.0 - g));
    c = mix(c, vec3(1.0), 0.5 * vState.y * pow(1.0 + n.z, 2.0));
    gl_FragColor = vec4(c, 1.0);
}
`;

const GHOST_FRAGMENT = `
${COMMON}
void main() {
    float id = vInfo.y;
    if (isGhost(id) < 0.5) discard;
    float p = printed(id);
    float tick = floor(time * 10.0);
    float burst = step(1.0 - glitch, hash12(vec2(tick, id)));
    vec2 uv = vUV;
    // glitch: rows slide sideways for one tick
    float row = floor(uv.y * 5.0 + hash11(tick) * 4.0);
    uv.x += burst * (hash12(vec2(row, tick + id)) - 0.5) * 0.7;
    float r2 = dot(uv, uv);
    float d = sqrt(r2) - 1.0;
    float body = fill(d);
    if (body <= 0.0) discard;
    // not-yet-printed part only
    float y01 = uv.y * 0.5 + 0.5;
    if (y01 < p) discard;
    float z = sqrt(max(0.0, 1.0 - r2));
    vec3 n = vec3(uv, z);
    float fres = pow(1.0 - z, 2.2);
    // wireframe globe spinning on its axis
    float lon = atan(n.x, n.z) + time * 0.8 + id;
    float lat = asin(clamp(n.y, -1.0, 1.0));
    float gx = abs(fract(lon / TAU * gridLines) - 0.5);
    float gy = abs(fract(lat / PI * gridLines * 0.5) - 0.5);
    float lw = 0.06 + 0.02 * gridLines / 8.0;
    float grid = smoothstep(0.5 - lw, 0.5, gx) + smoothstep(0.5 - lw, 0.5, gy);
    grid *= 0.35 + 0.65 * z;
    // world-space scanlines crawl upward
    float wy = vCenterWorld.y + uv.y * vRadius;
    float scan = 0.5 + 0.5 * sin(wy * scanDensity - time * 8.0);
    // a brighter sweep band every couple of seconds
    float sw = (fract(wy * 0.02 - time * 0.35) - 0.5) * 12.0;
    float sweep = exp(-sw * sw);
    float fl = 1.0 - flicker * (0.35 * step(0.92, hash12(vec2(floor(time * 24.0), id))) + 0.15 * (0.5 + 0.5 * sin(time * 53.0 + id)));
    vec3 col = holoColor * (0.12 + 1.4 * fres + 0.35 * scan + 0.7 * min(grid, 1.0) + 0.8 * sweep);
    col += vec3(1.0) * burst * 0.3;
    // the print head while materializing
    col += vec3(0.8, 1.0, 1.0) * 3.0 * exp(-abs(y01 - p) * 60.0) * step(0.001, p) * step(p, 0.999);
    col *= fl * (0.6 + 0.4 * vState.x);
    gl_FragColor = vec4(col, body * 0.9);
}
`;

const EDGE_FRAGMENT = `
${COMMON}
void main() {
    float cov = labEdgeCoverage();
    float gs = max(isGhost(vInfo.x), isGhost(vInfo.y));
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float lit = max(abs(vTouch.x), abs(vTouch.y));
    if (gs < 0.5) {
        gl_FragColor = vec4(mix(c, vec3(1.0), 0.4 * lit), cov * mix(0.45, 1.0, lit));
        return;
    }
    float px = vT * vLengthPx;
    float dash = smoothstep(0.35, 0.5, fract(px / (14.0 * pixelRatio) - time * 1.2)) * (1.0 - smoothstep(0.85, 1.0, fract(px / (14.0 * pixelRatio) - time * 1.2)));
    float core = 1.0 - smoothstep(0.0, 1.0, abs(vSide));
    float fl = 1.0 - flicker * 0.4 * step(0.9, hash12(vec2(floor(time * 20.0), vInfo.z)));
    vec3 h = holoColor * (0.5 + 1.3 * dash) + vec3(0.6) * core * dash;
    gl_FragColor = vec4(h * fl, cov * (0.18 + 0.6 * dash) * fl);
}
`;

export const HologramGhost = {
    args: {
        ...graphArgs,
        edgeWidth: 2,
        ghostShare: 0.3,
        holoColor: "#38e8ff",
        scanDensity: 9,
        flicker: 0.6,
        glitch: 0.04,
        gridLines: 8,
        printTime: 0.9,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        ghostShare: range(0, 1),
        holoColor: { control: "color" },
        scanDensity: range(1, 30),
        flicker: range(0, 1),
        glitch: range(0, 0.3),
        gridLines: range(2, 16, 1),
        printTime: range(0.1, 3),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            background: "#05070d",
            uniforms: {
                ghostShare: args.ghostShare,
                holoColor: args.holoColor,
                scanDensity: args.scanDensity,
                flicker: args.flicker,
                glitch: args.glitch,
                gridLines: args.gridLines,
                printTime: args.printTime,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                addNodeOverlay(ctx, { name: "ghosts", fragment: GHOST_FRAGMENT, quadScale: 1.4, blend: "add" });
            },
        }),
};

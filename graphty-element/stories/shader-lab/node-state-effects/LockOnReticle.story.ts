/**
 * Lock-on reticle: click a node and HUD brackets snap in around it (overshooting, then settling),
 * a ticked ring counter-rotates outside them and a flash marks the lock; its edges stream dashes
 * outward to the neighbors. Hovering any node shows a lighter dashed tracking ring. The marks
 * keep a minimum size on screen, so a tiny node is still easy to spot.
 */
import { type GraphArgs, graphArgs, graphArgTypes, labMeta, mountLab, range } from "../harness";
import { addNodeOverlay, SHADE } from "./shared";

export default { title: "Shader Lab/Time-Driven Status And Event Effects/Lock On Reticle", ...labMeta };

interface Args extends GraphArgs {
    hudColor: string;
    snapTime: number;
    spin: number;
    ticks: number;
    lineWidth: number;
    minPixels: number;
}

const NODE_FRAGMENT = `
${SHADE}
void main() {
    vec3 n = labSphereNormal();
    vec3 c = labShade(n, vColor.rgb);
    c = mix(c, vec3(1.0), 0.3 * vState.x);
    c = mix(c, hudColor, 0.35 * vState.y * pow(1.0 + n.z, 1.5));
    gl_FragColor = vec4(c, 1.0);
}
`;

// only the hovered and selected nodes draw the overlay; it never shrinks below minPixels
const HUD_HOOKS = `
#define OV_SCALE
float ovScale(float pixelRadius) {
    bool on = nodeInfo.y == selectedNode || nodeInfo.y == hoverNode;
    return on ? max(1.0, minPixels / max(pixelRadius, 0.5)) : 0.0;
}
`;

const HUD_FRAGMENT = `
float easeOutBack(float t) { float c1 = 1.70158; float c3 = c1 + 1.0; float u = t - 1.0; return 1.0 + c3 * u * u * u + c1 * u * u; }
void main() {
    float px = 1.0 / max(vPixelRadius, 1.0);
    float lw = lineWidth * px;
    vec2 uv = vUV;
    float r = length(uv);
    float ang = atan(uv.y, uv.x);
    vec3 col = vec3(0.0);
    float a = 0.0;
    if (vInfo.y == selectedNode) {
        float t = clamp((time - selectTime) / snapTime, 0.0, 1.0);
        float R = mix(3.6, 1.45, easeOutBack(t));
        // four L brackets, turning
        vec2 q = abs(rot2(time * spin + (1.0 - t) * 1.5) * uv);
        float len = R * 0.42;
        float d = min(sdSegment(q, vec2(R, R - len), vec2(R, R)), sdSegment(q, vec2(R - len, R), vec2(R, R)));
        float br = fill(d - lw);
        // ticked ring counter-rotating outside
        float RR = R * 1.32;
        float tickMask = step(0.55, fract((ang - time * spin * 0.6) / TAU * ticks));
        float ring = stroke(r - RR, lw * 0.6) * tickMask;
        float major = stroke(r - RR, lw * 2.2) * step(0.92, fract((ang - time * spin * 0.6) / TAU * 4.0));
        // inner thin circle and four cardinal pips
        float inner = stroke(r - R * 0.86, lw * 0.4) * 0.6;
        vec2 c4 = abs(rot2(-time * spin * 0.3) * uv);
        float pip = fill(min(sdSegment(c4, vec2(R * 1.05, 0.0), vec2(R * 1.2, 0.0)), sdSegment(c4, vec2(0.0, R * 1.05), vec2(0.0, R * 1.2))) - lw);
        float lockFlash = exp(-max(time - selectTime - snapTime * 0.7, 0.0) * 5.0) * step(snapTime * 0.7, time - selectTime);
        float m = max(max(br, pip), max(ring, max(major, inner)));
        col = hudColor * (1.2 + 2.0 * lockFlash) + vec3(lockFlash);
        // a pulse ring on lock
        float pr = stroke(r - (R + (time - selectTime - snapTime * 0.7) * 6.0), lw * 1.5) * lockFlash * (1.0 - smoothstep(3.2, 4.8, r));
        a = max(m * mix(0.4, 1.0, t), pr);
        // a faint scan inside the brackets
        a = max(a, 0.12 * t * (1.0 - smoothstep(R * 0.95, R, max(q.x, q.y))) * step(0.5, fract(uv.y * 0.5 / px / 3.0)));
    } else {
        // hover: dashed tracking ring
        float dash = step(0.5, fract((ang + time * 1.5) / TAU * 16.0));
        a = stroke(r - 1.35, lw * 0.6) * dash * 0.85;
        col = hudColor;
    }
    if (a <= 0.003) discard;
    gl_FragColor = vec4(col, a);
}
`;

const EDGE_FRAGMENT = `
void main() {
    float cov = labEdgeCoverage();
    vec3 c = mix(vColorA.rgb, vColorB.rgb, vT);
    float sel = vTouch.y;
    if (sel != 0.0) {
        // distance from the selected end, dashes stream outward
        float u = (sel > 0.0 ? vT : 1.0 - vT) * vLengthPx / pixelRatio;
        float dash = smoothstep(0.4, 0.5, fract(u / 12.0 - time * 2.0)) * (1.0 - smoothstep(0.9, 1.0, fract(u / 12.0 - time * 2.0)));
        vec3 col = mix(c * 0.6, hudColor * 1.4, 0.5 + 0.5 * dash);
        gl_FragColor = vec4(col, cov * (0.55 + 0.45 * dash));
        return;
    }
    float lit = abs(vTouch.x);
    gl_FragColor = vec4(mix(c, vec3(1.0), 0.4 * lit), cov * mix(selectedNode >= 0.0 ? 0.3 : 0.5, 1.0, lit));
}
`;

export const LockOnReticle = {
    args: {
        ...graphArgs,
        edgeWidth: 1.75,
        hudColor: "#5cffb0",
        snapTime: 0.55,
        spin: 0.6,
        ticks: 48,
        lineWidth: 1.8,
        minPixels: 26,
    } satisfies Args,
    argTypes: {
        ...graphArgTypes,
        hudColor: { control: "color" },
        snapTime: range(0.1, 2),
        spin: range(-3, 3),
        ticks: range(8, 120, 1),
        lineWidth: range(0.5, 5),
        minPixels: range(4, 60, 1),
    },
    render: (args: Args) =>
        mountLab({
            graph: args.graph,
            nodes: args.nodes,
            dim: args.dim,
            nodeSize: args.nodeSize,
            edgeWidth: args.edgeWidth,
            uniforms: {
                hudColor: args.hudColor,
                snapTime: args.snapTime,
                spin: args.spin,
                ticks: args.ticks,
                lineWidth: args.lineWidth,
                minPixels: args.minPixels,
            },
            nodeLayer: { fragment: NODE_FRAGMENT },
            edgeLayer: { fragment: EDGE_FRAGMENT },
            setup: (ctx) => {
                const hud = addNodeOverlay(ctx, {
                    name: "hud",
                    fragment: HUD_FRAGMENT,
                    quadScale: 5,
                    vertexHooks: HUD_HOOKS,
                });
                // a HUD sits on the glass: never hidden behind nodes in front of the target
                hud.material.depthFunction = 519; // ALWAYS
                // lock onto the best-connected node so the story opens locked
                let best = 0;
                ctx.graph.degree.forEach((d, i) => {
                    if (d > ctx.graph.degree[best]) {
                        best = i;
                    }
                });
                ctx.select(best);
            },
        }),
};

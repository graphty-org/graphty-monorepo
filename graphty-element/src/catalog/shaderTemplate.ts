/**
 * @file `shaderTemplate`: a small working shader for one place, as shader text, so an editor can
 * open "New shader..." on code that already draws something and shows how a parameter is declared
 * and read.
 *
 * The text is code, not words for a reader: the header names a placeholder id and name, which the
 * author renames. Every template passes `parseShaderText` for its own place and the static checks.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderGeometry, ShaderRole, ShaderTarget, ShaderText } from "./shaders";
import { SHADER_TEXT_MAGIC } from "./shaderText";

/** Where a template is for: a target, a role and, for a node look, its geometry. @since 3.36.0 */
export interface ShaderTemplatePlace {
    /** What the shader draws on. */
    readonly target: ShaderTarget;
    /** A look or an effect. Groups and the background take looks only. */
    readonly role: ShaderRole;
    /** Node looks: on the node's shape (the default) or a card in its place. */
    readonly geometry?: ShaderGeometry;
}

/** One template: the header keys past id, name and the parameter, and the body. */
interface Template {
    readonly id: string;
    readonly name: string;
    readonly extra: Readonly<Record<string, unknown>>;
    readonly body: string;
}

const NODE_LOOK: Template = {
    id: "user/my-look",
    name: "My look",
    extra: {},
    body: `vec4 shade(NodeInput n) {
    // n.normal faces the viewer; lightDir points toward the light.
    float lit = 0.35 + 0.65 * max(dot(n.normal, lightDir), 0.0);
    vec3 base = mix(n.color.rgb, tint, 0.5 + 0.5 * n.uv.y);
    return vec4(base * lit, n.color.a);
}
`,
};

const NODE_CARD: Template = {
    id: "user/my-card",
    name: "My card",
    extra: { geometry: "card" },
    body: `vec4 shade(NodeInput n) {
    // n.uv runs from -1 to 1 across the card; outside the rounded square is transparent.
    float inside = fillAA(sdRoundBox(n.uv, vec2(0.85), 0.3));
    vec3 face = mix(n.color.rgb, tint, step(0.0, n.uv.y));
    return vec4(face, inside * n.color.a);
}
`,
};

const NODE_EFFECT: Template = {
    id: "user/my-effect",
    name: "My effect",
    extra: { reach: 2 },
    body: `vec4 shade(NodeInput n) {
    // n.uv is in node radii: the node's edge is 1, this square reaches 2.
    float ring = smoothstep(0.15, 0.0, abs(length(n.uv) - 1.5));
    // Effects return premultiplied color: rgb already times alpha.
    return vec4(tint * ring, ring);
}
`,
};

const EDGE_LOOK: Template = {
    id: "user/my-line",
    name: "My line",
    extra: {},
    body: `vec4 shade(EdgeInput e) {
    // e.t runs 0 to 1 from source to target; e.lengthPx is the edge's length on screen.
    float dash = step(0.5, fract(e.t * e.lengthPx / 16.0));
    return vec4(mix(e.color.rgb, tint, dash), e.color.a);
}
`,
};

const EDGE_EFFECT: Template = {
    id: "user/my-trail",
    name: "My trail",
    extra: { reach: 2 },
    body: `vec4 shade(EdgeInput e) {
    // e.side runs -1 to 1 across the drawn width; a pulse travels along e.t.
    float pulse = smoothstep(0.1, 0.0, abs(fract(e.time * 0.5) - e.t));
    float glow = pulse * exp(-e.side * e.side * 4.0);
    return vec4(tint * glow, glow);
}
`,
};

const GROUP_LOOK: Template = {
    id: "user/my-outline",
    name: "My outline",
    extra: {},
    body: `vec4 shade(GroupInput g) {
    // g.field is about 1 at a member's center and falls to 0 between groups.
    float inside = smoothstep(0.45, 0.55, g.field);
    float rim = inside - smoothstep(0.55, 0.7, g.field);
    float a = 0.2 * inside + 0.8 * rim;
    return vec4(tint * a, a);
}
`,
};

const BACKGROUND_LOOK: Template = {
    id: "user/my-background",
    name: "My background",
    extra: {},
    body: `vec4 shade(BackgroundInput b) {
    // b.uv runs 0 to 1 across the canvas, y up; canvasColor is the canvas's own color.
    vec3 sky = mix(canvasColor, tint, b.uv.y * 0.6);
    return vec4(sky, 1.0);
}
`,
};

/**
 * The template for a place.
 * @param place - The place.
 * @returns Its template.
 */
function templateOf(place: ShaderTemplatePlace): Template {
    switch (place.target) {
        case "edge":
            return place.role === "effect" ? EDGE_EFFECT : EDGE_LOOK;
        case "group":
            return GROUP_LOOK;
        case "background":
            return BACKGROUND_LOOK;
        default:
            if (place.role === "effect") {
                return NODE_EFFECT;
            }

            return place.geometry === "card" ? NODE_CARD : NODE_LOOK;
    }
}

/**
 * A short working shader for one place, as shader text: a header with an id, a name and one color
 * parameter (`tint`), and a `shade()` that already draws something visible. Paste it into
 * `session.shaders.add`, or edit it first.
 * @param place - What it draws on, its role and, for a node look, its geometry.
 * @returns The shader text.
 * @since 3.36.0
 * @example
 * ```ts
 * const text = shaderTemplate({ target: "node", role: "effect" });
 * await element.session.shaders.add(text, { place: { target: "node", role: "effect" } });
 * ```
 */
export function shaderTemplate(place: ShaderTemplatePlace): ShaderText {
    const template = templateOf(place);
    const keys = { id: template.id, name: template.name, ...template.extra };
    const lines = [
        ...Object.entries(keys).map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)},`),
        '    "params": [{ "name": "tint", "type": "color", "default": "#ff7a00" }]',
    ];

    return `/* ${SHADER_TEXT_MAGIC}\n{\n${lines.join("\n")}\n}\n*/\n${template.body}`;
}

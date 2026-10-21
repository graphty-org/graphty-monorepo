/**
 * @file `shaderTemplate`: a small working shader for one place, as shader text, so an editor can
 * open "New shader..." on code that already draws something and shows how a parameter is declared
 * and read.
 *
 * The text is code, not words for a reader: the header names a placeholder id and name, which the
 * author renames. Every template passes `parseShaderText` and the static checks, and returns
 * straight (not premultiplied) alpha, as every place does.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError } from "../errors";
import { PLACES_BY_TARGET, type ShaderPlace, type ShaderTarget, type ShaderText } from "./shaders";
import { SHADER_TEXT_MAGIC } from "./shaderText";

/** Where a template is for: a target and, except for the background, a place. @since 3.36.0 */
export interface ShaderTemplatePlace {
    /** What the shader draws on. */
    readonly target: ShaderTarget;
    /** Where it draws. Default: the target's first place (`"paint"`, or `"group"` for a group). */
    readonly place?: ShaderPlace;
}

/** One template: the header keys past id, name, place and the parameter, and the body. */
interface Template {
    readonly id: string;
    readonly name: string;
    readonly extra: Readonly<Record<string, unknown>>;
    readonly body: string;
}

const NODE: Readonly<Partial<Record<ShaderPlace, Template>>> = {
    paint: {
        id: "user/my-paint",
        name: "My paint",
        extra: {},
        body: `vec4 shade(NodeInput n) {
    // n.normal faces the viewer; lightDir points toward the light.
    float lit = 0.35 + 0.65 * max(dot(n.normal, lightDir), 0.0);
    vec3 base = mix(n.color.rgb, tint, 0.5 + 0.5 * n.uv.y);
    return vec4(base * lit, n.color.a);
}
`,
    },
    replace: {
        id: "user/my-sticker",
        name: "My sticker",
        extra: {},
        body: `vec4 shade(NodeInput n) {
    // n.uv runs from -1 to 1 across the node; outside the rounded square is transparent.
    float inside = fillAA(sdRoundBox(n.uv, vec2(0.85), 0.3));
    vec3 face = mix(n.color.rgb, tint, step(0.0, n.uv.y));
    return vec4(face, inside * n.color.a);
}
`,
    },
    over: {
        id: "user/my-overlay",
        name: "My overlay",
        extra: {},
        body: `vec4 shade(NodeInput n) {
    // The node's outline is at length(n.uv) == 1; stripes are drawn inside it.
    float inside = 1.0 - smoothstep(0.95, 1.0, length(n.uv));
    float stripe = step(0.5, fract(n.uv.x * 4.0));
    return vec4(tint, inside * stripe * 0.5);
}
`,
    },
    around: {
        id: "user/my-ring",
        name: "My ring",
        extra: { reach: 2 },
        body: `vec4 shade(NodeInput n) {
    // The node's outline is at length(n.uv) == 1; this square reaches 2.
    float ring = smoothstep(0.15, 0.0, abs(length(n.uv) - 1.5));
    return vec4(tint, ring);
}
`,
    },
    behind: {
        id: "user/my-shadow",
        name: "My shadow",
        extra: { reach: 2 },
        body: `vec4 shade(NodeInput n) {
    // Drawn before the node, which covers the middle; a soft disc shows around it.
    float disc = smoothstep(2.0, 0.8, length(n.uv));
    return vec4(tint, disc * 0.6);
}
`,
    },
};

const EDGE: Readonly<Partial<Record<ShaderPlace, Template>>> = {
    paint: {
        id: "user/my-line",
        name: "My line",
        extra: {},
        body: `vec4 shade(EdgeInput e) {
    // e.t runs 0 to 1 from source to target; e.lengthPx is the edge's length on screen.
    float dash = step(0.5, fract(e.t * e.lengthPx / 16.0));
    return vec4(mix(e.color.rgb, tint, dash), e.color.a);
}
`,
    },
    along: {
        id: "user/my-trail",
        name: "My trail",
        extra: { reach: 2 },
        body: `vec4 shade(EdgeInput e) {
    // e.side runs -1 to 1 across the drawn width; a pulse travels along e.t.
    float pulse = smoothstep(0.1, 0.0, abs(fract(e.time * 0.5) - e.t));
    float glow = pulse * exp(-e.side * e.side * 4.0);
    return vec4(tint, glow);
}
`,
    },
};

const GROUP: Template = {
    id: "user/my-outline",
    name: "My outline",
    extra: {},
    body: `vec4 shade(GroupInput g) {
    // g.field is about 1 at a member's center and falls to 0 between groups.
    float inside = smoothstep(0.45, 0.55, g.field);
    float rim = inside - smoothstep(0.55, 0.7, g.field);
    return vec4(tint, 0.2 * inside + 0.8 * rim);
}
`,
};

const BACKGROUND: Template = {
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
 * The template for a target and place.
 * @param target - What it draws on.
 * @param place - Where it draws, or undefined for the background.
 * @returns Its template.
 */
function templateOf(target: ShaderTarget, place: ShaderPlace | undefined): Template | undefined {
    switch (target) {
        case "background":
            return BACKGROUND;
        case "group":
            return GROUP;
        case "edge":
            return place === undefined ? undefined : EDGE[place];
        default:
            return place === undefined ? undefined : NODE[place];
    }
}

/**
 * A short working shader for one place, as shader text: a header with an id, a name, the place and
 * one color parameter (`tint`), and a `shade()` that already draws something visible there. Paste
 * it into `session.shaders.add`, or edit it first.
 * @param place - What it draws on and where.
 * @returns The shader text.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, its details carrying `shader.place-unsupported`
 *   `{ shader, place, allowed }`, for a place the target does not draw at.
 * @since 3.36.0
 * @example
 * ```ts
 * const text = shaderTemplate({ target: "node", place: "around" });
 * await element.session.shaders.add(text);
 * ```
 */
export function shaderTemplate(place: ShaderTemplatePlace): ShaderText {
    const allowed = PLACES_BY_TARGET[place.target];
    const at: ShaderPlace | undefined = place.place ?? allowed.at(0);
    const template = templateOf(place.target, at);
    if (template === undefined || (at !== undefined && !allowed.includes(at))) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `There is no ${place.target} shader template for the place "${String(at)}".`,
            source: "style",
            details: { code: "shader.place-unsupported", params: { shader: "", place: at ?? "", allowed } },
        });
    }

    const keys = {
        id: template.id,
        name: template.name,
        ...(at === undefined ? {} : { place: at }),
        ...template.extra,
    };
    const lines = [
        ...Object.entries(keys).map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)},`),
        '    "params": [{ "name": "tint", "type": "color", "default": "#ff7a00" }]',
    ];

    return `/* ${SHADER_TEXT_MAGIC}\n{\n${lines.join("\n")}\n}\n*/\n${template.body}`;
}

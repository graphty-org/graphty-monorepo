/**
 * @file Shaders as catalog data: the kinds, the descriptor a catalog lists, the parameter maps a
 * style layer writes, and the channels a shader of each kind covers.
 *
 * A shader is a small GPU program that decides the color of each pixel of something drawn. Here it
 * is only data: an id, a kind, the parameters it declares and the facts the element and an editor
 * read. The GLSL text is checked in `./shaderText` and kept by `./shaderRegistry`; drawing it is
 * the renderer's (design/rendering/shader-styles.md).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, OptionDescriptor } from "./types";

/**
 * What a shader draws on and what it does to the drawing beneath it.
 *
 * - `node-surface`: the pixels of the node's own shape, lit by the scene.
 * - `node-sprite`: a flat picture facing the camera, drawn in place of the shape.
 * - `node-effect`: a second drawing around or over the node.
 * - `edge-surface`: the pixels of the edge's line.
 * - `edge-effect`: light that travels along an edge of any route.
 * - `background`: the whole canvas behind the graph.
 * - `boundary`: one shape around each group of a layer's nodes.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderKind =
    "node-surface" | "node-sprite" | "node-effect" | "edge-surface" | "edge-effect" | "background" | "boundary";

/** Every shader kind, in the order above. @since 3.36.0 */
export const SHADER_KINDS: readonly ShaderKind[] = Object.freeze([
    "node-surface",
    "node-sprite",
    "node-effect",
    "edge-surface",
    "edge-effect",
    "background",
    "boundary",
]);

/**
 * What a shader takes from the layers beneath and from element state. `times` is the entered,
 * exited and changed times; `members` is a boundary's members.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderInput =
    "color" | "opacity" | "size" | "shape" | "width" | "selected" | "hovered" | "pinned" | "times" | "members";

/**
 * How a shader moves. One shape everywhere; the strings `"still"` and `"loop"` are shorthand.
 * @since 3.36.0
 */
export interface ShaderMotion {
    /** Animates while on screen; still while the named parameter is 0. */
    readonly loop?: { readonly speedParam?: string };
    /** Seconds of an entrance played when an element starts carrying the shader. */
    readonly enter?: number;
    /** Seconds the element keeps drawing it after it stops carrying it. */
    readonly exit?: number;
    /** Seconds played when the element's data changes (or it is added or removed). */
    readonly change?: number;
}

/** A {@link ShaderMotion}, or its shorthand: `"still"` is `{}`, `"loop"` is `{ loop: {} }`. @since 3.36.0 */
export type ShaderMotionInput = ShaderMotion | "still" | "loop";

/**
 * How much GPU work a shader costs per pixel, from the static checker's bound.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderCost = "light" | "medium" | "heavy";

/**
 * A capability a shader needs from the device.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderRequirement = "webgl2";

/**
 * A shader parameter: an ordinary option descriptor (the type every algorithm and layout uses, so
 * an option form draws it), with two shader facts. Its type is one of "number", "integer",
 * "boolean", "enum" and "color".
 * @since 3.36.0
 */
export type ShaderParamDescriptor = OptionDescriptor & {
    /** Can be bound per element with `encode` (at most 4 per shader). */
    readonly varies?: boolean;
    /** Advisory catalog data from the registrant: the parameter that most changes the look. */
    readonly primary?: boolean;
    /**
     * The named values of an "integer" parameter that picks one of a set (an icon, a pattern),
     * each with a picture of what it draws, so a form can offer a grid of pictures instead of a
     * number. The stored value stays the number, so `encode` with the `"index"` scale still
     * binds it. @since 3.36.0
     */
    readonly choices?: readonly ShaderParamChoice[];
};

/** One named value of an integer shader parameter, with a picture of what it draws. @since 3.36.0 */
export interface ShaderParamChoice {
    /** The parameter's value. */
    readonly value: number;
    /** Its default name, catalog data an application may show or replace by value. */
    readonly plainName: string;
    /** What it draws, as a picture a form can show at icon size. */
    readonly glyph: ShaderGlyph;
}

/**
 * A small picture: SVG path data in a 24 x 24 box (y down), filled with the even-odd rule, or,
 * with `outline`, stroked 2 units wide and not filled. @since 3.36.0
 */
export interface ShaderGlyph {
    readonly path: string;
    readonly outline?: boolean;
}

/** Where a shader in the catalog came from. @since 3.36.0 */
export type ShaderOrigin = "element" | "registered" | "pasted";

/** How a shader runs on the WebGPU renderer. @since 3.36.0 */
export type ShaderWebGpu = "translate" | "native" | "none";

/**
 * One shader the element can draw, as catalog data.
 * @since 3.36.0
 */
export interface ShaderDescriptor {
    /** The id: a preset's is bare (`"glass-marble"`), everyone else's is `"<namespace>/<name>"`. */
    readonly id: string;
    /** Catalog data: the default name. */
    readonly plainName: string;
    /** What it draws on. */
    readonly kind: ShaderKind;
    /** Its parameters, in declaration order. */
    readonly params: readonly ShaderParamDescriptor[];
    /** What it takes from the layers beneath and from element state. */
    readonly reads: readonly ShaderInput[];
    /** How it moves. */
    readonly motion: ShaderMotion;
    /** How much it costs. */
    readonly cost: ShaderCost;
    /** Where it came from. */
    readonly origin: ShaderOrigin;
    /** How it runs on the WebGPU renderer. */
    readonly webgpu: ShaderWebGpu;
    /** An image URL of a still picture; presets ship one. */
    readonly thumbnail?: string;
    /** What it needs from the device. */
    readonly requires?: readonly ShaderRequirement[];
    /** Whether it contributes to the shared bloom pass. */
    readonly bloom?: boolean;
    /** Effects: the drawn square is `reach` times the radius, 1 to 6. Absent means 1. */
    readonly reach?: number;
    /** Effects and boundaries: how the result combines. Absent means `"over"`. */
    readonly blend?: "over" | "add";
    /** Boundaries: a splatted field or one sphere per group. Absent means `"field"`. */
    readonly form?: "field" | "sphere";
    /**
     * Boundaries of form `"field"`: the number parameter whose value is each member's kernel
     * radius, in member radii, in place of `reach`, so a reader can grow or shrink the blobs.
     * @since 3.36.0
     */
    readonly reachParam?: string;
    /** Pasted shaders: the SHA-256 of the text. */
    readonly hash?: string;
}

/** One shader's fixed parameter values, keyed by the parameter ids its catalog entry declares. @since 3.36.0 */
export type ShaderParams = Readonly<Record<string, number | string | boolean>>;

/** Parameter values per shader id: only the drawn shader's set applies. @since 3.36.0 */
export type ShaderParamSets = Readonly<Record<string, ShaderParams>>;

/**
 * Effects by id: `true` turns one on with its defaults, `false` switches off one a layer beneath
 * adds, an object turns it on with those parameters. The reserved key `visible: false` keeps the
 * entry and its parameters but draws nothing (an editor's eye).
 * @since 3.36.0
 */
export type ShaderEffects = Readonly<Record<string, ShaderParams | boolean>>;

/**
 * A layer's boundary: one shape around the layer's matched nodes, or one per distinct value of
 * `groupBy`.
 * @since 3.36.0
 */
export interface LayerBoundary {
    /** A boundary shader id. */
    readonly shader: string;
    /** Its parameters. */
    readonly params?: ShaderParams;
    /** A data path; one boundary per distinct value. Absent: one boundary around every node. */
    readonly groupBy?: string;
}

/**
 * A problem with shader text or a shader's use, as a code the application words.
 *
 * OPEN UNION: members may be added in a minor release; word an unknown one generically.
 * @since 3.36.0
 */
export type ShaderProblemCode =
    | "shader.header-missing"
    | "shader.header-json"
    | "shader.header-key"
    | "shader.kind-unknown"
    | "shader.id-invalid"
    | "shader.id-taken"
    | "shader.param-invalid"
    | "shader.too-many-params"
    | "shader.too-large"
    | "shader.too-many"
    | "shader.not-ascii"
    | "shader.preprocessor"
    | "shader.reserved"
    | "shader.loop-unbounded"
    | "shader.loop-too-long"
    | "shader.too-costly"
    | "shader.too-deep"
    | "shader.texture-unsupported"
    | "shader.entry-missing"
    | "shader.entry-signature"
    | "shader.compile"
    | "shader.over-budget"
    | "shader.webgpu-unsupported"
    | "shader.unknown"
    | "shader.kind-mismatch"
    | "shader.held"
    | "shader.quarantined"
    | "shader.flashing"
    | "shader.guard-off"
    | "shader.still"
    | "shader.program-cap"
    | "shader.param-unused"
    | "shader.effect-cap"
    | "shader.boundary-cap"
    | "shader.apply-target"
    | "shader.no-data";

/** One shader problem: a code and its values. @since 3.36.0 */
export interface ShaderProblem {
    /** What is wrong. */
    readonly code: ShaderProblemCode;
    /** Its values: `line` and `column` (1-based, in the whole text) where the problem has a place. */
    readonly params: Readonly<Record<string, string | number>>;
}

/**
 * A shader as `registerShader` takes it: its catalog facts and its GLSL body.
 * @since 3.36.0
 */
export interface ShaderRegistration {
    /** The catalog facts. The element fills in what is left out. */
    readonly descriptor: Omit<ShaderDescriptor, "origin" | "cost" | "reads" | "webgpu" | "motion" | "hash"> & {
        /** Default: the static checker's class. */
        readonly cost?: ShaderCost;
        /** Default: inferred from the body. */
        readonly reads?: readonly ShaderInput[];
        /** Default `"translate"`. */
        readonly webgpu?: ShaderWebGpu;
        /** Default `"still"`. */
        readonly motion?: ShaderMotionInput;
    };
    /** The GLSL body: `shade` and its helpers. */
    readonly glsl: string;
    /** An optional native WebGPU body (`webgpu: "native"`). */
    readonly wgsl?: string;
    /**
     * An optional cheaper GLSL body with the same entry and parameters, for a heavy surface: the
     * element draws it for a whole batch while the median node on screen is under 12 px, chosen
     * each time the camera comes to rest. Checked as `glsl` is.
     */
    readonly lowDetail?: string;
}

/**
 * Shader text: GLSL with a `graphty-shader 1` JSON header in its first comment, the one form a
 * shader is pasted, copied and saved in. Code, not words for a reader.
 * @since 3.36.0
 */
export type ShaderText = string;

/** What `parseShaderText` answers. @since 3.36.0 */
export type ShaderTextResult =
    | { readonly ok: true; readonly registration: ShaderRegistration }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };

/** The channels the shape rows draw, which a sprite draws instead. */
const SPRITE_COVERS: readonly Channel[] = [
    "node.shape",
    "node.width",
    "node.height",
    "node.depth",
    "node.planar",
    "node.borderColor",
    "node.borderWidth",
    "node.borderStyle",
    "node.cornerRadius",
    "node.marker",
    "node.flat",
    "node.unlit",
    "node.wireframe",
];

/**
 * The channels a shader of each kind covers: what is no longer drawn on an element the shader is
 * drawn on, whichever layer wrote it. On top of these, a surface or sprite whose `reads` lacks
 * `"color"` also covers `node.color` (an edge surface, `edge.color`), and one whose `reads` lacks
 * `"opacity"` covers `node.opacity` (`edge.opacity`): see {@link shaderCovers}.
 * @since 3.36.0
 */
export const SHADER_KIND_COVERS: Readonly<Record<ShaderKind, readonly Channel[]>> = Object.freeze({
    "node-surface": Object.freeze<Channel[]>(["node.flat", "node.unlit", "node.wireframe"]),
    "node-sprite": Object.freeze([...SPRITE_COVERS]),
    "node-effect": Object.freeze<Channel[]>([]),
    "edge-surface": Object.freeze<Channel[]>(["edge.style", "edge.patternCount"]),
    "edge-effect": Object.freeze<Channel[]>([]),
    background: Object.freeze<Channel[]>([]),
    boundary: Object.freeze<Channel[]>([]),
});

/**
 * Every channel one shader covers on an element it is drawn on: its kind's set, plus the color and
 * opacity of the element when it does not read them.
 * @param descriptor - The shader.
 * @returns The covered channels.
 * @since 3.36.0
 */
export function shaderCovers(descriptor: Pick<ShaderDescriptor, "kind" | "reads">): readonly Channel[] {
    const own = SHADER_KIND_COVERS[descriptor.kind] as readonly Channel[] | undefined;
    const covered = [...(own ?? [])];
    const prefix = descriptor.kind === "edge-surface" ? "edge" : "node";
    if (descriptor.kind === "node-surface" || descriptor.kind === "node-sprite" || descriptor.kind === "edge-surface") {
        if (!descriptor.reads.includes("color")) {
            covered.push(`${prefix}.color`);
        }

        if (!descriptor.reads.includes("opacity")) {
            covered.push(`${prefix}.opacity`);
        }
    }

    return covered;
}

/** A shader id: a preset's bare name, or `<namespace>/<name>`; lowercase letters, digits, hyphens. */
const SHADER_ID = /^[a-z\d]+(?:-[a-z\d]+)*(?:\/[a-z\d]+(?:-[a-z\d]+)*)?$/;

/** The longest shader id. */
export const SHADER_ID_MAX = 40;

/**
 * Whether a string is a well-formed shader id.
 * @param id - The candidate.
 * @param namespaced - Whether it must carry a namespace (everyone but the element's presets).
 * @returns True when it is one.
 */
export function isShaderId(id: unknown, namespaced = false): id is string {
    return (
        typeof id === "string" && id.length <= SHADER_ID_MAX && SHADER_ID.test(id) && (!namespaced || id.includes("/"))
    );
}

/**
 * Whether a string can name a parameter: a GLSL identifier with no `__`, not `visible` (the
 * effects map's eye) and not starting `gl_` or `graphty_`.
 * @param name - The candidate.
 * @returns True when it can.
 */
export function isShaderParamName(name: unknown): name is string {
    return (
        typeof name === "string" &&
        /^[A-Za-z_]\w*$/.test(name) &&
        name.length <= 40 &&
        !name.includes("__") &&
        name !== "visible" &&
        !name.startsWith("gl_") &&
        !name.startsWith("graphty_")
    );
}

/**
 * Normalize a motion shorthand.
 * @param motion - The motion, or its shorthand, or nothing.
 * @returns The motion object.
 */
export function motionOf(motion: ShaderMotionInput | undefined): ShaderMotion {
    if (motion === undefined || motion === "still") {
        return {};
    }

    return motion === "loop" ? { loop: {} } : motion;
}

/**
 * @file Shaders as catalog data: targets and roles, the descriptor a catalog lists, the parameter
 * maps a style layer writes, and the channels a shader covers.
 *
 * A shader is a small GPU program that decides the color of each pixel of something drawn. Here it
 * is only data: an id, a target and a role, the parameters it declares and the facts the element and an editor
 * read. The GLSL text is checked in `./shaderText` and kept by `./shaderRegistry`; drawing it is
 * the renderer's (design/rendering/shader-styles.md).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Channel, OptionDescriptor } from "./types";

/**
 * What a shader draws on: a node, an edge, a group of nodes, or the canvas behind the graph. Shader
 * text never names it: it is read from the entry function's input, `shade(NodeInput n)`,
 * `shade(EdgeInput e)`, `shade(GroupInput g)` or `shade(BackgroundInput b)`.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderTarget = "node" | "edge" | "group" | "background";

/**
 * Whether a shader replaces how its target is painted (`"look"`: one per node or edge, the topmost
 * layer's wins) or is drawn on or around it (`"effect"`: effects stack). Groups and the background
 * take looks only.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderRole = "look" | "effect";

/**
 * Where a shader is added: what it draws on and its role. Supplies the role of shader text that
 * does not declare one (`parseShaderText(text, { place })`).
 * @since 3.36.0
 */
export interface ShaderPlace {
    /** What it draws on. */
    readonly target: ShaderTarget;
    /** Its role there. */
    readonly role: ShaderRole;
}

/**
 * How a node look is drawn: on the node's own shape (`"shape"`, the default), or as a flat card
 * facing the camera in place of the shape (`"card"`), which covers every shape channel.
 * @since 3.36.0
 */
export type ShaderGeometry = "shape" | "card";

/**
 * The frame a shader's thumbnail is drawn from: its parameters and the time, in seconds.
 * @since 3.36.0
 */
export interface ShaderPreview {
    /** Parameter values, over the defaults. */
    readonly params?: ShaderParams;
    /** The time of the frame, in seconds. */
    readonly time?: number;
}

/**
 * The seven drawings the renderer tells apart: a target, a role and, for a node look, its
 * geometry. Internal; nothing public names it.
 */
export type ShaderDrawing =
    "node-look" | "node-card" | "node-effect" | "edge-look" | "edge-effect" | "background" | "group";

/**
 * The drawing a shader asks the renderer for.
 * @param descriptor - Its target, role and geometry.
 * @returns The drawing.
 */
export function drawingOf(descriptor: Pick<ShaderDescriptor, "target" | "role" | "geometry">): ShaderDrawing {
    const { target, role } = descriptor;
    if (target === "group" || target === "background") {
        return target;
    }

    if (role === "effect") {
        return `${target}-effect`;
    }

    return target === "node" && descriptor.geometry === "card" ? "node-card" : `${target}-look`;
}

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
    /** What it draws on, read from the entry function's input. */
    readonly target: ShaderTarget;
    /** Whether it replaces how its target is painted or is drawn on or around it. */
    readonly role: ShaderRole;
    /** Node looks: on the node's shape (absent means `"shape"`), or a card in its place. */
    readonly geometry?: ShaderGeometry;
    /**
     * Effects: the smallest on-screen radius, in CSS pixels, the effect is drawn at, so its detail
     * survives a far camera. Absent means it scales with the node.
     */
    readonly minPixels?: number;
    /** Catalog data: where a gallery may file it, such as `"Glass"`. An application orders them. */
    readonly categories?: readonly string[];
    /** The frame its thumbnail is drawn from. */
    readonly preview?: ShaderPreview;
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
    /** An image URL of a still picture; presets supply one, and any registrant may. */
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

/**
 * The parameter values a layer writes to `node.shaderParams` or `edge.shaderParams`: plain
 * `{ name: value }` entries for whichever shader is drawn (`{ hot: "#ff0000" }`), or a set per
 * shader id (`{ "acme/heat": { hot: "#ff0000" } }`), of which only the drawn shader's applies. A
 * higher layer wins per parameter; values the layer leaves out keep the defaults.
 * @since 3.36.0
 */
export type ShaderParamSets = Readonly<Record<string, ShaderParams | number | string | boolean>>;

/**
 * The parameter values for the drawn shader from a merged `shaderParams` map: its plain
 * `{ name: value }` entries, then the drawn shader's own set over them.
 * @param sets - The merged map.
 * @param id - The drawn shader.
 * @returns Its values, or undefined when the map holds none for it.
 */
export function drawnShaderParams(sets: ShaderParamSets | undefined, id: string): ShaderParams | undefined {
    if (sets === undefined) {
        return undefined;
    }

    const plain = Object.entries(sets).filter(([, value]) => typeof value !== "object");
    const ownEntry = sets[id];
    const own = typeof ownEntry === "object" ? ownEntry : undefined;
    if (plain.length === 0) {
        return own;
    }

    return { ...(Object.fromEntries(plain) as ShaderParams), ...own };
}

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
    | "shader.target-mismatch"
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
    | "shader.no-data"
    | "shader.no-canvas";

/** One shader problem: a code and its values. @since 3.36.0 */
export interface ShaderProblem {
    /** What is wrong. */
    readonly code: ShaderProblemCode;
    /** Its values: `line` and `column` (1-based, in the whole text) where the problem has a place. */
    readonly params: Readonly<Record<string, string | number>>;
}

/**
 * A shader body: its GLSL text, or a function that loads it the first time something draws it.
 * @since 3.36.0
 */
export type ShaderSource = string | (() => Promise<string>);

/**
 * A shader as `registerShader` takes it: its catalog facts and its GLSL body.
 * @since 3.36.0
 */
export interface ShaderRegistration {
    /** The catalog facts. The element fills in what is left out. */
    readonly descriptor: Omit<
        ShaderDescriptor,
        "origin" | "cost" | "reads" | "webgpu" | "motion" | "hash" | "target" | "role"
    > & {
        /**
         * What it draws on. Default: read from the body's entry function; required when `glsl` is
         * a loader, whose body is not read until something draws it.
         */
        readonly target?: ShaderTarget;
        /** Default: `"effect"` when `reach` is given (nodes and edges), else `"look"`. */
        readonly role?: ShaderRole;
        /** Default: the static checker's class (`"heavy"` until a loader's body is read). */
        readonly cost?: ShaderCost;
        /** Default: inferred from the body. */
        readonly reads?: readonly ShaderInput[];
        /** Default `"translate"`. */
        readonly webgpu?: ShaderWebGpu;
        /** Default: `"loop"` when the body reads its input's `time` field, else `"still"`. */
        readonly motion?: ShaderMotionInput;
    };
    /** The GLSL body, `shade` and its helpers, or a function that loads it. */
    readonly glsl: ShaderSource;
    /** An optional native WebGPU body (`webgpu: "native"`). */
    readonly wgsl?: string;
    /**
     * An optional cheaper GLSL body with the same entry and parameters, for a heavy look: the
     * element draws it for a whole batch while the median node on screen is under 12 px, chosen
     * each time the camera comes to rest. Checked as `glsl` is. In shader text it is the entry
     * `vec4 shadeFar(...)`.
     */
    readonly lowDetail?: ShaderSource;
}

/**
 * Shader text: GLSL with a `graphty-shader 1` JSON header in its first comment, the one form a
 * shader is pasted, copied and saved in. Code, not words for a reader.
 * @since 3.36.0
 */
export type ShaderText = string; // NOSONAR(S6564): a published, documented name for the pasted text form

/** What `parseShaderText` answers. @since 3.36.0 */
export type ShaderTextResult =
    | {
          readonly ok: true;
          readonly registration: ShaderRegistration & {
              readonly descriptor: ShaderRegistration["descriptor"] & {
                  readonly target: ShaderTarget;
                  readonly role: ShaderRole;
              };
              readonly glsl: string;
              readonly lowDetail?: string;
          };
      }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };

/** The channels the shape rows draw, which a card draws instead. */
const CARD_COVERS: readonly Channel[] = [
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
    "node.meshDetail",
];

/**
 * Every channel one shader covers on an element it is drawn on: what is no longer drawn there,
 * whichever layer beneath wrote it.
 *
 * - A card covers every shape channel.
 * - A node look covers flat, unlit and wireframe.
 * - An edge look covers `edge.style` and `edge.patternCount`.
 * - A look that does not read `"color"` also covers the color, and one that does not read
 *   `"opacity"` the opacity.
 * - Effects, group and background shaders cover nothing.
 *
 * A card and a shape follow "the topmost layer wins": a `node.shape` on a layer above the card's
 * draws the shape on those nodes, and the card is not drawn there.
 * @param descriptor - The shader.
 * @returns The covered channels.
 * @since 3.36.0
 */
export function shaderCovers(
    descriptor: Pick<ShaderDescriptor, "target" | "role" | "geometry" | "reads">,
): readonly Channel[] {
    const drawing = drawingOf(descriptor);
    let covered: Channel[];
    switch (drawing) {
        case "node-card":
            covered = [...CARD_COVERS];
            break;
        case "node-look":
            covered = ["node.flat", "node.unlit", "node.wireframe"];
            break;
        case "edge-look":
            covered = ["edge.style", "edge.patternCount"];
            break;
        default:
            return [];
    }

    const prefix = descriptor.target;
    if (!descriptor.reads.includes("color")) {
        covered.push(`${prefix}.color` as Channel);
    }

    if (!descriptor.reads.includes("opacity")) {
        covered.push(`${prefix}.opacity` as Channel);
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

/**
 * @file Shaders as catalog data: targets and places, the descriptor a catalog lists, the parameter
 * maps a style layer writes, and the channels a shader covers.
 *
 * A shader is a small GPU program that decides the color of each pixel of something drawn. Here it
 * is only data: an id, a target and a place, the parameters it declares and the facts the element and an editor
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
 * Where a use of a shader draws, as a fact about the use, not a kind of shader:
 *
 * - `"paint"`: the node's or edge's own surface; one per element, the topmost layer's wins.
 * - `"replace"`: a node's shape is not drawn, the shader draws in its place; one per node.
 * - `"over"`: over the node's paint, inside its outline; they stack.
 * - `"around"`: outside the node's outline, reaching past it; they stack.
 * - `"behind"`: before the node, which covers its middle; they stack.
 * - `"along"`: a strip that follows an edge over the line; they stack.
 * - `"group"`: one outline around the nodes that carry the use; they stack.
 *
 * `replace`, `over`, `around` and `behind` are one drawing (a square that faces the camera), so a
 * shader written for one may be moved among all four unless it narrows `places`. `paint`, `along`
 * and `group` are separate drawings, so a shader written for one stays there. The background has
 * no place.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderPlace = "paint" | "replace" | "over" | "around" | "behind" | "along" | "group";

/** The places drawn as a square facing the camera, among which a shader may be moved. */
export const SQUARE_PLACES: readonly ShaderPlace[] = Object.freeze(["replace", "over", "around", "behind"]);

/** The places `minSize` applies at: the square-drawn places that reach outside the node. */
const MIN_SIZE_PLACES: ReadonlySet<ShaderPlace> = new Set<ShaderPlace>(["replace", "around", "behind"]);

/** The places each target's shaders may be used at. */
export const PLACES_BY_TARGET: Readonly<Record<ShaderTarget, readonly ShaderPlace[]>> = Object.freeze({
    node: Object.freeze<ShaderPlace[]>(["paint", ...SQUARE_PLACES]),
    edge: Object.freeze<ShaderPlace[]>(["paint", "along"]),
    group: Object.freeze<ShaderPlace[]>(["group"]),
    background: Object.freeze<ShaderPlace[]>([]),
});

/**
 * The places a shader may be used at when it declares none: all four square-drawn places for a
 * shader whose place is one of them, else its own place alone.
 * @param place - Its default place.
 * @returns The places.
 */
export function defaultPlaces(place: ShaderPlace): readonly ShaderPlace[] {
    return SQUARE_PLACES.includes(place) ? SQUARE_PLACES : [place];
}

/**
 * Whether `minSize` can apply at any of these places.
 * @param places - The places a shader allows.
 * @returns True when one of them draws a square reaching outside the node.
 */
export function minSizeApplies(places: readonly ShaderPlace[]): boolean {
    return places.some((place) => MIN_SIZE_PLACES.has(place));
}

/**
 * The problem with using a shader at a place, or null when the shader allows it.
 * @param descriptor - The shader: its id, target and the places it allows.
 * @param place - Where the use draws; absent means the shader's own place.
 * @returns `shader.place-unsupported` `{ shader, place, allowed }`, or null.
 * @since 3.36.0
 */
export function shaderPlaceProblem(
    descriptor: Pick<ShaderDescriptor, "id" | "target" | "place" | "places">,
    place: ShaderPlace | undefined,
): ShaderProblem | null {
    const own = descriptor.place;
    const allowed = descriptor.places ?? (own === undefined ? [] : defaultPlaces(own));
    const wanted = place ?? own;
    if (wanted !== undefined && allowed.includes(wanted)) {
        return null;
    }

    return {
        code: "shader.place-unsupported",
        params: { shader: descriptor.id, place: wanted ?? "", allowed },
    };
}

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
 * The drawings the renderer tells apart, keyed by target and place: a node's surface, a node's
 * square in place of its shape (`replace`), a node's square over, around or behind it, an edge's
 * surface, a strip along an edge, a group outline and the background. Internal; nothing public
 * names it.
 */
export type ShaderDrawing =
    "node-paint" | "node-replace" | "node-square" | "edge-paint" | "edge-along" | "background" | "group";

/**
 * The drawing a shader asks the renderer for at a place.
 * @param descriptor - Its target and its default place.
 * @param place - The place of the use; absent means the shader's own.
 * @returns The drawing.
 */
export function drawingOf(
    descriptor: Pick<ShaderDescriptor, "target" | "place">,
    place = descriptor.place,
): ShaderDrawing {
    const { target } = descriptor;
    if (target === "group" || target === "background") {
        return target;
    }

    if (target === "edge") {
        return place === "along" ? "edge-along" : "edge-paint";
    }

    if (place === "replace") {
        return "node-replace";
    }

    return place === "over" || place === "around" || place === "behind" ? "node-square" : "node-paint";
}

/**
 * Whether a place draws one use per element, the topmost winning, and covering the other (`paint`
 * and `replace`), rather than stacking.
 * @param place - The place.
 * @returns True for `paint` and `replace`.
 */
export function isExclusivePlace(place: ShaderPlace | undefined): boolean {
    return place === "paint" || place === "replace";
}

/**
 * What a shader takes from the layers beneath, from element state and from the scene. `times` is
 * the clocks (`sinceMatched`, `sinceChanged` and the rest); `members` is a group's members;
 * `light` is the scene's light (`lightDir`), so a gallery can say it reacts to the light.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderInput =
    | "color"
    | "opacity"
    | "size"
    | "shape"
    | "width"
    | "selected"
    | "hovered"
    | "pinned"
    | "times"
    | "members"
    | "light";

/**
 * Whether a shader animates on its own. One shape everywhere; the strings `"still"` and `"loop"`
 * are shorthand. A shader loops when its body reads its input's `time` field; this is a declared
 * override of that, a fact the element uses for reduced motion and quality, never a trigger. When
 * a shader draws is its layer's condition, and how it plays in or out is a parameter bound to a
 * clock ({@link ShaderClockBinding}).
 * @since 3.36.0
 */
export interface ShaderMotion {
    /** Animates while on screen; still while the named parameter is 0. */
    readonly loop?: { readonly speedParam?: string };
}

/** How long a shader plays on each moment of an element, in seconds. Internal. */
export interface ShaderTiming {
    readonly enter?: number;
    readonly exit?: number;
    readonly change?: number;
}

/**
 * How long a shader plays when an element starts carrying it, stops carrying it, and changes: the
 * end of the domain of its parameters bound to `since.matched` (or `since.added`),
 * `since.unmatched` and `since.changed`. Internal: the renderer's timed plays read it.
 * @param descriptor - The shader's parameters, if it is known.
 * @returns The seconds, each absent when no parameter is bound to that clock.
 */
export function timingOf(descriptor: Pick<ShaderDescriptor, "params"> | undefined): ShaderTiming {
    const end = (clocks: readonly ShaderClock[]): number | undefined => {
        const ends = (descriptor?.params ?? []).flatMap((param) =>
            isClockBinding(param.default) && clocks.includes(param.default.by) ? [param.default.domain[1]] : [],
        );
        return ends.length === 0 ? undefined : Math.max(...ends);
    };
    const enter = end(["since.matched", "since.added"]);
    const exit = end(["since.unmatched"]);
    const change = end(["since.changed"]);

    return {
        ...(enter === undefined ? {} : { enter }),
        ...(exit === undefined ? {} : { exit }),
        ...(change === undefined ? {} : { change }),
    };
}

/**
 * Whether a shader animates while it draws: it loops (it reads its input's `time` field, or
 * declares a loop), it reads a clock field straight in its body (`n.sinceMatched`, which the
 * element cannot know the end of), or a parameter's default is bound to a clock. The same fact
 * decides whether reduced motion holds it still, so a gallery that shows "animates" and the
 * element agree.
 * @param descriptor - The shader's catalog facts.
 * @returns True when it animates.
 * @since 3.36.0
 */
export function shaderAnimates(descriptor: Pick<ShaderDescriptor, "motion" | "reads" | "params">): boolean {
    return (
        descriptor.motion.loop !== undefined ||
        descriptor.reads.includes("times") ||
        descriptor.params.some((param) => isClockBinding(param.default))
    );
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
 * A clock: the seconds since a moment of an element, as the `since.*` paths spell it. A moment that
 * never happened reads as -1. In a body the same clock is the input's field `sinceX` for `since.x`.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderClock =
    | "since.selected"
    | "since.deselected"
    | "since.hovered"
    | "since.unhovered"
    | "since.pinned"
    | "since.unpinned"
    | "since.added"
    | "since.changed"
    | "since.matched"
    | "since.unmatched";

/** Every clock a parameter may be bound to. */
export const SHADER_CLOCKS: readonly ShaderClock[] = Object.freeze([
    "since.selected",
    "since.deselected",
    "since.hovered",
    "since.unhovered",
    "since.pinned",
    "since.unpinned",
    "since.added",
    "since.changed",
    "since.matched",
    "since.unmatched",
]);

/**
 * A number or color parameter bound to a clock, as its default: the seconds `by` reads, mapped
 * linearly from `domain` onto `range` and clamped. `range` defaults to `[0, 1]` for a number; a
 * color gives two `#rrggbb` colors. The element stops drawing frames for an element once its clock
 * has left the domain.
 *
 * ```ts
 * fade: { by: "since.matched", domain: [0, 0.3] }
 * ```
 * @since 3.36.0
 */
export interface ShaderClockBinding {
    /** The clock. */
    readonly by: ShaderClock;
    /** The seconds that map onto the range, first below the second. */
    readonly domain: readonly [number, number];
    /** What they map onto. Default `[0, 1]`; a color parameter gives two colors. */
    readonly range?: readonly [number, number] | readonly [string, string];
}

/**
 * Whether a value is a clock binding.
 * @param value - Anything.
 * @returns True for an object with a `by`.
 */
export function isClockBinding(value: unknown): value is ShaderClockBinding {
    return typeof value === "object" && value !== null && !Array.isArray(value) && "by" in value;
}

/**
 * A shader parameter: an ordinary option descriptor (the type every algorithm and layout uses, so
 * an option form draws it), with two shader facts. Its type is one of "number", "integer",
 * "boolean", "enum" and "color". A number or color parameter's `default` may be a
 * {@link ShaderClockBinding}; there is no clock parameter type.
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
    /**
     * Where a use draws when it names no place. Default `"paint"` on a node or edge, `"group"` for
     * a group outline; the background has none.
     */
    readonly place?: ShaderPlace;
    /**
     * Where a use may draw. Default: all four square-drawn places (`replace`, `over`, `around`,
     * `behind`) for a shader whose place is one of them, else its place alone. `place` is among
     * them. The catalog always lists it, except for the background.
     */
    readonly places?: readonly ShaderPlace[];
    /**
     * The smallest size, in CSS pixels, the square of `replace`, `around` and `behind` is drawn
     * at. Declaring it adds a number parameter `minSize` with this default, which a use can change,
     * set to 0 (off) or bind. Absent: it scales with the node.
     */
    readonly minSize?: number;
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
    /** Square-drawn places and `along`: the drawn size is `reach` times the radius, 1 to 6. Absent means 1. */
    readonly reach?: number;
    /** Stacking places and group outlines: how the result combines. Absent means `"over"`. */
    readonly blend?: "over" | "add";
    /** Group outlines: a splatted field or one sphere per group. Absent means `"field"`. */
    readonly form?: "field" | "sphere";
    /**
     * Group outlines of form `"field"`: the number parameter whose value is each member's kernel
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
 * A parameter value a use sets: a number, a color or a word, a switch, or a number or color bound
 * to a clock ({@link ShaderClockBinding}).
 * @since 3.36.0
 */
export type ShaderParamValue = number | string | boolean | ShaderClockBinding;

/**
 * A use's fixed parameter values: its parameters without the ones bound to a clock.
 * @param params - The use's parameters.
 * @returns The fixed values, or undefined when it sets none.
 */
export function fixedParamsOf(params: ShaderUse["params"]): ShaderParams | undefined {
    if (params === undefined) {
        return undefined;
    }

    const fixed = Object.entries(params).filter(([, value]) => !isClockBinding(value));
    return fixed.length === Object.keys(params).length
        ? (params as ShaderParams)
        : (Object.fromEntries(fixed) as ShaderParams);
}

/**
 * One use of a shader on a style layer's `node.shaders` or `edge.shaders` list: which shader,
 * where it draws, and with what parameters.
 *
 * Across layers (bottom to top, then list order within a layer): at `paint` and `replace` the last
 * use wins and covers the other place's; every other place stacks. `{ shader, off: true }` removes
 * every use of that shader the layers beneath put on the elements this layer matches.
 *
 * ```ts
 * set: { "node.shaders": [{ shader: "lock-on-reticle", params: { hudColor: "#00ff88" } }] }
 * ```
 * @since 3.36.0
 */
export interface ShaderUse {
    /** The shader's id. */
    readonly shader: string;
    /** Where it draws. Default: the shader's own place. */
    readonly place?: ShaderPlace;
    /** Parameter values over its defaults, `minSize` and clock bindings included. */
    readonly params?: Readonly<Record<string, ShaderParamValue>>;
    /**
     * At `group` only: a data path; one outline per distinct value among the nodes carrying the
     * use. Absent: one outline around all of them.
     */
    readonly groupBy?: string;
    /** Remove this shader, wherever the layers beneath put it, from the elements this layer matches. */
    readonly off?: true;
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
    | "shader.place-unsupported"
    | "shader.min-size-place"
    | "shader.held"
    | "shader.quarantined"
    | "shader.flashing"
    | "shader.guard-off"
    | "shader.still"
    | "shader.program-cap"
    | "shader.param-unused"
    | "shader.stack-cap"
    | "shader.group-cap"
    | "shader.apply-target"
    | "shader.no-data"
    | "shader.no-canvas";

/** One shader problem: a code and its values. @since 3.36.0 */
export interface ShaderProblem {
    /** What is wrong. */
    readonly code: ShaderProblemCode;
    /**
     * Its values: `line` and `column` (1-based, in the whole text) where the problem has a place; a
     * list (the `allowed` places) where it names several.
     */
    readonly params: Readonly<Record<string, string | number | readonly string[]>>;
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
        "origin" | "cost" | "reads" | "webgpu" | "motion" | "hash" | "target"
    > & {
        /**
         * What it draws on. Default: read from the body's entry function; required when `glsl` is
         * a loader, whose body is not read until something draws it.
         */
        readonly target?: ShaderTarget;
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
     * An optional cheaper GLSL body with the same entry and parameters, for a heavy paint: the
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
              readonly descriptor: ShaderRegistration["descriptor"] & { readonly target: ShaderTarget };
              readonly glsl: string;
              readonly lowDetail?: string;
          };
      }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };

/** The channels the shape rows draw, which a `replace` shader draws instead. */
const CARD_COVERS: readonly Channel[] = [
    "node.shape",
    "node.width",
    "node.height",
    "node.depth",
    "node.relativeExtents",
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
 * Every channel one shader covers on an element it is drawn on at a place (its own by default):
 * what is no longer drawn there, whichever layer beneath wrote it.
 *
 * - `replace` covers every shape channel.
 * - A node's `paint` covers flat, unlit and wireframe.
 * - An edge's `paint` covers `edge.style` and `edge.patternCount`.
 * - `paint` and `replace` that do not read `"color"` also cover the color, and ones that do not
 *   read `"opacity"` the opacity.
 * - Every other place, group and background shaders cover nothing.
 *
 * `replace` and a shape follow "the topmost layer wins": a `node.shape` on a layer above the
 * shader's draws the shape on those nodes, and the shader is not drawn there.
 * @param descriptor - The shader.
 * @param place - Where the use draws; absent means the shader's own place.
 * @returns The covered channels.
 * @since 3.36.0
 */
export function shaderCovers(
    descriptor: Pick<ShaderDescriptor, "target" | "place" | "reads">,
    place: ShaderPlace | undefined = descriptor.place,
): readonly Channel[] {
    const drawing = drawingOf(descriptor, place);
    let covered: Channel[];
    switch (drawing) {
        case "node-replace":
            covered = [...CARD_COVERS];
            break;
        case "node-paint":
            covered = ["node.flat", "node.unlit", "node.wireframe"];
            break;
        case "edge-paint":
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
 * Whether a string can name a parameter: a GLSL identifier with no `__`, not `visible` (reserved)
 * and not starting `gl_` or `graphty_`.
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

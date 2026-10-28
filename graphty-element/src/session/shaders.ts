/**
 * @file `session.shaders`: the shaders that belong to the open project -- pasted by the reader,
 * or carried in by a file, an AI command or a URL -- and whether each may run
 * (design/rendering/shader-styles.md sections 3.5 and 4.6).
 *
 * The project holds a shader's text in its `shaders` slice; everything else here is the
 * session's and is never saved: which texts are approved to run, which the GPU lost its context
 * under, and what compiling each one found. Whether a shader may run is decided by its text's
 * SHA-256, so two copies of one text share one decision and an edited text asks again.
 *
 * Compiling and the test frame need the element's own engine. A session with no canvas stops
 * after the static checks, and its shaders are `"not-checked"`; the element attaches a
 * {@link ShaderHost} that loads the shader runtime the first time something asks it to compile.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import {
    addPastedShaderSource,
    describePastedShader,
    isRegisteredShader,
    loadShaderSource,
    shaderDescriptor,
    shaderDescriptors,
    shaderLoadProblem,
    shaderSourceNow,
} from "../catalog/shaderRegistry";
import {
    shaderAnimates,
    type ShaderDescriptor,
    type ShaderParams,
    type ShaderPlace,
    type ShaderProblem,
    type ShaderRegistration,
    type ShaderTarget,
    type ShaderText,
    type ShaderUse,
} from "../catalog/shaders";
import { formatShaderText, parseShaderText, SHADER_TEXT_MAGIC, type ShaderTextOptions } from "../catalog/shaderText";
import type { LayerId, LayerSpec } from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import { sha256Hex } from "../utils/sha256";
import type { Dispatcher } from "./project/Dispatcher";
import type { ProjectState } from "./project/state";
import { placeOfUse } from "./styles/channels";
import { type SessionStylesApi, setShaderTrust } from "./styles/StylesApi";
import type { SessionEventMap } from "./types";

/** The most shaders one project holds. */
export const PROJECT_SHADER_LIMIT = 64;

/** The side of a drawn thumbnail, in pixels. */
export const SHADER_THUMBNAIL_SIZE = 128;

/** The time a thumbnail is drawn at when the shader's preview names none, in seconds. */
const THUMBNAIL_TIME = 0.8;

/**
 * What a shader of the project is doing now.
 *
 * - `ready`: checked and compiled; it draws.
 * - `compiling`: being compiled and tested; the layers beneath draw until it is ready.
 * - `failed`: it did not compile or failed its test frame on this device.
 * - `held`: it came from someone else and waits for `approve`.
 * - `off`: it was turned off (its text was drawing when the GPU was lost).
 * - `still`: drawn, without motion.
 * - `not-checked`: no canvas is attached, so only the static checks ran.
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type ShaderState = "ready" | "compiling" | "failed" | "held" | "off" | "still" | "not-checked";

/** Whether a shader draws now, and if not, why. @since 3.36.0 */
export interface ShaderStatus {
    /** What it is doing. */
    readonly state: ShaderState;
    /** Why it is failed, held, off or still, or what it draws without (`shader.no-data`). */
    readonly problem?: ShaderProblem;
}

/** One shader of the open project. @since 3.36.0 */
export interface ProjectShader {
    /** Its namespaced id. */
    readonly id: string;
    /** Catalog data: its name. */
    readonly plainName: string;
    /** What it draws on. */
    readonly target: ShaderTarget;
    /** Where a use draws when it names none; absent for the background. */
    readonly place?: ShaderPlace;
    /** The SHA-256 of its text, as 64 hex digits. */
    readonly hash: string;
    /** What it is doing. */
    readonly state: ShaderState;
    /** How many style layers name it. */
    readonly usedBy: number;
}

/** How `session.shaders.add` takes text. @since 3.36.0 */
export interface ShaderAddOptions {
    /**
     * Who supplied the text. `"reader"` (the default) runs once it passes the checks, and its
     * hash is approved; `"content"` (a file, an AI command, a URL) is held until `approve` unless
     * the element's trust settings say otherwise.
     */
    readonly source?: "reader" | "content";
    /**
     * What the shader is being added for: text whose entry function draws on another target is
     * refused with `shader.target-mismatch`.
     */
    readonly target?: ShaderTarget;
    /** The place text that names none takes, when its target allows it. */
    readonly place?: ShaderPlace;
    /** When the header's id is taken: refuse (the default) or add under the next free id. */
    readonly onTaken?: "refuse" | "rename";
    /**
     * Also write the shader to this layer, as a use at its own place added to the end of the
     * layer's shader list, in the same undoable step. A layer that paints the other target (a node
     * shader on an edge layer) is refused with `shader.apply-target`.
     */
    readonly apply?: { readonly layer: LayerId };
}

/** What adding or checking shader text found. @since 3.36.0 */
export type ShaderAddResult =
    | {
          readonly ok: true;
          /** The shader as the catalog lists it. */
          readonly descriptor: ShaderDescriptor;
          /** The body equals a known shader's body: that id, and the defaults the text differs by. */
          readonly sameAs?: { readonly id: string; readonly params: ShaderParams };
          /**
           * `check` with `picture: true`: the text's still picture, drawn as `thumbnail` draws a
           * project shader, before anything is added. Absent with no canvas.
           */
          readonly picture?: Blob;
      }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };

/**
 * Whether a shader can draw in this view and on this device.
 * @since 3.36.0
 */
export type ShaderAvailability = { readonly ok: true } | { readonly ok: false; readonly problem: ShaderProblem };

/**
 * The shaders of the open project: pasted, or arrived in a file.
 * @since 3.36.0
 * @example
 * ```ts
 * const added = await graph.session.shaders.add(text, { apply: { layer: "marbles" } });
 * if (!added.ok) console.log(added.problems); // [{ code: "shader.loop-unbounded", params: { line: 4, column: 5 } }]
 * ```
 */
export interface SessionShaders {
    /**
     * Check shader text and add it to the project. With `apply`, also write it to that layer in
     * the same undoable step. With a canvas attached it is compiled and test-drawn first, and
     * nothing is written unless that passes.
     * @param text - The shader text: GLSL with a `graphty-shader 1` header, or a header-less body.
     * @param options - Who supplied it, where it is added, what to do when its id is taken, where to apply it.
     * @returns The shader, or every problem found.
     */
    add(text: ShaderText, options?: ShaderAddOptions): Promise<ShaderAddResult>;
    /**
     * Check shader text as `add` would, without writing anything: what `check` passes, `add` with
     * the same options passes, and every problem found is reported, not only the first. Text that
     * names a shader of the catalog with its body unchanged (a copy from `source`) passes with
     * `sameAs`, as `add` takes it.
     * @param text - The shader text.
     * @param options - The options `add` would be given, and whether to compile.
     * @param options.compile - Compile it and run its test frame on the canvas. Default true when a
     *   canvas is attached; with none only the static checks run.
     * @param options.picture - Also draw the text's still picture when it passes (`picture` on the
     *   result), framed as `thumbnail` frames it, so an editor can show what it will look like
     *   before `add`. Nothing is written and the graph is not redrawn. Default false.
     * @returns What the checks found.
     */
    check(
        text: ShaderText,
        options?: ShaderAddOptions & { readonly compile?: boolean; readonly picture?: boolean },
    ): Promise<ShaderAddResult>;
    /**
     * Replace a project shader's text, keeping its id. One undoable step.
     * @param id - The project shader.
     * @param text - The new text; its header's id is ignored.
     * @returns What the checks found.
     */
    replace(id: string, text: ShaderText): Promise<ShaderAddResult>;
    /**
     * Remove a project shader: layers naming it draw what lies beneath and report `shader.unknown`.
     * One undoable step.
     * @param id - The project shader.
     */
    remove(id: string): Promise<void>;
    /**
     * A shader's text, presets and registered shaders too. The text keeps the shader's id, so it
     * pastes back (`add`, `check`) as that shader with its values; `duplicate` gives it the `user/`
     * namespace instead, so it is added as a new shader to edit.
     * @param id - Any shader the catalog lists.
     * @param options - What to write.
     * @param options.params - Parameter values the copy carries as its defaults, such as the ones a
     *   layer sets; a name the shader does not declare, or a value of the wrong type, is skipped.
     * @param options.duplicate - Give a preset or a registered shader a `user/` id.
     * @returns The text.
     */
    source(id: string, options?: { readonly params?: ShaderParams; readonly duplicate?: boolean }): Promise<ShaderText>;
    /** @returns The project's shaders, in the order they were added. */
    list(): readonly ProjectShader[];
    /**
     * @param id - Any shader the catalog lists.
     * @returns Whether it draws now, and if not, why. A background that reads the graph's groups
     *   while no layer draws a group outline draws, and says so with `shader.no-data`.
     */
    status(id: string): ShaderStatus;
    /**
     * @param id - Any shader id.
     * @returns Whether it can draw in this view and on this device, before anyone picks it.
     */
    availability(id: string): ShaderAvailability;
    /**
     * Run a held shader. Runs the full checks (static, compile, test frame) first; the approval
     * holds for this session and fires `shader:approved`, so an application may remember it.
     * @param id - The project shader.
     * @returns What the checks found.
     */
    approve(id: string): Promise<ShaderAddResult>;
    /**
     * A still picture of a shader, for a gallery tile or a row. A shader that supplies
     * `descriptor.thumbnail` (every preset does, and any registrant may) gets that picture, never
     * drawn again; a project's own text is always drawn. Any other is drawn in this element's engine, framed by what it draws on: a node
     * look fills 80% of the tile, a card is the card, an effect reaches around a small gray node,
     * an edge is one curved edge between two dots, a group outline goes around five dots, and a
     * background fills the tile. The parameters and the time come from `descriptor.preview`, under
     * `params`. The element caches each picture by the shader's text, the values, the size and the
     * canvas color, so asking again draws nothing.
     *
     * Nothing is drawn, and the code never runs, for a shader that is held (`shader.held`), turned
     * off after the GPU was lost under it (`shader.quarantined`) or failed (its problem), or when
     * there is no canvas (`shader.no-canvas`): the result is then that coded fact, for the
     * application to show a neutral tile.
     * @param id - Any shader the catalog lists.
     * @param params - Parameter values over its preview's and its defaults.
     * @returns The picture (a PNG when drawn), or why there is none.
     * @throws A `GraphtyError` with `E_UNKNOWN_SHADER` for an id nothing holds.
     */
    thumbnail(id: string, params?: ShaderParams): Promise<Blob | ShaderProblem>;
}

/**
 * The reader's and the consumer's shader settings: never saved in a project, and never read from
 * loaded content, an AI command or a URL. Set on the element as `shaderSettings`.
 * @since 3.36.0
 */
export interface ShaderSettings {
    /** How much GPU work shaders may do. Default `"auto"`, chosen from the device. */
    readonly quality?: "auto" | "low" | "medium" | "high";
    /** Whether shaders move. Default `"system"`: follows the platform's reduced-motion setting. */
    readonly motion?: "system" | "on" | "off";
    /** Whether the frame guard may step quality down. Default true. */
    readonly guard?: boolean;
    /**
     * What happens to shader text that arrives in content: held for `approve` (the default),
     * run, or refused.
     */
    readonly untrusted?: "hold" | "run" | "refuse";
    /** SHA-256 hashes of shader texts the application remembers the reader approved. */
    readonly trustedHashes?: readonly string[];
}

/**
 * Why the render quality is not what the settings ask for: the frame guard stepped it down
 * after a second of slow frames the GPU was behind on (`guard.slow-gpu`), paused shader motion
 * at the bottom of its ladder (`guard.paused`), turned heavy shaders off after one very long
 * frame drawn with one on screen (`guard.long-frame`), or stepped back up after a run of fast
 * frames (`guard.recovered`).
 *
 * OPEN UNION: members may be added in a minor release; handle unknown members.
 * @since 3.36.0
 */
export type RenderQualityCode = "guard.slow-gpu" | "guard.paused" | "guard.long-frame" | "guard.recovered";

/**
 * How much shader work the element does now (design/rendering/shader-styles.md section 5): read as
 * `element.renderQuality`, announced as `graphty-render-quality`. A graph that names no shader is
 * drawn the same at every level.
 * @since 3.36.0
 */
export interface RenderQuality {
    /** The level `Q()`, the shader render targets and the effect caps follow. */
    readonly level: "low" | "medium" | "high";
    /**
     * How shader motion runs: at full rate, at half rate (the guard), paused (the guard), or
     * still (the reader's `motion` setting or the platform's reduced-motion preference).
     */
    readonly motion: "on" | "half" | "paused" | "still";
    /**
     * Whether heavy shaders (cost `"heavy"`) draw, whatever their origin: presets, registered
     * and pasted shaders alike. The guard's lowest steps turn them off.
     */
    readonly heavy: "on" | "off";
    /** Why it differs from the settings; absent when it does not. */
    readonly code?: RenderQualityCode;
}

/** A change of {@link RenderQuality}, as `graphty-render-quality` announces it. @since 3.36.0 */
export interface RenderQualityChange {
    /** The quality before. */
    readonly from: RenderQuality;
    /** The quality now. */
    readonly to: RenderQuality;
    /** What changed it. */
    readonly code: RenderQualityCode;
}

/** The settings the host draws by, resolved from {@link ShaderSettings}. */
export interface HostRenderSettings {
    /** The quality level the settings ask for, `"auto"` resolved. */
    readonly quality: RenderQuality["level"];
    /** Whether shaders move. */
    readonly motion: "system" | "on" | "off";
    /** Whether the frame guard may step quality down. */
    readonly guard: boolean;
}

/** One shader entry handed to the host to compile, test or draw. */
export interface HostShader {
    /** The shader's id. */
    readonly id: string;
    /** The SHA-256 of its text. */
    readonly hash: string;
    /** Its registration: the descriptor and the GLSL bodies, loaded. */
    readonly registration: LoadedRegistration;
    /** The 1-based line of the text its body starts on, so a driver's line maps back. */
    readonly bodyLine: number;
    /** Whether it costs `"heavy"`, so the frame guard's lowest steps turn it off. */
    readonly heavy?: boolean;
}

/**
 * What the element lends the session to compile and draw shaders in its engine. The session
 * never reaches a GPU itself.
 */
export interface ShaderHost {
    /** The renderer: WebGL 2 or WebGPU. */
    readonly renderer: "webgl" | "webgpu";
    /**
     * The hashes the crash marker named when the page loaded: shaders that were compiling,
     * testing or drawing when the last page died. Read before any autosave restored a layer.
     */
    readonly crashMarked: ReadonlySet<string>;
    /**
     * Compile a shader in the element's engine and run its test frame.
     * @param shader - The shader.
     * @returns Null when it passes, else the problem.
     */
    check(shader: HostShader): Promise<ShaderProblem | null>;
    /**
     * Draw a still picture of a shader, framed by what it draws on.
     * @param shader - The shader.
     * @param params - Parameter values over its defaults.
     * @param time - The time of the frame, in seconds.
     * @returns A PNG.
     */
    thumbnail(shader: HostShader, params: ShaderParams, time: number): Promise<Blob>;
    /** The canvas color the pictures are drawn against, so a cached one is not reused on another. */
    readonly theme?: string;
    /**
     * Draw by the reader's settings: the quality level, motion and the frame guard.
     * @param settings - The settings, `"auto"` resolved.
     */
    configure(settings: HostRenderSettings): void;
    /** The quality drawn now. */
    readonly quality: RenderQuality;
    /**
     * Listen for the quality changing on its own (the frame guard), and for shaders being frozen
     * because they flashed.
     * @param listener - Called with the change, or null when only the flashing set changed.
     * @returns Stops listening.
     */
    onRender(listener: (change: RenderQualityChange | null) => void): () => void;
    /** The text hashes whose time was frozen because their output flashed. */
    readonly flashing: ReadonlySet<string>;
    /**
     * Listen for the GPU being lost while the page was visible.
     * @param listener - Called with the hashes of the shaders drawn in the last 2 seconds.
     * @returns Stops listening.
     */
    onLost(listener: (hashes: readonly string[]) => void): () => void;
    /** Release everything the host built. */
    dispose(): void;
}

/** What the shaders module needs from its session. */
export interface ShadersSources {
    /** The dispatcher, for the project's state and the `shader.set` op. */
    readonly dispatcher: Dispatcher;
    /** The style stack, for `apply` and for counting the layers naming a shader. */
    readonly styles: SessionStylesApi;
    /** Publishes a session event. */
    readonly publish: <K extends "shader:status" | "shader:held" | "shader:approved" | "render:quality">(
        event: K,
        detail: SessionEventMap[K],
    ) => void;
}

/** A shader with its descriptor complete and its bodies loaded: what the renderer compiles. */
export interface LoadedRegistration {
    readonly descriptor: ShaderRegistration["descriptor"] & Pick<ShaderDescriptor, "target">;
    readonly glsl: string;
    readonly wgsl?: string;
    readonly lowDetail?: string;
}

/** What a text read into: the registration, its hash, where its body starts, its descriptor. */
interface ReadText {
    /**
     * The text the project stores: the text as given, or -- for a header-less body, or one given
     * another id -- the same shader written with its header, so it reads back alone.
     */
    readonly text: string;
    readonly registration: LoadedRegistration;
    readonly hash: string;
    readonly bodyLine: number;
    readonly descriptor: ShaderDescriptor;
    /** The catalog shader whose bare id its header named, read under a `user/` id. */
    readonly copyOf?: string;
}

/** The session-side controller behind `session.shaders`. */
export interface ShadersController {
    /** The API. */
    readonly api: SessionShaders;
    /**
     * Lend the session the element's engine.
     * @param host - The host; null takes it back.
     */
    attach(host: ShaderHost | null): void;
    /**
     * Change the reader's settings.
     * @param settings - The settings.
     */
    configure(settings: ShaderSettings): void;
    /** The settings in force. */
    readonly settings: ShaderSettings;
    /** How much shader work is done now; with no host, what the settings ask for. */
    readonly renderQuality: RenderQuality;
    /** The host lent now, or null. */
    readonly host: ShaderHost | null;
    /** The project's shaders as the catalog lists them. */
    descriptors(): readonly ShaderDescriptor[];
    /**
     * A shader the element may draw now, for the node and edge batches: a preset or a registered
     * shader at once, a project shader once it is trusted and has compiled and passed its test
     * frame here. A project shader's state changing is published as `shader:status`, which is when
     * to ask again.
     * @param id - The shader's id.
     * @returns The shader, or null when it may not draw (unknown, held, failed, compiling, off).
     */
    drawable(id: string): Promise<HostShader | null>;
    /**
     * What to run before a shader nobody has approved is compiled or test-drawn: the element's
     * autosave flushes, so a GPU that dies under it loses no work.
     * @param hook - The hook.
     */
    onRisk(hook: () => Promise<void>): void;
    /** Stop listening and forget the catalog lookup. */
    dispose(): void;
}

/** Each session's controller, for the element that owns it. */
const CONTROLLERS = new WeakMap<object, ShadersController>();

/**
 * Let the element find a session's shaders controller.
 * @param session - The session.
 * @param controller - Its controller.
 */
export function bindShadersController(session: object, controller: ShadersController): void {
    CONTROLLERS.set(session, controller);
}

/**
 * The shaders controller of a session.
 * @param session - The session.
 * @returns Its controller, or undefined for an object that is not one.
 */
export function shadersControllerOf(session: object): ShadersController | undefined {
    return CONTROLLERS.get(session);
}

/**
 * The 1-based line a body starts on in its text.
 * @param text - The whole text.
 * @param body - The body, a suffix of it.
 * @returns The line.
 */
function bodyLineOf(text: string, body: string): number {
    const start = text.endsWith(body) ? text.length - body.length : 0;
    let line = 1;
    for (let index = 0; index < start; index++) {
        if (text.codePointAt(index) === 10) {
            line++;
        }
    }

    return line;
}

/**
 * Every shader id a layer names on its shader lists.
 * @param spec - The layer.
 * @returns The ids.
 */
export function idsNamedBy(spec: LayerSpec): Set<string> {
    const ids = new Set<string>();
    const set = (spec.set ?? {}) as Record<string, unknown>;
    for (const channel of ["node.shaders", "edge.shaders"]) {
        const list = set[channel];
        if (Array.isArray(list)) {
            for (const use of list as readonly ShaderUse[]) {
                if (use.off !== true && typeof use.shader === "string") {
                    ids.add(use.shader);
                }
            }
        }
    }

    return ids;
}

/**
 * The defaults of `text` that differ from `known`'s.
 * @param text - The new shader.
 * @param known - The shader it equals in body.
 * @returns The parameter values.
 */
function differingDefaults(text: ShaderDescriptor, known: ShaderDescriptor): ShaderParams {
    const params: Record<string, number | string | boolean> = {};
    for (const param of text.params) {
        const other = known.params.find((entry) => entry.name === param.name);
        if (other !== undefined && other.default !== param.default && param.default !== undefined) {
            params[param.name] = param.default as number | string | boolean;
        }
    }

    return params;
}

/**
 * The patch that writes a shader to a layer: a use at its own place, added at the end of the
 * layer's list for the shader's target.
 * @param spec - The layer.
 * @param descriptor - The shader.
 * @param params - Parameter values to write with it.
 * @returns The patch.
 * @throws A `GraphtyError` with `E_SHADER_KIND` for a background, which no layer draws.
 */
function applyPatch(spec: LayerSpec, descriptor: ShaderDescriptor, params: ShaderParams = {}): Partial<LayerSpec> {
    if (descriptor.target === "background") {
        throw new GraphtyError({
            code: "E_SHADER_KIND",
            message: `"${descriptor.id}" draws on the ${descriptor.target}, which no style layer draws.`,
            source: "style",
            details: { id: descriptor.id, target: descriptor.target, expected: ["node", "edge", "group"] },
        });
    }

    const channel = descriptor.target === "edge" ? "edge.shaders" : "node.shaders";
    const set = { ...spec.set } as Record<string, unknown>;
    const held = Array.isArray(set[channel]) ? (set[channel] as readonly ShaderUse[]) : [];
    const use: ShaderUse = { shader: descriptor.id, ...(Object.keys(params).length > 0 ? { params } : {}) };
    set[channel] = [...held, use];
    return { set };
}

/**
 * Whether a layer paints the target a shader draws on.
 * @param spec - The layer.
 * @param layer - Its id.
 * @param drawsOn - What the shader draws on.
 * @returns `shader.apply-target` when it paints the other one, else null.
 */
function applyTargetProblem(spec: LayerSpec, layer: LayerId, drawsOn: ShaderTarget): ShaderProblem | null {
    const channel = [...Object.keys(spec.set ?? {}), ...Object.keys(spec.encode ?? {})].find((name) =>
        /^(node|edge)\./.test(name),
    );
    const target = spec.target ?? (channel === undefined ? undefined : channel.slice(0, 4));
    const wants = drawsOn === "edge" ? "edge" : "node";
    // A background is refused by `applyPatch` (`E_SHADER_KIND`): no layer draws one.
    if (drawsOn === "background" || target === undefined || target === wants) {
        return null;
    }

    return { code: "shader.apply-target", params: { layer, target } };
}

/**
 * A shader written as text under an id, with parameter values as its defaults.
 * @param descriptor - The shader.
 * @param glsl - Its body.
 * @param id - The id to write.
 * @param params - Values to write as defaults; a name it does not declare, or a value of another type, is skipped.
 * @param lowDetail - Its low-detail body, written as `shadeFar`.
 * @returns The text.
 */
function copyText(
    descriptor: ShaderDescriptor,
    glsl: string,
    id: string,
    params: ShaderParams,
    lowDetail?: string,
): ShaderText {
    const { origin: _origin, hash: _hash, thumbnail: _thumbnail, ...facts } = descriptor;
    const defaults = facts.params.map((param) => {
        const value = Object.hasOwn(params, param.name) ? params[param.name] : undefined;
        return value !== undefined && typeof value === typeof param.default ? { ...param, default: value } : param;
    });
    return formatShaderText({
        descriptor: { ...facts, id, params: defaults },
        glsl,
        ...(lowDetail === undefined ? {} : { lowDetail }),
    });
}

/**
 * The next id not taken in the project or the catalog: `<id>-2`, `<id>-3`, ...
 * @param id - The id taken.
 * @param taken - Whether an id is taken.
 * @returns The free id.
 */
function freeId(id: string, taken: (candidate: string) => boolean): string {
    const base = id.replace(/-\d+$/, "");
    for (let n = 2; ; n++) {
        const candidate = `${base.slice(0, 36)}-${String(n)}`;
        if (!taken(candidate)) {
            return candidate;
        }
    }
}

/**
 * The text of a registration under another id.
 * @param registration - The registration.
 * @param id - The id.
 * @returns The registration, renamed.
 */
function renamed(registration: LoadedRegistration, id: string): LoadedRegistration {
    return { ...registration, descriptor: { ...registration.descriptor, id } };
}

/**
 * Build the shaders of one session.
 * @param sources - What the shaders need from the session.
 * @returns The controller.
 */
export function createSessionShaders(sources: ShadersSources): ShadersController {
    const { dispatcher, styles, publish } = sources;
    const state = (): ProjectState => dispatcher.state;

    /** Texts read, by text: what parsing found, so a text is parsed once. */
    const read = new Map<string, ReadText | readonly ShaderProblem[]>();
    /** The hashes approved in this session: the reader's own, and those `approve` ran. */
    const approved = new Set<string>();
    /** The hashes whose shader was drawing when the GPU was lost while the page was visible. */
    const quarantined = new Set<string>();
    /** What compiling and testing each hash found: pending, null for a pass, or the problem. */
    const compiled = new Map<string, Promise<ShaderProblem | null> | ShaderProblem | null>();
    /** The last status published per id, so only a change is published. */
    const published = new Map<string, string>();
    /** The ids last seen held, so `shader:held` names only newcomers. */
    let heldBefore = new Set<string>();
    /** The text hash of each preset and registered shader drawn, by id: what the guard sees of it. */
    const catalogHashes = new Map<string, string>();
    /** The thumbnails drawn or supplied, by what they show (see `thumbnailKey`). */
    const thumbnails = new Map<string, Promise<Blob | ShaderProblem>>();

    let host: ShaderHost | null = null;
    let stopLost: (() => void) | null = null;
    let settings: ShaderSettings = {};
    let riskHook: (() => Promise<void>) | null = null;

    /**
     * Read a text: parse, hash, describe. Cached by text.
     * @param text - The text.
     * @param place - Where it is being added: its target, and the place text that names none takes.
     * @param id - An id to give it in place of its header's.
     * @returns What it read into, or the problems.
     */
    const readText = (text: string, place?: ShaderTextOptions, id?: string): ReadText | readonly ShaderProblem[] => {
        const key = `${place?.target ?? ""} ${place?.place ?? ""}\u0000${id ?? ""}\u0000${text}`;
        const cached = read.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const parsed = parseShaderText(text, place);
        let result: ReadText | readonly ShaderProblem[];
        if (parsed.ok) {
            const registration = id === undefined ? parsed.registration : renamed(parsed.registration, id);
            const headed =
                text.includes(SHADER_TEXT_MAGIC) && registration.descriptor.id === parsed.registration.descriptor.id;
            // A place the options supplied is written into the stored text, so it reads back the same
            // with no options: a saved project is opened with none.
            const alone = place === undefined ? parsed : parseShaderText(text);
            const keepsPlace = alone.ok && alone.registration.descriptor.place === registration.descriptor.place;
            const stored = headed && keepsPlace ? text : formatShaderText(registration);
            const hash = sha256Hex(stored);
            try {
                result = {
                    text: stored,
                    registration,
                    hash,
                    bodyLine: bodyLineOf(text, registration.glsl),
                    descriptor: describePastedShader(registration, hash),
                };
            } catch (error) {
                const details = (error as GraphtyError).details as { problems?: readonly ShaderProblem[] } | undefined;
                result = details?.problems ?? [{ code: "shader.id-invalid", params: { id: id ?? "" } }];
            }
        } else {
            result = catalogCopy(text, place, id, parsed.problems) ?? parsed.problems;
        }

        read.set(key, result);
        return result;
    };

    /**
     * Text whose header names a preset's bare id, which pasted text may not take: a copy from
     * `source`, read under the `user/` id a duplicate would have.
     * @param text - The text.
     * @param place - Where it is being added.
     * @param id - An id the caller gives it, which leaves the header alone.
     * @param problems - What parsing found.
     * @returns The copy read, or undefined when the text is not one.
     */
    const catalogCopy = (
        text: string,
        place: ShaderTextOptions | undefined,
        id: string | undefined,
        problems: readonly ShaderProblem[],
    ): ReadText | undefined => {
        const named = problems.length === 1 && problems[0].code === "shader.id-invalid" ? problems[0].params.id : "";
        if (id !== undefined || typeof named !== "string" || !/^[a-z0-9-]+$/.test(named)) {
            return undefined;
        }

        if (shaderDescriptor(named) === undefined) {
            return undefined;
        }

        const renamedText = text.replace(new RegExp(String.raw`("id"\s*:\s*)"${named}"`), `$1"user/${named}"`);
        const copy = renamedText === text ? undefined : readText(renamedText, place);
        return copy === undefined || Array.isArray(copy) ? undefined : { ...(copy as ReadText), copyOf: named };
    };

    /**
     * A project shader, read under its project id.
     * @param id - The id.
     * @returns What it read into, or undefined when the project does not hold it or it does not parse.
     */
    const projectShader = (id: string): ReadText | undefined => {
        const entry = state().shaders.get(id);
        if (entry === undefined) {
            return undefined;
        }

        let result = readText(entry.text);
        // A document's text whose header names another id is the shader under the document's id.
        if (!Array.isArray(result) && (result as ReadText).descriptor.id !== id) {
            result = readText(entry.text, undefined, id);
        }

        return Array.isArray(result) ? undefined : (result as ReadText);
    };

    const stopCatalog = addPastedShaderSource({
        descriptor: (id) => projectShader(id)?.descriptor,
        ids: () => [...state().shaders.keys()],
    });

    /**
     * Whether a text may run without asking.
     * @param hash - Its hash.
     * @returns True when it was approved here, or the application trusts it and no crash marked it.
     */
    const trusted = (hash: string): boolean => {
        if (approved.has(hash)) {
            return true;
        }

        if (host?.crashMarked.has(hash) === true) {
            return false;
        }

        return settings.untrusted === "run" || (settings.trustedHashes ?? []).includes(hash);
    };

    setShaderTrust(styles, {
        mode: () => settings.untrusted ?? "hold",
        trusted: (text) => trusted(sha256Hex(text)),
        trust: (texts) => {
            for (const text of texts) {
                approved.add(sha256Hex(text));
            }
        },
        embedded: (layers) => registeredTexts(layers),
        pageOwns: (id) => !state().shaders.has(id) && shaderDescriptor(id)?.origin === "registered",
    });

    /**
     * Compile and test one shader on the host, once per hash.
     * @param shader - The shader.
     * @returns Null when it passes, else the problem; null with no host.
     */
    const compile = (shader: HostShader): Promise<ShaderProblem | null> => {
        const known = compiled.get(shader.hash);
        if (known !== undefined) {
            return known instanceof Promise ? known : Promise.resolve(known);
        }

        if (host === null) {
            return Promise.resolve(null);
        }

        const running = host.check(shader).then(
            (problem) => {
                compiled.set(shader.hash, problem);
                refresh();
                return problem;
            },
            (error: unknown) => {
                const problem: ShaderProblem = {
                    code: "shader.compile",
                    params: { line: 0, column: 0, message: error instanceof Error ? error.message : String(error) },
                };
                compiled.set(shader.hash, problem);
                refresh();
                return problem;
            },
        );
        compiled.set(shader.hash, running);
        return running;
    };

    /**
     * What one project shader is doing.
     * @param shader - The shader.
     * @returns Its status.
     */
    const statusOf = (shader: ReadText): ShaderStatus => {
        const { id } = shader.descriptor;
        if (quarantined.has(shader.hash)) {
            return { state: "off", problem: { code: "shader.quarantined", params: { id } } };
        }

        if (!trusted(shader.hash)) {
            return { state: "held", problem: { code: "shader.held", params: { id } } };
        }

        if (host === null) {
            return noDataStatus(shader.descriptor) ?? { state: "not-checked" };
        }

        if (shader.descriptor.webgpu === "none" && host.renderer === "webgpu") {
            return { state: "off", problem: { code: "shader.webgpu-unsupported", params: {} } };
        }

        const result = compiled.get(shader.hash);
        if (result === undefined || result instanceof Promise) {
            return { state: "compiling" };
        }

        if (result !== null) {
            return { state: "failed", problem: result };
        }

        return drawnStatusOf(shader.descriptor, shader.hash) ?? noDataStatus(shader.descriptor) ?? { state: "ready" };
    };

    /**
     * A background that reads the graph's groups (`members`) while no layer draws a group outline: it
     * draws as if there were none, and says so.
     * @param descriptor - The shader's facts.
     * @returns The status, or null when it has what it reads.
     */
    const noDataStatus = (descriptor: ShaderDescriptor): ShaderStatus | null => {
        if (descriptor.target !== "background" || !descriptor.reads.includes("members")) {
            return null;
        }

        return styles
            .list()
            .some((layer) =>
                ((layer.set?.["node.shaders"] ?? []) as readonly ShaderUse[]).some(
                    (use) => placeOfUse(use) === "group",
                ),
            )
            ? null
            : {
                  state: host === null ? "not-checked" : "ready",
                  problem: { code: "shader.no-data", params: { input: "members" } },
              };
    };

    /**
     * How a shader that may draw is drawn now, decided by its cost and its motion, never by where
     * it came from: off by the frame guard (heavy shaders), frozen because it flashed, or still
     * because motion is paused or switched off.
     * @param descriptor - The shader's facts.
     * @param hash - Its text hash.
     * @returns The status, or null when it draws as it was written.
     */
    const drawnStatusOf = (descriptor: ShaderDescriptor, hash: string): ShaderStatus | null => {
        if (host === null) {
            return null;
        }

        const { quality } = host;
        if (descriptor.cost === "heavy" && quality.heavy === "off") {
            return { state: "off", problem: { code: "shader.guard-off", params: { level: quality.level } } };
        }

        if (host.flashing.has(hash)) {
            return { state: "still", problem: { code: "shader.flashing", params: { id: descriptor.id } } };
        }

        if (shaderAnimates(descriptor) && (quality.motion === "paused" || quality.motion === "still")) {
            let reason = settings.motion === "off" ? "setting" : "system";
            if (quality.motion === "paused") {
                reason = "guard";
            }

            return { state: "still", problem: { code: "shader.still", params: { reason } } };
        }

        return null;
    };

    /**
     * What a preset or a registered shader is doing: failed to load, off after the GPU was lost
     * under it, or drawn as {@link drawnStatusOf} says.
     * @param descriptor - Its facts.
     * @returns Its status.
     */
    const catalogStatus = (descriptor: ShaderDescriptor): ShaderStatus => {
        const failed = shaderLoadProblem(descriptor.id);
        if (failed !== undefined) {
            return { state: "failed", problem: failed };
        }

        const hash = catalogHashes.get(descriptor.id);
        if (hash !== undefined && quarantined.has(hash)) {
            return { state: "off", problem: { code: "shader.quarantined", params: { id: descriptor.id } } };
        }

        const drawn = host === null ? null : drawnStatusOf(descriptor, hash ?? "");
        return drawn ?? noDataStatus(descriptor) ?? { state: host === null ? "not-checked" : "ready" };
    };

    /**
     * The text of every page-registered shader the layers name, so a saved look carries it.
     * ponytail: a registration whose body is a loader is carried once that body has loaded (the
     * first time it draws); its load is started here, so the next save has it.
     * @param layers - The layers being saved.
     * @returns The ids and texts.
     */
    function registeredTexts(layers: readonly LayerSpec[]): { readonly id: string; readonly text: string }[] {
        const texts: { id: string; text: string }[] = [];
        const ids = new Set(layers.flatMap((layer) => [...idsNamedBy(layer)]));
        for (const id of ids) {
            const descriptor = state().shaders.has(id) ? undefined : shaderDescriptor(id);
            if (descriptor?.origin !== "registered") {
                continue;
            }

            const source = shaderSourceNow(id);
            if (source === undefined) {
                void loadShaderSource(id)?.catch(() => undefined);
            } else if (source.wgsl === undefined) {
                // A native WGSL body cannot be written as text, the one documented exception.
                texts.push({ id, text: copyText(descriptor, source.glsl, id, {}, source.lowDetail) });
            }
        }

        return texts;
    }

    /**
     * Start compiling one project shader when it may run (a host, a trusted text, not quarantined)
     * and has not been compiled yet.
     * @param id - The shader's id.
     * @param shader - The shader, read.
     */
    function startCompile(id: string, shader: ReadText): void {
        if (host === null || !trusted(shader.hash) || quarantined.has(shader.hash) || compiled.has(shader.hash)) {
            return;
        }

        void compile({
            id,
            hash: shader.hash,
            registration: shader.registration,
            bodyLine: shader.bodyLine,
        });
    }

    /**
     * Publish a shader's status when it changed.
     * @param id - The shader.
     * @param status - Its status now.
     */
    function publishStatus(id: string, status: ShaderStatus): void {
        const key = JSON.stringify(status);
        if (published.get(id) !== key) {
            published.set(id, key);
            publish("shader:status", { id, ...status });
        }
    }

    /**
     * Bring every project shader's status up to date: start compiling the ones that may run,
     * and publish what changed -- for the presets and registered shaders drawn too, which the
     * frame guard, the flashing check and a lost GPU turn off or freeze as they do pasted ones.
     */
    function refresh(): void {
        const held = new Set<string>();
        const ids = new Set(state().shaders.keys());
        for (const id of ids) {
            const shader = projectShader(id);
            if (shader === undefined) {
                continue;
            }

            startCompile(id, shader);
            const status = statusOf(shader);
            if (status.state === "held") {
                held.add(id);
            }

            publishStatus(id, status);
        }

        for (const id of catalogHashes.keys()) {
            const descriptor = ids.has(id) ? undefined : shaderDescriptor(id);
            if (descriptor !== undefined) {
                publishStatus(id, catalogStatus(descriptor));
            }
        }

        for (const id of published.keys()) {
            if (!ids.has(id) && !catalogHashes.has(id)) {
                published.delete(id);
            }
        }

        const newcomers = [...held].filter((id) => !heldBefore.has(id));
        heldBefore = held;
        if (newcomers.length > 0) {
            publish("shader:held", { ids: newcomers });
        }
    }

    const unwatch = dispatcher.events.project;
    dispatcher.events.project = (change) => {
        unwatch?.(change);
        if (change.slices.includes("shaders")) {
            refresh();
        }
    };

    /**
     * Whether an id is taken: a preset, a registered shader, or another text in the project.
     * @param id - The id.
     * @param text - The text it would hold; the same text is not a clash.
     * @returns True when it is.
     */
    const taken = (id: string, text?: string): boolean => {
        const entry = state().shaders.get(id);
        if (entry !== undefined) {
            return entry.text !== text;
        }

        return shaderDescriptors().some((descriptor) => descriptor.id === id);
    };

    /**
     * Find a known shader with the same body: a preset, a registered shader or another project
     * shader.
     * @param shader - The new shader.
     * @returns Its id and the defaults the new one differs by, or undefined.
     */
    const sameAsOf = async (
        shader: ReadText,
    ): Promise<{ readonly id: string; readonly params: ShaderParams } | undefined> => {
        for (const descriptor of shaderDescriptors()) {
            const body = await bodyOf(descriptor.id);
            if (body?.trim() === shader.registration.glsl.trim()) {
                return { id: descriptor.id, params: differingDefaults(shader.descriptor, descriptor) };
            }
        }

        for (const id of state().shaders.keys()) {
            const other = projectShader(id);
            if (
                other !== undefined &&
                id !== shader.descriptor.id &&
                other.registration.glsl === shader.registration.glsl
            ) {
                return { id, params: differingDefaults(shader.descriptor, other.descriptor) };
            }
        }

        return undefined;
    };

    /**
     * The result of a check that passed.
     * @param shader - The shader.
     * @returns The result, with `sameAs` when a known shader has its body.
     */
    const passed = async (shader: ReadText): Promise<ShaderAddResult> => {
        const sameAs = await sameAsOf(shader);
        return { ok: true, descriptor: shader.descriptor, ...(sameAs === undefined ? {} : { sameAs }) };
    };

    /**
     * Run the full checks a trusted shader gets before it is written: compile and test frame,
     * with a host. Flushes autosave first when nobody approved the text yet.
     * @param shader - The shader.
     * @param risky - Whether the text has not been approved.
     * @returns Null when it passes, else the problem.
     */
    const fullCheck = async (shader: ReadText, risky: boolean): Promise<ShaderProblem | null> => {
        if (host === null) {
            return null;
        }

        if (risky) {
            await riskHook?.();
        }

        return compile({
            id: shader.descriptor.id,
            hash: shader.hash,
            registration: shader.registration,
            bodyLine: shader.bodyLine,
        });
    };

    /**
     * Write a shader to the project, and with `apply` to a layer, in one step.
     * @param shader - The shader.
     * @param apply - The layer to write it to.
     */
    const write = async (shader: ReadText, apply: LayerId | undefined): Promise<void> => {
        const { id } = shader.descriptor;
        const { text } = shader;
        if (apply === undefined) {
            await dispatcher.dispatch({ op: "shader.set", id, text });
            return;
        }

        const patch = applyPatch(applyLayer(apply), shader.descriptor);
        await dispatcher.transaction(
            `Add the shader ${id}`,
            async (tx) => {
                await tx.dispatch({ op: "shader.set", id, text });
                await tx.dispatch({ op: "style.patch", action: "update", id: apply, patch });
            },
            { fact: { code: "shader.add", params: { id, layer: apply } } },
        );
    };

    /**
     * The layer `apply` names.
     * @param id - Its id.
     * @returns The layer.
     * @throws A `GraphtyError` with `E_UNKNOWN_LAYER` when there is none.
     */
    const applyLayer = (id: LayerId): LayerSpec => {
        const layer = styles.get(id);
        if (layer === undefined) {
            throw new GraphtyError({
                code: "E_UNKNOWN_LAYER",
                message: `There is no style layer with the id "${id}".`,
                source: "style",
                target: { kind: "layer", id },
                details: { id },
            });
        }

        return layer;
    };

    /**
     * Whether `apply` names a layer of the target a shader draws on.
     * @param drawsOn - What the shader draws on.
     * @param options - The options.
     * @returns The problems: none, or `shader.apply-target`.
     */
    const targetProblems = (drawsOn: ShaderTarget, options: ShaderAddOptions): ShaderProblem[] => {
        const layer = options.apply?.layer;
        const problem = layer === undefined ? null : applyTargetProblem(applyLayer(layer), layer, drawsOn);
        return problem === null ? [] : [problem];
    };

    /**
     * The checks `add` and `check` share past parsing, synchronous so a held add stays one dispatch:
     * the project's limit, the layer's target, a taken id, and content the settings refuse.
     * @param read - The text, read.
     * @param text - The text as given.
     * @param options - The options.
     * @returns The shader (renamed when asked) and every problem found.
     */
    const admit = (
        read: ReadText,
        text: string,
        options: ShaderAddOptions,
    ): { readonly shader: ReadText; readonly problems: ShaderProblem[] } => {
        const problems: ShaderProblem[] = [];
        const { size } = state().shaders;
        if (size >= PROJECT_SHADER_LIMIT) {
            problems.push({ code: "shader.too-many", params: { count: size, limit: PROJECT_SHADER_LIMIT } });
        }

        problems.push(...targetProblems(read.descriptor.target, options));
        let shader = read;
        const wanted = shader.descriptor.id;
        if (taken(wanted, shader.text)) {
            const free = freeId(wanted, (candidate) => taken(candidate));
            if (options.onTaken === "rename") {
                shader = readText(read.copyOf === undefined ? text : read.text, options, free) as ReadText;
            } else {
                problems.push({ code: "shader.id-taken", params: { id: wanted, free } });
            }
        }

        if (options.source === "content" && settings.untrusted === "refuse" && !trusted(shader.hash)) {
            problems.push({ code: "shader.held", params: { id: shader.descriptor.id } });
        }

        return { shader, problems };
    };

    /**
     * The catalog shader a text is an unchanged copy of: its header names a preset or a registered
     * shader, and its body is that shader's.
     * @param shader - The text, read.
     * @returns The shader's id and the values the copy carries, or undefined.
     */
    const copyOfCatalog = async (
        shader: ReadText,
    ): Promise<{ readonly id: string; readonly params: ShaderParams } | undefined> => {
        const id = shader.copyOf ?? shader.descriptor.id;
        const descriptor = state().shaders.has(id) ? undefined : shaderDescriptor(id);
        if (descriptor === undefined || descriptor.origin === "pasted") {
            return undefined;
        }

        const body = await bodyOf(id);
        return body?.trim() === shader.registration.glsl.trim()
            ? { id, params: differingDefaults(shader.descriptor, descriptor) }
            : undefined;
    };

    /**
     * Whether a text names a catalog shader, so `add` and `check` must ask whether it is a copy.
     * @param shader - The text, read.
     * @returns True when it does.
     */
    const namesCatalog = (shader: ReadText): boolean =>
        shader.copyOf !== undefined ||
        (!state().shaders.has(shader.descriptor.id) && shaderDescriptor(shader.descriptor.id) !== undefined);

    /**
     * Add a copy of a catalog shader: nothing joins the project; with `apply`, the catalog shader
     * and the copy's values are written to the layer.
     * @param copy - The catalog shader and the values.
     * @param copy.id - The catalog shader.
     * @param copy.params - The values the copy carries.
     * @param options - The options.
     * @returns What adding found.
     */
    const addCopy = async (
        copy: { readonly id: string; readonly params: ShaderParams },
        options: ShaderAddOptions,
    ): Promise<ShaderAddResult> => {
        const descriptor = shaderDescriptor(copy.id) as ShaderDescriptor;
        const problems = targetProblems(descriptor.target, options);
        if (problems.length > 0) {
            return { ok: false, problems };
        }

        const layer = options.apply?.layer;
        if (layer !== undefined) {
            const patch = applyPatch(applyLayer(layer), descriptor, copy.params);
            await dispatcher.dispatch({ op: "style.patch", action: "update", id: layer, patch });
        }

        return { ok: true, descriptor, sameAs: copy };
    };

    /**
     * Add text that is not a copy of a catalog shader.
     * @param read - The text, read.
     * @param text - The text as given.
     * @param options - The options.
     * @returns What adding found.
     */
    const addNew = (read: ReadText, text: string, options: ShaderAddOptions): Promise<ShaderAddResult> => {
        const { shader, problems } = admit(read, text, options);
        if (problems.length > 0) {
            return Promise.resolve({ ok: false, problems });
        }

        const content = options.source === "content";
        // Content that is not trusted is written at once, held: nothing of it runs, so there is
        // nothing to compile. Kept synchronous up to the dispatch, so an AI command's
        // transaction takes it as one of its members.
        if (content && !trusted(shader.hash)) {
            const done = write(shader, options.apply?.layer);
            return done.then(() => passed(shader));
        }

        const { id } = shader.descriptor;
        return fullCheck(shader, !trusted(shader.hash)).then(async (problem) => {
            if (problem !== null) {
                return { ok: false, problems: [problem] };
            }

            if (!content) {
                approved.add(shader.hash);
            }

            await write(shader, options.apply?.layer);
            if (!content) {
                publish("shader:approved", { id, hash: shader.hash });
            }

            return passed(shader);
        });
    };

    const api: SessionShaders = {
        add(text, options = {}) {
            const first = readText(text, options);
            if (Array.isArray(first)) {
                return Promise.resolve({ ok: false, problems: first as readonly ShaderProblem[] });
            }

            const read = first as ReadText;
            // ponytail: a copy of a catalog shader is decided after its body loads, so a held add of one
            // is not synchronous; every other add is.
            if (namesCatalog(read)) {
                return copyOfCatalog(read).then((copy) =>
                    copy === undefined ? addNew(read, text, options) : addCopy(copy, options),
                );
            }

            return addNew(read, text, options);
        },

        async check(text, options = {}) {
            const first = readText(text, options);
            if (Array.isArray(first)) {
                return { ok: false, problems: first as readonly ShaderProblem[] };
            }

            const read = first as ReadText;
            const copy = namesCatalog(read) ? await copyOfCatalog(read) : undefined;
            if (copy !== undefined) {
                const descriptor = shaderDescriptor(copy.id) as ShaderDescriptor;
                const problems = targetProblems(descriptor.target, options);
                if (problems.length > 0) {
                    return { ok: false, problems };
                }

                const shown = options.picture === true ? await api.thumbnail(copy.id, copy.params) : undefined;
                return { ok: true, descriptor, sameAs: copy, ...(shown instanceof Blob ? { picture: shown } : {}) };
            }

            const { shader, problems } = admit(read, text, options);
            const held = options.source === "content" && !trusted(shader.hash);
            if ((options.compile ?? host !== null) && !held) {
                const problem = await fullCheck(shader, !trusted(shader.hash));
                if (problem !== null) {
                    problems.push(problem);
                }
            }

            if (problems.length > 0) {
                return { ok: false, problems };
            }

            const result = await passed(shader);
            // Only text that compiled and passed its test frame is drawn; held text never runs.
            const drawer = host;
            if (options.picture !== true || drawer === null || held || options.compile === false) {
                return result;
            }

            return { ...result, picture: await picture(drawer, shader.descriptor.id, shader, shader.descriptor, {}) };
        },

        async replace(id, text) {
            if (!state().shaders.has(id)) {
                throw unknownShader(id, [...state().shaders.keys()]);
            }

            const result = readText(text, placeOf(projectShader(id)?.descriptor), id);
            if (Array.isArray(result)) {
                return { ok: false, problems: result as readonly ShaderProblem[] };
            }

            const shader = result as ReadText;
            const problem = await fullCheck(shader, !trusted(shader.hash));
            if (problem !== null) {
                return { ok: false, problems: [problem] };
            }

            approved.add(shader.hash);
            await dispatcher.dispatch({ op: "shader.set", id, text: shader.text });
            publish("shader:approved", { id, hash: shader.hash });
            return passed(shader);
        },

        async remove(id) {
            if (!state().shaders.has(id)) {
                throw unknownShader(id, [...state().shaders.keys()]);
            }

            await dispatcher.dispatch({ op: "shader.set", id, text: null });
        },

        async source(id, options = {}) {
            const params = options.params ?? {};
            const entry = state().shaders.get(id);
            if (entry !== undefined) {
                const shader = projectShader(id);
                return shader === undefined || Object.keys(params).length === 0
                    ? entry.text
                    : copyText(shader.descriptor, shader.registration.glsl, id, params);
            }

            const descriptor = shaderDescriptor(id);
            const body = await bodyOf(id);
            if (descriptor === undefined || body === undefined) {
                throw unknownShader(id, [...state().shaders.keys(), ...shaderDescriptors().map((each) => each.id)]);
            }

            const name = id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
            return copyText(descriptor, body, options.duplicate === true ? `user/${name}` : id, params);
        },

        list() {
            const counts = new Map<string, number>();
            for (const layer of styles.list()) {
                for (const id of idsNamedBy(layer)) {
                    counts.set(id, (counts.get(id) ?? 0) + 1);
                }
            }

            const shaders: ProjectShader[] = [];
            for (const id of state().shaders.keys()) {
                const shader = projectShader(id);
                if (shader !== undefined) {
                    shaders.push(
                        Object.freeze({
                            id,
                            plainName: shader.descriptor.plainName,
                            target: shader.descriptor.target,
                            ...(shader.descriptor.place === undefined ? {} : { place: shader.descriptor.place }),
                            hash: shader.hash,
                            state: statusOf(shader).state,
                            usedBy: counts.get(id) ?? 0,
                        }),
                    );
                }
            }

            return Object.freeze(shaders);
        },

        status(id) {
            const shader = projectShader(id);
            if (shader !== undefined) {
                return statusOf(shader);
            }

            const descriptor = shaderDescriptor(id);
            if (descriptor === undefined) {
                return { state: "failed", problem: { code: "shader.unknown", params: { id } } };
            }

            return catalogStatus(descriptor);
        },

        availability(id) {
            const descriptor = shaderDescriptor(id);
            if (descriptor === undefined) {
                return { ok: false, problem: { code: "shader.unknown", params: { id } } };
            }

            if (descriptor.webgpu === "none" && host?.renderer === "webgpu") {
                return { ok: false, problem: { code: "shader.webgpu-unsupported", params: {} } };
            }

            const failed = shaderLoadProblem(id);
            if (failed !== undefined) {
                return { ok: false, problem: failed };
            }

            const shader = projectShader(id);
            if (shader !== undefined) {
                const status = statusOf(shader);
                if (status.state === "held" || status.state === "off" || status.state === "failed") {
                    return { ok: false, problem: status.problem ?? { code: "shader.held", params: { id } } };
                }
            }

            return { ok: true };
        },

        async approve(id) {
            const entry = state().shaders.get(id);
            if (entry === undefined) {
                throw unknownShader(id, [...state().shaders.keys()]);
            }

            // The full checks, static ones included: the text is read again rather than trusted
            // from the cache, which a file could not have seeded.
            read.delete(`\u0000${id}\u0000${entry.text}`);
            const shader = projectShader(id);
            if (shader === undefined) {
                const problems = readText(entry.text, undefined, id);
                return { ok: false, problems: problems as readonly ShaderProblem[] };
            }

            quarantined.delete(shader.hash);
            const problem = await fullCheck(shader, true);
            if (problem !== null) {
                refresh();
                return { ok: false, problems: [problem] };
            }

            approved.add(shader.hash);
            refresh();
            publish("shader:approved", { id, hash: shader.hash });
            return passed(shader);
        },

        thumbnail(id, params = {}) {
            const project = projectShader(id);
            const descriptor = project?.descriptor ?? shaderDescriptor(id);
            if (descriptor === undefined) {
                return Promise.reject(
                    unknownShader(id, [...state().shaders.keys(), ...shaderDescriptors().map((each) => each.id)]),
                );
            }

            // A supplied picture is the picture: fetched once, never drawn. Only the page's own
            // shaders supply one; a project's text is drawn, so text that arrived in a file never
            // makes the page fetch a URL it names.
            if (project === undefined && descriptor.thumbnail !== undefined) {
                return cached(`url\u0000${descriptor.thumbnail}`, () =>
                    suppliedPicture(descriptor.thumbnail as string),
                );
            }

            // Held, failed, or off for a reason other than the frame guard's (quarantined, or a body
            // this renderer cannot run): its code is not run for a picture either.
            const status = project === undefined ? catalogStatus(descriptor) : statusOf(project);
            const refused =
                status.state === "held" ||
                status.state === "failed" ||
                (status.state === "off" && status.problem?.code !== "shader.guard-off");
            if (refused) {
                return Promise.resolve(status.problem ?? { code: "shader.held", params: { id } });
            }

            const drawer = host;
            if (drawer === null) {
                return Promise.resolve({ code: "shader.no-canvas", params: { id } });
            }

            return drawnFor(id, project).then((drawn) => picture(drawer, id, drawn, descriptor, params));
        },
    };

    /**
     * A shader's still picture drawn in the host's engine, at its preview's values and time, cached.
     * @param drawer - The host.
     * @param id - The shader.
     * @param drawn - Its text, read.
     * @param descriptor - Its descriptor, for the preview.
     * @param params - Values over the preview's.
     * @returns The picture.
     */
    const picture = (
        drawer: ShaderHost,
        id: string,
        drawn: ReadText,
        descriptor: ShaderDescriptor,
        params: ShaderParams,
    ): Promise<Blob> => {
        const values = { ...descriptor.preview?.params, ...params };
        const time = descriptor.preview?.time ?? THUMBNAIL_TIME;
        const key = [drawn.hash, SHADER_THUMBNAIL_SIZE, drawer.theme ?? "", time, stableJson(values)].join("\u0000");
        return cached(key, () =>
            drawer.thumbnail(
                { id, hash: drawn.hash, registration: drawn.registration, bodyLine: drawn.bodyLine },
                values,
                time,
            ),
        ) as Promise<Blob>;
    };

    /**
     * A thumbnail from the cache, or made once and kept; one that fails is forgotten, so asking
     * again tries again.
     * @param key - What it shows.
     * @param make - Makes it.
     * @returns The thumbnail.
     */
    const cached = (key: string, make: () => Promise<Blob | ShaderProblem>): Promise<Blob | ShaderProblem> => {
        let made = thumbnails.get(key);
        if (made === undefined) {
            made = make();
            thumbnails.set(key, made);
            made.catch(() => thumbnails.delete(key));
        }

        return made;
    };

    /**
     * The shader a thumbnail draws: a project shader as the project holds it; a preset or a
     * registered shader read from its text under its own `user/` id, since a bare preset id is not
     * one a text may take and the picture does not depend on the id.
     * @param id - The shader.
     * @param project - It, when the project holds it.
     * @returns It, read.
     */
    const drawnFor = async (id: string, project: ReadText | undefined): Promise<ReadText> => {
        if (project !== undefined) {
            return project;
        }

        const read = readText(await api.source(id, { duplicate: true }));
        if (Array.isArray(read)) {
            throw unknownShader(id, []);
        }

        return read as ReadText;
    };

    const controller: ShadersController = {
        api,
        attach(next) {
            stopLost?.();
            stopLost = null;
            if (host !== next) {
                host?.dispose();
            }

            host = next;
            compiled.clear();
            if (next !== null) {
                next.configure(renderSettingsOf(settings));
                const stopRender = next.onRender((change) => {
                    if (change !== null) {
                        publish("render:quality", change);
                    }

                    refresh();
                });
                const stopLostOnly = next.onLost((hashes) => {
                    // Every shader drawn when the GPU was lost is turned off, whatever its origin:
                    // a preset can hang a driver as surely as a pasted text. A project shader comes
                    // back with `approve`; a preset or a registered shader with the next page.
                    for (const hash of hashes) {
                        quarantined.add(hash);
                    }

                    // The context comes back without any compiled program.
                    compiled.clear();
                    refresh();
                });
                stopLost = (): void => {
                    stopRender();
                    stopLostOnly();
                };
            }

            refresh();
        },
        configure(next) {
            settings = Object.freeze({
                ...next,
                ...(next.trustedHashes === undefined ? {} : { trustedHashes: Object.freeze([...next.trustedHashes]) }),
            });
            host?.configure(renderSettingsOf(settings));
            refresh();
        },
        get settings() {
            return settings;
        },
        get renderQuality() {
            if (host !== null) {
                return host.quality;
            }

            const motion = settings.motion === "off" ? "still" : "on";
            return Object.freeze({ level: qualityOf(settings), motion, heavy: "on" });
        },
        get host() {
            return host;
        },
        onRisk(hook) {
            riskHook = hook;
        },
        async drawable(id) {
            const project = projectShader(id);
            if (project !== undefined) {
                const { state: now } = statusOf(project);
                return now === "ready" || now === "still"
                    ? {
                          id,
                          hash: project.hash,
                          // The described descriptor: the parsed one leaves out the defaults the
                          // catalog fills in (the places a use may move it to), and the drawing
                          // refuses a place its shader does not list.
                          registration: { ...project.registration, descriptor: project.descriptor },
                          bodyLine: project.bodyLine,
                          heavy: project.descriptor.cost === "heavy",
                      }
                    : null;
            }

            const known = shaderDescriptor(id);
            if (known === undefined || (known.webgpu === "none" && host?.renderer === "webgpu")) {
                return null;
            }

            const source = await loadShaderSource(id)?.catch(() => undefined);
            // A loaded body fills in what its registration left out, so read the descriptor again.
            const descriptor = shaderDescriptor(id);
            if (source === undefined || descriptor === undefined) {
                return null;
            }

            const { glsl, lowDetail } = source;
            const hash = sha256Hex(`${id}\n${glsl}`);
            catalogHashes.set(id, hash);
            const now = catalogStatus(descriptor);
            // Recorded as published, so the first refresh after it does not announce it again.
            if (!published.has(id)) {
                published.set(id, JSON.stringify(now));
            }

            if (now.state === "off" || now.state === "failed") {
                return null;
            }

            return {
                id,
                hash,
                registration: { descriptor, glsl, ...(lowDetail === undefined ? {} : { lowDetail }) },
                bodyLine: 1,
                heavy: descriptor.cost === "heavy",
            };
        },
        descriptors() {
            return [...state().shaders.keys()].flatMap((id) => {
                const descriptor = projectShader(id)?.descriptor;
                return descriptor === undefined ? [] : [descriptor];
            });
        },
        dispose() {
            stopCatalog();
            stopLost?.();
            host?.dispose();
            host = null;
        },
    };

    return controller;
}

/**
 * A value as JSON with its keys sorted, so two equal parameter sets key one cache entry.
 * @param values - The values.
 * @returns The JSON.
 */
function stableJson(values: ShaderParams): string {
    return JSON.stringify(
        Object.keys(values)
            .sort((a, b) => a.localeCompare(b))
            .map((key) => [key, values[key]]),
    );
}

/**
 * A picture a shader supplied, fetched.
 * @param url - Its URL.
 * @returns The picture.
 */
async function suppliedPicture(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new GraphtyError({
            code: "E_FETCH_FAILED",
            message: `The shader's thumbnail at ${url} could not be fetched (${String(response.status)}).`,
            source: "style",
            details: { url, status: response.status },
        });
    }

    return response.blob();
}

/**
 * The settings the host draws by.
 * @param settings - The reader's settings.
 * @returns The quality with `"auto"` resolved, the motion and whether the guard runs.
 */
function renderSettingsOf(settings: ShaderSettings): HostRenderSettings {
    return { quality: qualityOf(settings), motion: settings.motion ?? "system", guard: settings.guard !== false };
}

/**
 * The quality level `Q()` reads, from the settings.
 * @param settings - The settings.
 * @returns The level.
 */
function qualityOf(settings: ShaderSettings): RenderQuality["level"] {
    const quality = settings.quality ?? "auto";
    if (quality !== "auto") {
        return quality;
    }

    // ponytail: "auto" is medium on a touch device and high elsewhere; the frame guard refines it.
    const touch = (globalThis as { navigator?: { maxTouchPoints?: number } }).navigator?.maxTouchPoints ?? 0;
    return touch > 0 ? "medium" : "high";
}

/**
 * The body of a preset or a registered shader, loaded on first use.
 * @param id - The shader.
 * @returns Its body, or undefined when it is neither, or its body does not load or check.
 */
async function bodyOf(id: string): Promise<string | undefined> {
    if (!isRegisteredShader(id)) {
        return undefined;
    }

    return (await loadShaderSource(id)?.catch(() => undefined))?.glsl;
}

/**
 * The place a project shader was added for, so a replacement text keeps it.
 * @param descriptor - The shader's descriptor, if the project holds it.
 * @returns Its target and place, or undefined.
 */
function placeOf(descriptor: ShaderDescriptor | undefined): ShaderTextOptions | undefined {
    return descriptor === undefined ? undefined : { target: descriptor.target, place: descriptor.place };
}

/**
 * The refusal for a shader id nothing holds.
 * @param id - The id.
 * @param known - The ids that would have been right.
 * @returns The error.
 */
function unknownShader(id: string, known: readonly string[]): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_SHADER",
        message: `There is no shader called "${id}" here.`,
        source: "style",
        details: { id, candidates: known },
    });
}

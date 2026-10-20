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
    registeredShaderSource,
    shaderDescriptor,
    shaderDescriptors,
} from "../catalog/shaderRegistry";
import type {
    ShaderDescriptor,
    ShaderKind,
    ShaderParams,
    ShaderProblem,
    ShaderRegistration,
    ShaderText,
} from "../catalog/shaders";
import { formatShaderText, parseShaderText, SHADER_TEXT_MAGIC } from "../catalog/shaderText";
import type { LayerId, LayerSpec } from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import { sha256Hex } from "../utils/sha256";
import type { Dispatcher } from "./project/Dispatcher";
import type { ProjectState } from "./project/state";
import { type SessionStylesApi, setShaderTrust } from "./styles/StylesApi";
import type { SessionEventMap } from "./types";

/** The most shaders one project holds. */
export const PROJECT_SHADER_LIMIT = 64;

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
    /** Why it is failed, held, off or still. */
    readonly problem?: ShaderProblem;
}

/** One shader of the open project. @since 3.36.0 */
export interface ProjectShader {
    /** Its namespaced id. */
    readonly id: string;
    /** Catalog data: its name. */
    readonly plainName: string;
    /** What it draws on. */
    readonly kind: ShaderKind;
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
    /** The kind, for text whose header does not say (a header-less body). */
    readonly kind?: ShaderKind;
    /** When the header's id is taken: refuse (the default) or add under the next free id. */
    readonly onTaken?: "refuse" | "rename";
    /** Also write the shader to this layer, as its surface or an added effect, in the same undoable step. */
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
     * @param options - Who supplied it, its kind, what to do when its id is taken, where to apply it.
     * @returns The shader, or every problem found.
     */
    add(text: ShaderText, options?: ShaderAddOptions): Promise<ShaderAddResult>;
    /**
     * Check shader text without writing anything; compile and test it only when asked.
     * @param text - The shader text.
     * @param options - Its kind, and whether to compile it on the canvas.
     * @param options.kind - The kind of a header-less body.
     * @param options.compile - Also compile it and run its test frame on the canvas.
     * @returns What the checks found.
     */
    check(
        text: ShaderText,
        options?: { readonly kind?: ShaderKind; readonly compile?: boolean },
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
     * A shader's text, presets and registered shaders too (their id given the `user/` namespace,
     * so the text can be pasted back as a copy).
     * @param id - Any shader the catalog lists.
     * @returns The text.
     */
    source(id: string): Promise<ShaderText>;
    /** @returns The project's shaders, in the order they were added. */
    list(): readonly ProjectShader[];
    /**
     * @param id - Any shader the catalog lists.
     * @returns Whether it draws now, and if not, why.
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
     * A still picture of the shader on a sample node, edge or patch, drawn in this element's
     * engine. Refused with `E_UNSUPPORTED` with no canvas, or for a held shader.
     * @param id - Any shader the catalog lists.
     * @param params - Parameter values over its defaults.
     * @returns A PNG.
     */
    thumbnail(id: string, params?: ShaderParams): Promise<Blob>;
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

/** One shader entry handed to the host to compile, test or draw. */
export interface HostShader {
    /** The shader's id. */
    readonly id: string;
    /** The SHA-256 of its text. */
    readonly hash: string;
    /** Its registration: the descriptor and the GLSL body. */
    readonly registration: ShaderRegistration;
    /** The 1-based line of the text its body starts on, so a driver's line maps back. */
    readonly bodyLine: number;
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
     * Draw a still picture of a shader.
     * @param shader - The shader.
     * @param params - Parameter values over its defaults.
     * @returns A PNG.
     */
    thumbnail(shader: HostShader, params: ShaderParams): Promise<Blob>;
    /** The quality level `Q()` reads, chosen from the settings. */
    setQuality(level: "low" | "medium" | "high"): void;
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
    readonly publish: <K extends "shader:status" | "shader:held" | "shader:approved">(
        event: K,
        detail: SessionEventMap[K],
    ) => void;
}

/** What a text read into: the registration, its hash, where its body starts, its descriptor. */
interface ReadText {
    /**
     * The text the project stores: the text as given, or -- for a header-less body, or one given
     * another id -- the same shader written with its header, so it reads back alone.
     */
    readonly text: string;
    readonly registration: ShaderRegistration;
    readonly hash: string;
    readonly bodyLine: number;
    readonly descriptor: ShaderDescriptor;
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
        if (text.charCodeAt(index) === 10) {
            line++;
        }
    }

    return line;
}

/**
 * Every shader id a layer names: its surfaces, its effects and its boundary.
 * @param spec - The layer.
 * @returns The ids.
 */
function idsNamedBy(spec: LayerSpec): Set<string> {
    const ids = new Set<string>();
    const set = (spec.set ?? {}) as Record<string, unknown>;
    for (const channel of ["node.shader", "edge.shader"]) {
        if (typeof set[channel] === "string") {
            ids.add(set[channel]);
        }
    }

    for (const channel of ["node.effects", "edge.effects", "node.shaderParams", "edge.shaderParams"]) {
        const map = set[channel];
        if (typeof map === "object" && map !== null) {
            for (const [id, value] of Object.entries(map)) {
                if (value !== false) {
                    ids.add(id);
                }
            }
        }
    }

    if (spec.boundary !== undefined) {
        ids.add(spec.boundary.shader);
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
 * The patch that writes a shader to a layer: its surface, an added effect, or its boundary.
 * @param spec - The layer.
 * @param descriptor - The shader.
 * @returns The patch.
 * @throws A `GraphtyError` with `E_SHADER_KIND` for a background, which no layer draws.
 */
function applyPatch(spec: LayerSpec, descriptor: ShaderDescriptor): Partial<LayerSpec> {
    const set = { ...(spec.set ?? {}) } as Record<string, unknown>;
    switch (descriptor.kind) {
        case "node-surface":
        case "node-sprite":
            set["node.shader"] = descriptor.id;
            break;
        case "edge-surface":
            set["edge.shader"] = descriptor.id;
            break;
        case "node-effect":
        case "edge-effect": {
            const channel = descriptor.kind === "node-effect" ? "node.effects" : "edge.effects";
            const effects = Object.assign(Object.create(null) as Record<string, unknown>, set[channel]);
            effects[descriptor.id] = true;
            set[channel] = effects;
            break;
        }
        case "boundary":
            return { boundary: { shader: descriptor.id } };
        default:
            throw new GraphtyError({
                code: "E_SHADER_KIND",
                message: `"${descriptor.id}" is a ${descriptor.kind} shader, which no style layer draws.`,
                source: "style",
                details: { id: descriptor.id, kind: descriptor.kind, expected: ["node-surface", "node-sprite"] },
            });
    }

    return { set: set };
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
function renamed(registration: ShaderRegistration, id: string): ShaderRegistration {
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

    let host: ShaderHost | null = null;
    let stopLost: (() => void) | null = null;
    let settings: ShaderSettings = {};
    let riskHook: (() => Promise<void>) | null = null;

    /**
     * Read a text: parse, hash, describe. Cached by text.
     * @param text - The text.
     * @param kind - The kind of a header-less body.
     * @param id - An id to give it in place of its header's.
     * @returns What it read into, or the problems.
     */
    const readText = (text: string, kind?: ShaderKind, id?: string): ReadText | readonly ShaderProblem[] => {
        const key = `${kind ?? ""}\u0000${id ?? ""}\u0000${text}`;
        const cached = read.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const parsed = parseShaderText(text, kind === undefined ? undefined : { kind });
        let result: ReadText | readonly ShaderProblem[];
        if (parsed.ok) {
            const registration = id === undefined ? parsed.registration : renamed(parsed.registration, id);
            const headed =
                text.includes(SHADER_TEXT_MAGIC) && registration.descriptor.id === parsed.registration.descriptor.id;
            const stored = headed ? text : formatShaderText(registration);
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
            result = parsed.problems;
        }

        read.set(key, result);
        return result;
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
            return { state: "not-checked" };
        }

        if (shader.descriptor.webgpu === "none" && host.renderer === "webgpu") {
            return { state: "off", problem: { code: "shader.webgpu-unsupported", params: {} } };
        }

        const result = compiled.get(shader.hash);
        if (result === undefined || result instanceof Promise) {
            return { state: "compiling" };
        }

        return result === null ? { state: "ready" } : { state: "failed", problem: result };
    };

    /**
     * Bring every project shader's status up to date: start compiling the ones that may run,
     * and publish what changed.
     */
    function refresh(): void {
        const held = new Set<string>();
        const ids = new Set(state().shaders.keys());
        for (const id of ids) {
            const shader = projectShader(id);
            if (shader === undefined) {
                continue;
            }

            if (host !== null && trusted(shader.hash) && !quarantined.has(shader.hash)) {
                if (!compiled.has(shader.hash)) {
                    void compile({
                        id,
                        hash: shader.hash,
                        registration: shader.registration,
                        bodyLine: shader.bodyLine,
                    });
                }
            }

            const status = statusOf(shader);
            if (status.state === "held") {
                held.add(id);
            }

            const key = JSON.stringify(status);
            if (published.get(id) !== key) {
                published.set(id, key);
                publish("shader:status", { id, ...status });
            }
        }

        for (const id of published.keys()) {
            if (!ids.has(id)) {
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
     * Find a known shader with the same body.
     * @param shader - The new shader.
     * @returns Its id and the defaults the new one differs by, or undefined.
     */
    const sameAsOf = (shader: ReadText): { readonly id: string; readonly params: ShaderParams } | undefined => {
        for (const descriptor of shaderDescriptors()) {
            if (registeredShaderSource(descriptor.id)?.glsl === shader.registration.glsl) {
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
    const passed = (shader: ReadText): ShaderAddResult => {
        const sameAs = sameAsOf(shader);
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

        const layer = styles.get(apply);
        if (layer === undefined) {
            throw new GraphtyError({
                code: "E_UNKNOWN_LAYER",
                message: `There is no style layer with the id "${apply}".`,
                source: "style",
                target: { kind: "layer", id: apply },
                details: { id: apply },
            });
        }

        const patch = applyPatch(layer, shader.descriptor);
        await dispatcher.transaction(
            `Add the shader ${id}`,
            async (tx) => {
                await tx.dispatch({ op: "shader.set", id, text });
                await tx.dispatch({ op: "style.patch", action: "update", id: apply, patch });
            },
            { fact: { code: "shader.add", params: { id, layer: apply } } },
        );
    };

    const api: SessionShaders = {
        add(text, options = {}) {
            if (state().shaders.size >= PROJECT_SHADER_LIMIT) {
                return Promise.resolve({
                    ok: false,
                    problems: [
                        {
                            code: "shader.too-many",
                            params: { count: state().shaders.size, limit: PROJECT_SHADER_LIMIT },
                        },
                    ],
                });
            }

            const first = readText(text, options.kind);
            if (Array.isArray(first)) {
                return Promise.resolve({ ok: false, problems: first as readonly ShaderProblem[] });
            }

            let shader = first as ReadText;
            const wanted = shader.descriptor.id;
            if (taken(wanted, shader.text)) {
                const free = freeId(wanted, (candidate) => taken(candidate));
                if (options.onTaken !== "rename") {
                    return Promise.resolve({
                        ok: false,
                        problems: [{ code: "shader.id-taken", params: { id: wanted, free } }],
                    });
                }

                shader = readText(text, options.kind, free) as ReadText;
            }

            const content = options.source === "content";
            if (content && settings.untrusted === "refuse" && !trusted(shader.hash)) {
                return Promise.resolve({
                    ok: false,
                    problems: [{ code: "shader.held", params: { id: shader.descriptor.id } }],
                });
            }

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
        },

        async check(text, options = {}) {
            const result = readText(text, options.kind);
            if (Array.isArray(result)) {
                return { ok: false, problems: result as readonly ShaderProblem[] };
            }

            const shader = result as ReadText;
            if (options.compile === true) {
                const problem = await fullCheck(shader, !trusted(shader.hash));
                if (problem !== null) {
                    return { ok: false, problems: [problem] };
                }
            }

            return passed(shader);
        },

        async replace(id, text) {
            if (!state().shaders.has(id)) {
                throw unknownShader(id, [...state().shaders.keys()]);
            }

            const result = readText(text, projectShader(id)?.descriptor.kind, id);
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

        async source(id) {
            const entry = state().shaders.get(id);
            if (entry !== undefined) {
                return entry.text;
            }

            const descriptor = shaderDescriptor(id);
            const body = registeredShaderSource(id)?.glsl ?? (await presetBody(id));
            if (descriptor === undefined || body === undefined) {
                throw unknownShader(id, [...state().shaders.keys(), ...shaderDescriptors().map((each) => each.id)]);
            }

            const name = id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
            const { origin: _origin, hash: _hash, thumbnail: _thumbnail, ...facts } = descriptor;
            return formatShaderText({ descriptor: { ...facts, id: `user/${name}` }, glsl: body });
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
                            kind: shader.descriptor.kind,
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

            if (shaderDescriptor(id) === undefined) {
                return { state: "failed", problem: { code: "shader.unknown", params: { id } } };
            }

            return { state: host === null ? "not-checked" : "ready" };
        },

        availability(id) {
            const descriptor = shaderDescriptor(id);
            if (descriptor === undefined) {
                return { ok: false, problem: { code: "shader.unknown", params: { id } } };
            }

            if (descriptor.webgpu === "none" && host?.renderer === "webgpu") {
                return { ok: false, problem: { code: "shader.webgpu-unsupported", params: {} } };
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

        async thumbnail(id, params = {}) {
            if (host === null) {
                throw new GraphtyError({
                    code: "E_UNSUPPORTED",
                    message: "A shader's thumbnail is drawn on the element's canvas, and this session has none.",
                    source: "style",
                    details: { id, reason: "no-canvas" },
                });
            }

            const shader = projectShader(id);
            if (shader !== undefined && !trusted(shader.hash)) {
                throw new GraphtyError({
                    code: "E_UNSUPPORTED",
                    message: `The shader "${id}" is held, so it is not drawn until it is approved.`,
                    source: "style",
                    details: { id, code: "shader.held" },
                });
            }

            const text = shader === undefined ? await api.source(id) : undefined;
            const drawn = shader ?? (text === undefined ? undefined : (readText(text, undefined, id) as ReadText));
            if (drawn === undefined || Array.isArray(drawn)) {
                throw unknownShader(id, []);
            }

            return host.thumbnail(
                { id, hash: drawn.hash, registration: drawn.registration, bodyLine: drawn.bodyLine },
                params,
            );
        },
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
                next.setQuality(qualityOf(settings));
                stopLost = next.onLost((hashes) => {
                    // Only pasted texts are quarantined: presets and registered shaders are the
                    // page's own code, and turning them off would not make the page safer.
                    const pasted = new Set([...state().shaders.keys()].map((id) => projectShader(id)?.hash));
                    for (const hash of hashes) {
                        if (pasted.has(hash)) {
                            quarantined.add(hash);
                        }
                    }

                    // The context comes back without any compiled program.
                    compiled.clear();
                    refresh();
                });
            }

            refresh();
        },
        configure(next) {
            settings = Object.freeze({
                ...next,
                ...(next.trustedHashes === undefined ? {} : { trustedHashes: Object.freeze([...next.trustedHashes]) }),
            });
            host?.setQuality(qualityOf(settings));
            refresh();
        },
        get settings() {
            return settings;
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
                return statusOf(project).state === "ready"
                    ? { id, hash: project.hash, registration: project.registration, bodyLine: project.bodyLine }
                    : null;
            }

            const descriptor = shaderDescriptor(id);
            if (descriptor === undefined || (descriptor.webgpu === "none" && host?.renderer === "webgpu")) {
                return null;
            }

            const glsl = registeredShaderSource(id)?.glsl ?? (await presetBody(id));
            if (glsl === undefined) {
                return null;
            }

            return { id, hash: sha256Hex(`${id}\n${glsl}`), registration: { descriptor, glsl }, bodyLine: 1 };
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
 * The quality level `Q()` reads, from the settings.
 * @param settings - The settings.
 * @returns The level.
 */
function qualityOf(settings: ShaderSettings): "low" | "medium" | "high" {
    const quality = settings.quality ?? "auto";
    if (quality !== "auto") {
        return quality;
    }

    // ponytail: "auto" is medium on a touch device and high elsewhere; the frame guard refines it.
    const touch = (globalThis as { navigator?: { maxTouchPoints?: number } }).navigator?.maxTouchPoints ?? 0;
    return touch > 0 ? "medium" : "high";
}

/**
 * A preset's GLSL body, loaded on first use.
 * @param id - The preset.
 * @returns Its body, or undefined when no preset has that id.
 */
async function presetBody(id: string): Promise<string | undefined> {
    const { SHADER_PRESET_BODIES } = await import("../shaders/presets/bodies");
    return Object.hasOwn(SHADER_PRESET_BODIES, id) ? SHADER_PRESET_BODIES[id]() : undefined;
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

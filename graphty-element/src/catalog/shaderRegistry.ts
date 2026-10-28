/**
 * @file The shaders the element can draw: its presets, and the ones registered through the API.
 *
 * `registerShader` checks a registration exactly as shader text is checked (the same descriptor
 * rules and the same static body rules, `./shaderText` and `./shaderGlsl`), so a registered shader
 * can do exactly what a preset does and nothing a pasted shader may not. A registered shader is
 * trusted code -- the page's author wrote it -- and is never held for approval.
 *
 * The element's presets are registered through the same checks, at catalog load, with their bodies
 * as loaders, so the catalog loads no GLSL. A bare id (`"glass-marble"`) is reserved for them, so a
 * future preset never collides with a consumer's shader: everyone else's id is
 * `"<namespace>/<name>"`, and an id the element ships can never be registered over.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError } from "../errors";
import { SHADER_PRESETS } from "../shaders/presets";
import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { checkShaderBody, inferShaderReads, readsShaderTime } from "./shaderGlsl";
import {
    defaultPlaces,
    drawingOf,
    motionOf,
    type ShaderCost,
    type ShaderDescriptor,
    type ShaderParamDescriptor,
    type ShaderProblem,
    type ShaderRegistration,
    type ShaderSource,
    type ShaderTarget,
} from "./shaders";
import { readShaderDescriptor, settleShaderPlace } from "./shaderText";

/** A shader's bodies, loaded. */
export interface LoadedShaderSource {
    readonly glsl: string;
    readonly wgsl?: string;
    readonly lowDetail?: string;
}

/** A registered shader: its descriptor and the bodies the renderer compiles. */
interface RegisteredShader {
    /** The descriptor; a loader's facts left to the body are filled in once it loads. */
    descriptor: ShaderDescriptor;
    readonly glsl: ShaderSource;
    readonly wgsl?: string;
    readonly lowDetail?: ShaderSource;
    /** What the registration gave, so a loaded body fills in only what it left out. */
    readonly given: { readonly cost: boolean; readonly reads: boolean; readonly motion: boolean };
    /** The bodies, once loaded and checked. */
    loaded?: Promise<LoadedShaderSource>;
    /** The same bodies, once that promise has settled, for callers that cannot wait. */
    ready?: LoadedShaderSource;
    /** Why a loaded body was refused, once it was. */
    failed?: ShaderProblem;
}

/** The element's own shaders, by id: registered through the same checks, at catalog load. */
const builtIns = new Map<string, RegisteredShader>();

/** Bumped whenever a loaded body fills in a descriptor, so the catalog's list is rebuilt. */
let generation = 0;

const registry = createPluginRegistry<RegisteredShader, ShaderDescriptor>({
    kind: "shader",
    idOf: (entry) => entry.descriptor.id,
    descriptorOf: (entry) => entry.descriptor,
    implementationOf: (entry) =>
        JSON.stringify([entry.descriptor, String(entry.glsl), entry.wgsl, String(entry.lowDetail)]),
    builtInIds: () => [...builtIns.keys()],
});

/**
 * Refuse a registration, naming the member at fault and carrying the problems.
 * @param id - The shader being registered.
 * @param field - The member at fault.
 * @param problems - The problems, as codes.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`.
 */
function refuse(id: unknown, field: string, problems: readonly ShaderProblem[]): never {
    const name = typeof id === "string" ? id : "";
    throw new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `The shader "${name}" was refused at ${field}: ${problems.map((problem) => problem.code).join(", ")}.`,
        source: "registry",
        // The first problem's code and values also sit at the top, so one check reads them.
        details: { kind: "shader", name, field, problems, ...firstProblem(problems) },
    });
}

/**
 * The first of some problems, as `{ code, params }`, or nothing.
 * @param problems - The problems.
 * @returns Its code and values.
 */
export function firstProblem(problems: readonly ShaderProblem[]): Partial<ShaderProblem> {
    return problems.length === 0 ? {} : { code: problems[0].code, params: problems[0].params };
}

/**
 * The member of a registration a problem points at.
 * @param problem - The problem.
 * @returns The member: a descriptor field, or `glsl`.
 */
function fieldOf(problem: ShaderProblem): string {
    if (problem.code === "shader.header-key") {
        return `descriptor.${String(problem.params.key)}`;
    }

    if (problem.code === "shader.param-invalid") {
        return `descriptor.params.${String(problem.params.param)}.${String(problem.params.field)}`;
    }

    if (problem.code === "shader.reserved" && problem.params.param !== undefined) {
        return `descriptor.params.${String(problem.params.param)}.name`;
    }

    if (problem.code === "shader.id-invalid") {
        return "descriptor.id";
    }

    if (problem.code === "shader.too-many-params") {
        return "descriptor.params";
    }

    if (problem.code === "shader.place-unsupported") {
        return "descriptor.place";
    }

    if (problem.code === "shader.min-size-place") {
        return "descriptor.minSize";
    }

    return problem.code === "shader.target-mismatch" ? "descriptor.target" : "glsl";
}

/**
 * Refuse a native WebGPU shader with no WGSL body.
 * @param id - The shader's id.
 * @param native - Whether it says its WebGPU form is native.
 * @param wgsl - Its WGSL body.
 */
function checkBackendFacts(id: unknown, native: boolean, wgsl: unknown): void {
    if (native && typeof wgsl !== "string") {
        refuse(id, "wgsl", [{ code: "shader.header-key", params: { key: "webgpu" } }]);
    }
}

/**
 * Check one body, refusing it at its member.
 * @param id - The shader's id.
 * @param field - `glsl` or `lowDetail`.
 * @param body - The body.
 * @param descriptor - The shader's target and place.
 * @returns The checker's cost class.
 */
function checkBody(
    id: string,
    field: "glsl" | "lowDetail",
    body: unknown,
    descriptor: Pick<ShaderDescriptor, "target" | "place">,
): ShaderCost {
    if (typeof body !== "string") {
        refuse(id, field, [{ code: "shader.entry-missing", params: { target: descriptor.target, expected: "shade" } }]);
    }

    const checked = checkShaderBody(body, drawingOf(descriptor));
    if (checked.problems.length > 0) {
        refuse(id, field, checked.problems);
    }

    return checked.costClass;
}

/**
 * Whether a member is a body or a loader of one.
 * @param source - The member.
 * @returns True when it is.
 */
function isSource(source: unknown): source is ShaderSource {
    return typeof source === "string" || typeof source === "function";
}

/**
 * The facts the catalog lists that a registration may leave out: the places a use may draw at,
 * and the `minSize` parameter a declared minimum size adds.
 * @param descriptor - The settled descriptor.
 * @returns It, with those facts filled in.
 */
function catalogFacts<T extends Pick<ShaderDescriptor, "place" | "places" | "minSize" | "params">>(descriptor: T): T {
    const { place, places, minSize, params } = descriptor;
    const minSizeParam: ShaderParamDescriptor = {
        name: "minSize",
        plainName: "Minimum size",
        type: "number",
        default: minSize,
        min: 0,
        max: 512,
    };
    const sized = minSize !== undefined && !params.some((param) => param.name === "minSize");

    return {
        ...descriptor,
        ...(place === undefined || places !== undefined ? {} : { places: defaultPlaces(place) }),
        ...(sized ? { params: [...params, minSizeParam] } : {}),
    };
}

/**
 * Check a registration and build the descriptor the catalog lists. A body given as a string is
 * checked now; a loader's body is checked when it loads ({@link loadShaderSource}).
 * @param registration - The shader.
 * @param origin - Whose it is.
 * @param namespaced - Whether its id must carry a namespace.
 * @returns The descriptor and its bodies.
 */
function admit(
    registration: ShaderRegistration,
    origin: ShaderDescriptor["origin"],
    namespaced: boolean,
): RegisteredShader {
    if (typeof registration !== "object" || typeof registration.descriptor !== "object") {
        refuse("", "descriptor", [{ code: "shader.header-key", params: { key: "descriptor" } }]);
    }

    const { descriptor: given, glsl, wgsl, lowDetail } = registration;
    const { webgpu, ...facts } = given;
    const native = webgpu === "native";
    checkBackendFacts(given.id, native, wgsl);

    const read = readShaderDescriptor(
        { ...facts, ...(native || webgpu === undefined ? {} : { webgpu }) },
        "plainName",
        namespaced,
    );
    if (Array.isArray(read)) {
        refuse(given.id, fieldOf(read[0]), read);
    }

    if (!isSource(glsl)) {
        refuse(given.id, "glsl", [{ code: "shader.entry-missing", params: { expected: "shade" } }]);
    }

    if (typeof glsl === "function" && read.target === undefined) {
        refuse(given.id, "descriptor.target", [{ code: "shader.header-key", params: { key: "target" } }]);
    }

    if (lowDetail !== undefined && !isSource(lowDetail)) {
        refuse(given.id, "lowDetail", [{ code: "shader.entry-missing", params: { expected: "shade" } }]);
    }

    const settled = settleShaderPlace(read, typeof glsl === "string" ? glsl : undefined);
    if (Array.isArray(settled)) {
        refuse(given.id, fieldOf(settled[0]), settled);
    }

    const ready = typeof glsl === "string";
    const costClass = ready ? checkBody(settled.id, "glsl", glsl, settled) : "heavy";
    if (typeof lowDetail === "string") {
        checkBody(settled.id, "lowDetail", lowDetail, settled);
    }

    const inferredMotion = ready && readsShaderTime(glsl) ? "loop" : "still";
    const descriptor: ShaderDescriptor = Object.freeze({
        ...catalogFacts(settled),
        motion: motionOf(given.motion ?? inferredMotion),
        reads: given.reads ?? (ready ? inferShaderReads(glsl) : []),
        cost: given.cost ?? costClass,
        webgpu: webgpu ?? (wgsl === undefined ? "translate" : "native"),
        origin,
    });

    return {
        descriptor,
        glsl,
        ...(wgsl === undefined ? {} : { wgsl }),
        ...(lowDetail === undefined ? {} : { lowDetail }),
        given: { cost: given.cost !== undefined, reads: given.reads !== undefined, motion: given.motion !== undefined },
    };
}

/**
 * Register a shader so a style layer can name it, and the catalog lists it.
 *
 * The descriptor and the body are checked as shader text is (design/rendering/shader-styles.md
 * section 4.3); what is left out is filled in: the target from the body's entry function, the place
 * (`"paint"` on a node or edge, `"group"` for a group outline) and the places a use may move it to,
 * the `minSize` parameter a declared minimum size adds, the cost from the static checker, the
 * inputs from the fields the body reads, the motion (`"loop"` when the body reads its input's
 * `time`), and `webgpu` as `"translate"`.
 *
 * `glsl` and `lowDetail` may each be a function that loads the body: the shader is listed at
 * once, and the body is loaded and checked the first time something draws it. Such a
 * registration gives its `target`.
 * @param registration - The shader: its catalog facts and its GLSL body.
 * @param options - Whether a different shader under a taken id throws instead of replacing it.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the member at fault (`details.problems`
 *   holds every problem as a code), or `E_DUPLICATE_PLUGIN` for an id the element ships.
 * @since 3.36.0
 */
export function registerShader(registration: ShaderRegistration, options?: RegisterOptions): void {
    const id = (registration as Partial<ShaderRegistration> | undefined)?.descriptor?.id;
    if (typeof id === "string" && builtIns.has(id)) {
        throw new GraphtyError({
            code: "E_DUPLICATE_PLUGIN",
            message:
                `"${id}" is the id of a shader the element ships, and a built-in id may not be taken: ` +
                "a saved document that named it yesterday has to mean the same thing today",
            source: "registry",
            details: { kind: "shader", name: id, builtIn: true },
        });
    }

    registry.register(admit(registration, "registered", true), options);
}

/**
 * Register one of the element's own shaders: the same checks a registration takes, with a bare id
 * and origin `"element"`. Its id can never be registered over.
 * @param registration - The preset.
 */
function registerBuiltIn(registration: ShaderRegistration): void {
    const entry = admit(registration, "element", false);
    builtIns.set(entry.descriptor.id, entry);
}

// The bodies module is imported only when a body is first loaded, so listing the catalog loads no
// GLSL. Every heavy node paint ships a low-detail body (test/shaders/catalog-fixture.test.ts).
for (const preset of SHADER_PRESETS) {
    const { origin: _origin, ...descriptor } = preset;
    const { id } = preset;
    const far = preset.cost === "heavy" && drawingOf(preset) === "node-paint";
    registerBuiltIn({
        descriptor,
        glsl: async () => (await import("../shaders/presets/bodies")).SHADER_PRESET_BODIES[id](),
        ...(far
            ? { lowDetail: async () => (await import("../shaders/presets/bodies")).SHADER_PRESET_LOW_DETAIL[id]() }
            : {}),
    });
}

/**
 * Load a member that may be a loader.
 * @param source - The body or its loader.
 * @returns The body.
 */
async function loadOne(source: ShaderSource): Promise<string> {
    return typeof source === "string" ? source : await source();
}

/**
 * Load and check a shader's bodies, and fill in what its descriptor left to them.
 * @param entry - The shader.
 * @returns The bodies.
 */
async function loadEntry(entry: RegisteredShader): Promise<LoadedShaderSource> {
    const glsl = await loadOne(entry.glsl);
    const lowDetail = entry.lowDetail === undefined ? undefined : await loadOne(entry.lowDetail);
    const { descriptor } = entry;
    if (typeof entry.glsl === "function") {
        const settled = settleShaderPlace(descriptor, glsl);
        if (Array.isArray(settled)) {
            refuse(descriptor.id, fieldOf(settled[0]), settled);
        }

        const cost = checkBody(descriptor.id, "glsl", glsl, descriptor);
        entry.descriptor = Object.freeze({
            ...descriptor,
            ...(entry.given.cost ? {} : { cost }),
            ...(entry.given.reads ? {} : { reads: inferShaderReads(glsl) }),
            ...(entry.given.motion || !readsShaderTime(glsl) ? {} : { motion: motionOf("loop") }),
        });
        generation++;
    }

    if (typeof entry.lowDetail === "function") {
        checkBody(descriptor.id, "lowDetail", lowDetail, descriptor);
    }

    entry.ready = {
        glsl,
        ...(entry.wgsl === undefined ? {} : { wgsl: entry.wgsl }),
        ...(lowDetail === undefined ? {} : { lowDetail }),
    };
    return entry.ready;
}

/**
 * A shader's bodies, for the renderer: the element's own or a registered one's, loaded on first
 * use and checked when they came from a loader.
 * @param id - The id.
 * @returns The bodies, or undefined when no preset or registration has that id.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when a loaded body does not pass the checks.
 */
export function loadShaderSource(id: string): Promise<LoadedShaderSource> | undefined {
    const entry = builtIns.get(id) ?? registry.byId(id);
    if (entry === undefined) {
        return undefined;
    }

    entry.loaded ??= loadEntry(entry).catch((error: unknown) => {
        const problems = (error as { details?: { problems?: readonly ShaderProblem[] } }).details?.problems;
        entry.failed = problems?.[0] ?? {
            code: "shader.compile",
            params: { line: 0, column: 0, message: error instanceof Error ? error.message : String(error) },
        };
        throw error;
    });
    return entry.loaded;
}

/**
 * A registered shader's bodies without waiting: given as strings, or loaded already.
 * @param id - The id.
 * @returns The bodies, or undefined when a loader has not run yet or no registration has that id.
 */
export function shaderSourceNow(id: string): LoadedShaderSource | undefined {
    const entry = builtIns.get(id) ?? registry.byId(id);
    if (entry === undefined || entry.ready !== undefined) {
        return entry?.ready;
    }

    const { glsl, lowDetail, wgsl } = entry;
    if (typeof glsl !== "string" || (lowDetail !== undefined && typeof lowDetail !== "string")) {
        return undefined;
    }

    return { glsl, ...(wgsl === undefined ? {} : { wgsl }), ...(lowDetail === undefined ? {} : { lowDetail }) };
}

/**
 * Why a registered shader's body, loaded on first use, was refused.
 * @param id - The shader.
 * @returns The first problem, or undefined while it loads, after it passed, or for another id.
 */
export function shaderLoadProblem(id: string): ShaderProblem | undefined {
    return (builtIns.get(id) ?? registry.byId(id))?.failed;
}

/**
 * Whether a shader comes from the element or a registration (not a project's pasted text).
 * @param id - The id.
 * @returns True when it does.
 */
export function isRegisteredShader(id: string): boolean {
    return builtIns.has(id) || registry.byId(id) !== undefined;
}

/**
 * Where the pasted shaders of one open project are found: the session that holds them.
 *
 * A pasted shader belongs to its project, not to the page, so the catalog asks each open
 * session for it rather than keeping it in the registry.
 */
export interface PastedShaderSource {
    /** The descriptor of one of the project's shaders, or undefined when it holds none by that id. */
    descriptor(id: string): ShaderDescriptor | undefined;
    /** The ids of the project's shaders. */
    ids(): readonly string[];
}

/** Every open session's pasted shaders. */
const pastedSources = new Set<PastedShaderSource>();

/**
 * Let the catalog find a session's pasted shaders by id.
 *
 * ponytail: one page-wide lookup over every session, first match wins. Two graphs on one page
 * holding the same pasted id with different text check a layer against whichever answered first;
 * compiled programs are keyed by the text's hash, so neither draws the other's shader. Thread the
 * session into every lookup if a page ever needs both.
 * @param source - The session's shaders.
 * @returns Stops the lookup; call it when the session is disposed.
 */
export function addPastedShaderSource(source: PastedShaderSource): () => void {
    pastedSources.add(source);

    return () => {
        pastedSources.delete(source);
    };
}

/**
 * The descriptor of a pasted shader, built exactly as a registered one is.
 * @param registration - What `parseShaderText` read from the text.
 * @param hash - The SHA-256 of the text.
 * @returns The descriptor, origin `"pasted"`.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the registration does not pass the checks.
 */
export function describePastedShader(registration: ShaderRegistration, hash: string): ShaderDescriptor {
    // A pasted text's picture is drawn from its own code, never fetched from a URL it names.
    const { thumbnail: _thumbnail, ...facts } = registration.descriptor;
    const { descriptor } = admit({ ...registration, descriptor: facts }, "pasted", true);

    return Object.freeze({ ...descriptor, hash });
}

let listed:
    | {
          readonly registered: readonly ShaderDescriptor[];
          readonly generation: number;
          readonly all: readonly ShaderDescriptor[];
      }
    | undefined;

/**
 * Every shader the element can draw: its own first, then the registered ones.
 * @returns The descriptors.
 */
export function shaderDescriptors(): readonly ShaderDescriptor[] {
    const registered = registry.descriptors();
    // The same array until a registration changes or a loaded body fills in a descriptor.
    if (listed?.registered !== registered || listed.generation !== generation) {
        const own = [...builtIns.values(), ...registry.entries()].map((entry) => entry.descriptor);
        listed = { registered, generation, all: Object.freeze(own) };
    }

    return listed.all;
}

/**
 * One shader by id.
 * @param id - The id.
 * @returns Its descriptor, or undefined when the catalog does not list it.
 */
export function shaderDescriptor(id: string): ShaderDescriptor | undefined {
    const known = builtIns.get(id)?.descriptor ?? registry.byId(id)?.descriptor;
    if (known !== undefined || !id.includes("/")) {
        return known;
    }

    for (const source of pastedSources) {
        const pasted = source.descriptor(id);
        if (pasted !== undefined) {
            return pasted;
        }
    }

    return undefined;
}

/**
 * The ids of every shader a layer's shader list of one target can use (a node list takes node and
 * group shaders), for a refusal that lists what would have been right.
 * @param target - The list's target.
 * @returns The ids.
 */
export function shaderIdsFor(target: "node" | "edge"): readonly string[] {
    const takes: readonly ShaderTarget[] = target === "node" ? ["node", "group"] : ["edge"];
    const pasted = [...pastedSources].flatMap((source) =>
        source.ids().flatMap((id) => {
            const descriptor = source.descriptor(id);
            return descriptor === undefined ? [] : [descriptor];
        }),
    );

    return [...shaderDescriptors(), ...pasted]
        .filter((descriptor) => takes.includes(descriptor.target))
        .map((descriptor) => descriptor.id);
}

/**
 * Forget every registered shader.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract.
 */
export function clearRegisteredShadersForTesting(): void {
    registry.clearForTesting();
}

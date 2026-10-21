/**
 * @file The shaders the element can draw: its presets, and the ones registered through the API.
 *
 * `registerShader` checks a registration exactly as shader text is checked (the same descriptor
 * rules and the same static body rules, `./shaderText` and `./shaderGlsl`), so a registered shader
 * can do exactly what a preset does and nothing a pasted shader may not. A registered shader is
 * trusted code -- the page's author wrote it -- and is never held for approval.
 *
 * A bare id (`"glass-marble"`) is reserved for the element's presets, so a future preset never
 * collides with a consumer's shader: everyone else's id is `"<namespace>/<name>"`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError } from "../errors";
import { SHADER_PRESETS } from "../shaders/presets";
import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { checkShaderBody, inferShaderReads } from "./shaderGlsl";
import {
    motionOf,
    type ShaderDescriptor,
    type ShaderKind,
    type ShaderProblem,
    type ShaderRegistration,
} from "./shaders";
import { readShaderDescriptor } from "./shaderText";

/** A registered shader: its descriptor and the text the renderer compiles. */
interface RegisteredShader {
    readonly descriptor: ShaderDescriptor;
    readonly glsl: string;
    readonly wgsl?: string;
    readonly lowDetail?: string;
}

const registry = createPluginRegistry<RegisteredShader, ShaderDescriptor>({
    kind: "shader",
    idOf: (entry) => entry.descriptor.id,
    descriptorOf: (entry) => entry.descriptor,
    implementationOf: (entry) => JSON.stringify([entry.descriptor, entry.glsl, entry.wgsl]),
    builtInIds: () => SHADER_PRESETS.map((preset) => preset.id),
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
        details: { kind: "shader", name, field, problems },
    });
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

    if (problem.code === "shader.id-invalid") {
        return "descriptor.id";
    }

    return problem.code === "shader.kind-unknown" || problem.code === "shader.too-many-params"
        ? "descriptor.kind"
        : "glsl";
}

/**
 * Check a registration and build the descriptor the catalog lists.
 * @param registration - The shader.
 * @param origin - Whose it is.
 * @param namespaced - Whether its id must carry a namespace.
 * @returns The descriptor and its text.
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
    const { webgpu, cost, thumbnail, ...facts } = given;
    const native = webgpu === "native";
    if ((native && typeof wgsl !== "string") || (cost !== undefined && !["light", "medium", "heavy"].includes(cost))) {
        refuse(given.id, native ? "wgsl" : "descriptor.cost", [
            { code: "shader.header-key", params: { key: native ? "webgpu" : "cost" } },
        ]);
    }

    const read = readShaderDescriptor(
        { ...facts, ...(native || webgpu === undefined ? {} : { webgpu }) },
        "plainName",
        namespaced,
    );
    if (Array.isArray(read)) {
        refuse(given.id, fieldOf(read[0]), read);
    }

    if (typeof glsl !== "string") {
        refuse(given.id, "glsl", [{ code: "shader.entry-missing", params: { kind: read.kind, expected: "shade" } }]);
    }

    const checked = checkShaderBody(glsl, read.kind);
    if (checked.problems.length > 0) {
        refuse(given.id, "glsl", checked.problems);
    }

    if (lowDetail !== undefined) {
        const cheap = typeof lowDetail === "string" ? checkShaderBody(lowDetail, read.kind).problems : null;
        if (cheap === null || cheap.length > 0) {
            refuse(
                given.id,
                "lowDetail",
                cheap ?? [{ code: "shader.entry-missing", params: { kind: read.kind, expected: "shade" } }],
            );
        }
    }

    const descriptor: ShaderDescriptor = Object.freeze({
        ...read,
        ...(typeof thumbnail === "string" ? { thumbnail } : {}),
        motion: motionOf(given.motion),
        reads: given.reads ?? inferShaderReads(glsl),
        cost: cost ?? checked.costClass,
        webgpu: webgpu ?? (wgsl === undefined ? "translate" : "native"),
        origin,
    });

    return {
        descriptor,
        glsl,
        ...(wgsl === undefined ? {} : { wgsl }),
        ...(lowDetail === undefined ? {} : { lowDetail }),
    };
}

/**
 * Register a shader so a style layer can name it, and the catalog lists it.
 *
 * The descriptor and the body are checked as shader text is (design/rendering/shader-styles.md
 * section 4.3); what is left out is filled in: the cost from the static checker, the inputs from
 * the fields the body reads, `webgpu` as `"translate"`, motion as still.
 * @param registration - The shader: its catalog facts and its GLSL body.
 * @param options - Whether a different shader under a taken id throws instead of replacing it.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the member at fault (`details.problems`
 *   holds every problem as a code), or `E_DUPLICATE_PLUGIN` for a preset's id.
 * @since 3.36.0
 */
export function registerShader(registration: ShaderRegistration, options?: RegisterOptions): void {
    registry.register(admit(registration, "registered", true), options);
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
    const { descriptor } = admit(registration, "pasted", true);

    return Object.freeze({ ...descriptor, hash });
}

let listed: { readonly registered: readonly ShaderDescriptor[]; readonly all: readonly ShaderDescriptor[] } | undefined;

/**
 * Every shader the element can draw: its presets first, then the registered ones.
 * @returns The descriptors.
 */
export function shaderDescriptors(): readonly ShaderDescriptor[] {
    const registered = registry.descriptors();
    if (SHADER_PRESETS.length === 0) {
        return registered;
    }

    // The same array until a registration changes, as the registry's own list is.
    if (listed?.registered !== registered) {
        listed = { registered, all: Object.freeze([...SHADER_PRESETS, ...registered]) };
    }

    return listed.all;
}

/**
 * One shader by id.
 * @param id - The id.
 * @returns Its descriptor, or undefined when the catalog does not list it.
 */
export function shaderDescriptor(id: string): ShaderDescriptor | undefined {
    const known = SHADER_PRESETS.find((preset) => preset.id === id) ?? registry.byId(id)?.descriptor;
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
 * The ids of every shader of some kinds, for a refusal that lists what would have been right.
 * @param kinds - The kinds.
 * @returns The ids.
 */
export function shaderIdsOf(kinds: readonly ShaderKind[]): readonly string[] {
    const pasted = [...pastedSources].flatMap((source) =>
        source.ids().flatMap((id) => {
            const descriptor = source.descriptor(id);
            return descriptor === undefined ? [] : [descriptor];
        }),
    );

    return [...shaderDescriptors(), ...pasted]
        .filter((descriptor) => kinds.includes(descriptor.kind))
        .map((descriptor) => descriptor.id);
}

/**
 * A registered shader's text, for the renderer.
 * @param id - The id.
 * @returns Its GLSL and optional WGSL body, or undefined when nothing registered that id.
 */
export function registeredShaderSource(
    id: string,
): { readonly glsl: string; readonly wgsl?: string; readonly lowDetail?: string } | undefined {
    const entry = registry.byId(id);

    return entry === undefined
        ? undefined
        : {
              glsl: entry.glsl,
              ...(entry.wgsl === undefined ? {} : { wgsl: entry.wgsl }),
              ...(entry.lowDetail === undefined ? {} : { lowDetail: entry.lowDetail }),
          };
}

/**
 * Forget every registered shader.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract.
 */
export function clearRegisteredShadersForTesting(): void {
    registry.clearForTesting();
}

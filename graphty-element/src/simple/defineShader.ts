/**
 * @file `defineShader`: the simple tier's shader verb.
 *
 * It builds an ordinary shader registration and hands it to `registerShader`, so there is one
 * validation path and one registry: a shader defined here and the same shader registered through
 * the advanced tier are the same catalog entry. Its parameters are written in the simple tier's
 * option short form (`speed: 1`, `tint: "#ffaa00"`, `speed: { type: "number", default: 1, min: 0,
 * max: 4, varies: true }`).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { RegisterOptions } from "../catalog/pluginRegistry";
import { firstProblem, registerShader } from "../catalog/shaderRegistry";
import { isClockBinding, isShaderId, type ShaderProblem } from "../catalog/shaders";
import { GraphtyError, isGraphtyError } from "../errors";
import { badDefinition, describeValue, sentenceCase } from "./definition";
import { expandOptions } from "./options";
import type { ShaderDefinition } from "./types";

/** A color written as a bare string. */
const BARE_COLOR = /^#[\da-fA-F]{6}$/;

/** The keys a definition hands to the descriptor as they are. */
const FACTS = [
    "target",
    "place",
    "places",
    "minSize",
    "motion",
    "reach",
    "blend",
    "bloom",
    "form",
    "reachParam",
    "categories",
    "preview",
    "thumbnail",
    "cost",
    "reads",
    "requires",
    "webgpu",
] as const;

/**
 * The optional catalog facts a definition gives, leaving out each one it does not.
 * @param definition - The definition.
 * @returns Those facts.
 */
function optionalFacts(definition: ShaderDefinition): Partial<Pick<ShaderDefinition, (typeof FACTS)[number]>> {
    const facts: Record<string, unknown> = {};
    for (const key of FACTS) {
        if (definition[key] !== undefined) {
            facts[key] = definition[key];
        }
    }

    return facts;
}

/**
 * The parameter type a default says: a number, a boolean, a `#rrggbb` color, or a clock binding (a
 * color when its range is two colors, else a number).
 * @param value - The default.
 * @returns The type, or undefined when the default does not say one.
 */
function typeOfDefault(value: unknown): "number" | "boolean" | "color" | undefined {
    if (isClockBinding(value)) {
        return Array.isArray(value.range) && typeof value.range[0] === "string" ? "color" : "number";
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return typeof value === "number" ? "number" : "boolean";
    }

    return typeof value === "string" && BARE_COLOR.test(value) ? "color" : undefined;
}

/**
 * One parameter in short form, with a clock binding written alone (`{ by, domain }`) made a number
 * parameter, or a color one when its range is two colors.
 * @param entry - The short form.
 * @returns The short form `expandOptions` reads.
 */
function shortParam(entry: unknown): unknown {
    if (typeof entry === "string" && BARE_COLOR.test(entry)) {
        return { type: "color", default: entry };
    }

    if (isClockBinding(entry)) {
        return { type: typeOfDefault(entry), default: entry };
    }

    // An object whose default says its type need not repeat it: `{ default: 2, min: 0, max: 8 }`.
    if (typeof entry === "object" && entry !== null && !("type" in entry) && "default" in entry) {
        const type = typeOfDefault(entry.default);
        return type === undefined ? entry : { type, ...entry };
    }

    return entry;
}

/**
 * Register a shader from its GLSL body and its parameters in short form. Only `id` and `glsl` are
 * required. What it draws on is read from the body's entry function (`shade(NodeInput n)` draws
 * on nodes); where it draws is `place`, `"paint"` unless given.
 *
 * ```ts
 * defineShader({
 *     id: "acme/ring",
 *     place: "around",
 *     params: {
 *         color: "#ffcc00",
 *         width: { default: 2, min: 0.5, max: 8 },
 *         fade: { by: "since.matched", domain: [0, 0.3] },
 *     },
 *     glsl: `vec4 shade(NodeInput n) {
 *         float ring = 1.0 - smoothstep(0.0, width / n.pixelSize, abs(length(n.uv) - 1.2));
 *         return vec4(color, ring * fade);
 *     }`,
 * });
 * ```
 * @param definition - The id, the body, and optionally a name, parameters and the other catalog facts.
 * @param options - Whether a different shader under a taken id throws instead of replacing it.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the member at fault, its details carrying
 *   the first problem's `{ code, params }` (`shader.min-size-place`, a checker refusal) and every
 *   problem in `problems`, or with `E_DUPLICATE_PLUGIN` for an id the element ships.
 * @since 3.36.0
 */
export function defineShader(definition: ShaderDefinition, options?: RegisterOptions): void {
    if (typeof definition !== "object" || (definition as unknown) === null) {
        throw badDefinition(
            "defineShader",
            undefined,
            "definition",
            `the definition must be an object such as { id: "acme/glow", glsl: "vec4 shade(NodeInput n) { ... }" }; got ${describeValue(definition)}.`,
        );
    }

    const { id } = definition;
    if (!isShaderId(id, true)) {
        throw badDefinition(
            "defineShader",
            typeof id === "string" ? id : undefined,
            "id",
            `"id" must be "<namespace>/<name>" in lower-case letters, digits and hyphens, such as "acme/glow"; got ${describeValue(id)}.`,
        );
    }

    const params = Object.entries(definition.params ?? {}).map(
        ([name, entry]) => expandOptions("defineShader", id, { [name]: shortParam(entry) })[0],
    );

    try {
        registerShader(
            {
                descriptor: {
                    id,
                    plainName: typeof definition.name === "string" ? definition.name : sentenceCase(id.split("/")[1]),
                    params,
                    ...optionalFacts(definition),
                },
                glsl: definition.glsl,
                ...(definition.lowDetail === undefined ? {} : { lowDetail: definition.lowDetail }),
            },
            options,
        );
    } catch (error) {
        if (!isGraphtyError(error) || error.code !== "E_BAD_COMMAND") {
            throw error;
        }

        const named = typeof error.details.field === "string" ? error.details.field : "glsl";
        const field = named.replace(/^descriptor\./, "");
        const problems = (error.details.problems ?? []) as readonly ShaderProblem[];
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `defineShader(${JSON.stringify(id)}): "${field}" was refused (${problems.map((problem) => problem.code).join(", ")}).`,
            source: "registry",
            details: { field, extension: id, problems, ...firstProblem(problems) },
            cause: error,
        });
    }
}

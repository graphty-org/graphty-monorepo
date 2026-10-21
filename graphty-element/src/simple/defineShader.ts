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
import { registerShader } from "../catalog/shaderRegistry";
import { isShaderId } from "../catalog/shaders";
import { GraphtyError, isGraphtyError } from "../errors";
import { badDefinition, describeValue, sentenceCase } from "./definition";
import { expandOptions } from "./options";
import type { ShaderDefinition } from "./types";

/** A color written as a bare string. */
const BARE_COLOR = /^#[\da-fA-F]{6}$/;

/** The keys a definition hands to the descriptor as they are. */
const FACTS = [
    "target",
    "role",
    "geometry",
    "motion",
    "reach",
    "minPixels",
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
 * Register a shader from its GLSL body and its parameters in short form. What it draws on is read
 * from the body's entry function (`shade(NodeInput n)` draws on nodes); it is a look unless it
 * declares `role: "effect"` or a `reach`.
 *
 * ```ts
 * defineShader({
 *     id: "acme/pulse-ring",
 *     reach: 2,
 *     params: { tint: "#ffaa00", speed: { type: "number", default: 1, min: 0, max: 4, varies: true } },
 *     motion: "loop",
 *     glsl: `vec4 shade(NodeInput n) {
 *         float ring = smoothstep(0.04, 0.0, abs(length(n.uv) - fract(n.time * speed)));
 *         return vec4(tint * ring, ring);
 *     }`,
 * });
 * ```
 * @param definition - The id, the body, and optionally a name, parameters and the other catalog facts.
 * @param options - Whether a different shader under a taken id throws instead of replacing it.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` naming the member at fault, or with
 *   `E_DUPLICATE_PLUGIN` for an id the element ships.
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

    const params = Object.entries(definition.params ?? {}).map(([name, entry]) => {
        const short = typeof entry === "string" && BARE_COLOR.test(entry) ? { type: "color", default: entry } : entry;

        return expandOptions("defineShader", id, { [name]: short })[0];
    });

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
        const problems = (error.details.problems ?? []) as readonly { code: string }[];
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `defineShader(${JSON.stringify(id)}): "${field}" was refused (${problems.map((problem) => problem.code).join(", ")}).`,
            source: "registry",
            details: { field, extension: id, problems },
            cause: error,
        });
    }
}

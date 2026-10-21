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

/**
 * The optional catalog facts a definition gives, leaving out each one it does not.
 * @param definition - The definition.
 * @returns Its motion, reach, blend, bloom, form and reach parameter, where given.
 */
function optionalFacts(
    definition: ShaderDefinition,
): Partial<Pick<ShaderDefinition, "motion" | "reach" | "blend" | "bloom" | "form" | "reachParam">> {
    return {
        ...(definition.motion === undefined ? {} : { motion: definition.motion }),
        ...(definition.reach === undefined ? {} : { reach: definition.reach }),
        ...(definition.blend === undefined ? {} : { blend: definition.blend }),
        ...(definition.bloom === undefined ? {} : { bloom: definition.bloom }),
        ...(definition.form === undefined ? {} : { form: definition.form }),
        ...(definition.reachParam === undefined ? {} : { reachParam: definition.reachParam }),
    };
}

/**
 * Register a shader from its kind, its GLSL body and its parameters in short form.
 *
 * ```ts
 * defineShader({
 *     id: "acme/pulse-ring",
 *     kind: "node-effect",
 *     reach: 2,
 *     params: { tint: "#ffaa00", speed: { type: "number", default: 1, min: 0, max: 4, varies: true } },
 *     motion: "loop",
 *     glsl: `vec4 shade(NodeInput n) {
 *         float ring = smoothstep(0.04, 0.0, abs(length(n.uv) - fract(n.time * speed)));
 *         return vec4(tint * ring, ring);
 *     }`,
 * });
 * ```
 * @param definition - The id, the kind, the body, and optionally a name, parameters and motion.
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
            `the definition must be an object such as { id: "acme/glow", kind: "node-effect", glsl: "..." }; got ${describeValue(definition)}.`,
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
                    kind: definition.kind,
                    params,
                    ...optionalFacts(definition),
                },
                glsl: definition.glsl,
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

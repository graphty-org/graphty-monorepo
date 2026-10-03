/**
 * @file The name an unnamed run's result is given: what its algorithm suggests, or its key.
 *
 * The id is what a reader sees in a style selector -- `results.louvain_resolution_1_5.group` --
 * so it is made of words, never a hash. A registered algorithm suggests its own through
 * `static suggestedName` (or `suggestedName` in `defineAlgorithm`); a built-in names the one
 * setting worth telling two of its results apart by, and only once that setting leaves its
 * default, so the everyday run is plainly `pagerank` and reads "Influence".
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { registeredAlgorithmByKey } from "../../catalog/registry";
import type { AlgorithmDescriptor, SuggestedName } from "../../catalog/types";
import { GraphtyError } from "../../errors";

/** What a suggested id must look like: a selector names it unquoted, so no hyphens. */
const SUGGESTED_ID = /^[a-z][a-z0-9_]*$/;

/** The setting each built-in names its result by, and the word that names it. */
const BUILT_IN_SETTINGS: Readonly<Record<string, readonly [option: string, word: string]>> = {
    pagerank: ["dampingFactor", "damping"],
    katz: ["alpha", "alpha"],
    eigenvector: ["mode", "direction"],
    hits: ["mode", "direction"],
    louvain: ["resolution", "resolution"],
    leiden: ["resolution", "resolution"],
    components: ["strength", "strength"],
    "shortest-path": ["method", "method"],
    "link-prediction": ["method", "method"],
};

/**
 * Text as part of an id: `1.5` is `1_5`, `bellman-ford` is `bellman_ford`.
 * @param text - The text.
 * @returns The id part.
 */
function idPart(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

/**
 * A built-in's suggestion: its named setting, once that differs from the declared default.
 * @param descriptor - The algorithm's catalogue entry.
 * @param params - The run's canonical parameters.
 * @returns The suggestion, or undefined for the plain name.
 */
function builtInSuggestion(
    descriptor: AlgorithmDescriptor,
    params: Readonly<Record<string, unknown>>,
): SuggestedName | undefined {
    const setting = BUILT_IN_SETTINGS[descriptor.key] as (typeof BUILT_IN_SETTINGS)[string] | undefined;
    if (setting === undefined) {
        return undefined;
    }

    const [option, word] = setting;
    const value = params[option];
    const fallback = descriptor.options.find((candidate) => candidate.name === option)?.default;
    if (value === undefined || value === null || value === fallback) {
        return undefined;
    }

    const text = typeof value === "object" ? JSON.stringify(value) : String(value as string | number | boolean);

    return {
        id: `${plainId(descriptor.key)}_${word}_${idPart(text)}`,
        label: `${descriptor.plainName} (${word} ${text})`,
    };
}

/**
 * The id an algorithm with no suggestion gets: its key, with underscores for anything else.
 * @param key - The algorithm key.
 * @returns The id.
 */
function plainId(key: string): string {
    const id = idPart(key).replace(/^[^a-z]+/, "");

    return id === "" ? "run" : id;
}

/**
 * What an unnamed run of this algorithm, with these parameters, should be called.
 * @param descriptor - The algorithm's catalogue entry.
 * @param params - The run's canonical parameters, the declared defaults filled in.
 * @returns The id to try first, and the label.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when a registered algorithm suggests an id a
 *   selector could not carry, or no label.
 */
export function suggestRunName(
    descriptor: AlgorithmDescriptor,
    params: Readonly<Record<string, unknown>>,
): SuggestedName {
    const suggest = registeredAlgorithmByKey(descriptor.key)?.suggestedName;
    const suggestion = suggest === undefined ? builtInSuggestion(descriptor, params) : suggest(params);

    if (suggestion === undefined) {
        return { id: plainId(descriptor.key), label: descriptor.plainName };
    }

    const { id, label } = suggestion as Partial<SuggestedName>;
    if (typeof id !== "string" || !SUGGESTED_ID.test(id) || typeof label !== "string" || label === "") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message:
                `The algorithm "${descriptor.key}" suggested the name ${JSON.stringify(suggestion)}. ` +
                "suggestedName must return { id, label }: an id of lower-case letters, digits and " +
                "underscores starting with a letter, and a label of plain words.",
            source: "run",
            details: { algorithm: descriptor.key, field: "suggestedName", pattern: SUGGESTED_ID.source },
        });
    }

    return { id, label };
}

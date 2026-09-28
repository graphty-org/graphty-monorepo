/**
 * @file What every `define*` function of the simple tier shares: checking the definition object
 * before anything is registered, the names the element derives from an id, and the errors a
 * beginner reads (design/extensions/simple-tier.md sections 2.1 and 2.4).
 *
 * A person following the guide reads the first line of an error and searches for it, so every
 * message here starts with the call and the id (`defineLayout("acme-tiers"): ...`) or the id and
 * the member at fault (`acme-tiers: place() threw for node 42 ...`), says what was expected in
 * the words of the definition the author wrote, and names no internal concept.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError, type GraphtyErrorSource, isGraphtyError } from "../errors";

/** The four verbs of the simple tier graphty-element builds. */
export type SimpleVerb = "defineAlgorithm" | "defineLayout" | "definePalette" | "defineLogDestination";

/**
 * The id rule: lower-case words of letters and digits joined by single hyphens, starting with a
 * letter (design/extensions/README.md section 4.3). A dot is a path separator in a result path,
 * a colon separates the legacy algorithm address, and a slash is a URL separator.
 */
const ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * A value as a message describes it: what the author actually passed.
 * @param value - The value.
 * @returns A few words, such as `undefined`, `the number 3` or `a function`.
 */
export function describeValue(value: unknown): string {
    if (value === undefined || value === null) {
        return String(value);
    }

    if (Array.isArray(value)) {
        return "an array";
    }

    switch (typeof value) {
        case "string":
            return `the string ${JSON.stringify(value)}`;
        case "number":
        case "boolean":
        case "bigint":
            return `the ${typeof value} ${String(value)}`;
        case "function":
            return "a function";
        default:
            return "an object";
    }
}

/**
 * The refusal of a malformed definition: `E_BAD_COMMAND`, thrown by the `define*` call itself.
 * @param verb - The call, such as "defineLayout".
 * @param id - The definition's id, when it has a usable one.
 * @param field - The member at fault, such as "place" or "options.tier".
 * @param message - What was expected and what was given, as a sentence.
 * @returns The error.
 */
export function badDefinition(verb: SimpleVerb, id: string | undefined, field: string, message: string): GraphtyError {
    const call = id === undefined ? `${verb}()` : `${verb}(${JSON.stringify(id)})`;
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `${call}: ${message}`,
        source: "registry",
        details: { field, ...(id === undefined ? {} : { extension: id }) },
    });
}

/** A definition that has passed the shared checks: an object with a usable id. */
type CheckedDefinition = Readonly<Record<string, unknown>> & { readonly id: string };

/**
 * Check what every definition shares: it is an object, and its id is a usable permanent id.
 * The optional `name`, `description` and `version`, when present, must be strings.
 * @param verb - The call.
 * @param definition - What the author passed.
 * @returns The definition, narrowed.
 */
export function checkDefinition(verb: SimpleVerb, definition: unknown): CheckedDefinition {
    if (typeof definition !== "object" || definition === null || Array.isArray(definition)) {
        throw badDefinition(
            verb,
            undefined,
            "definition",
            `the definition must be an object such as { id: "acme-example", ... }; got ${describeValue(definition)}.`,
        );
    }

    const { id } = definition as { id?: unknown };
    if (typeof id !== "string" || id === "") {
        throw badDefinition(
            verb,
            undefined,
            "id",
            `"id" must be a non-empty string such as "acme-example"; got ${describeValue(id)}.`,
        );
    }

    if (!ID_PATTERN.test(id)) {
        throw badDefinition(
            verb,
            id,
            "id",
            `"id" must be lower-case words joined by hyphens, starting with a letter and led by your own ` +
                `prefix, such as "acme-tiers"; got ${JSON.stringify(id)}. The id is saved in documents, so it ` +
                "cannot contain spaces, capitals, dots, colons or slashes.",
        );
    }

    const checked = definition as CheckedDefinition;
    for (const field of ["name", "description", "version"]) {
        optionalString(verb, checked, field);
    }

    return checked;
}

/**
 * Refuse a member that is not a function.
 * @param verb - The call.
 * @param definition - The checked definition.
 * @param field - The member.
 */
export function requireFunction(verb: SimpleVerb, definition: CheckedDefinition, field: string): void {
    if (typeof definition[field] !== "function") {
        throw badDefinition(
            verb,
            definition.id,
            field,
            `"${field}" must be a function; got ${describeValue(definition[field])}.`,
        );
    }
}

/**
 * Refuse a member that is present and not a string.
 * @param verb - The call.
 * @param definition - The checked definition.
 * @param field - The member.
 */
function optionalString(verb: SimpleVerb, definition: CheckedDefinition, field: string): void {
    const value = definition[field];
    if (value !== undefined && typeof value !== "string") {
        throw badDefinition(verb, definition.id, field, `"${field}" must be a string; got ${describeValue(value)}.`);
    }
}

/**
 * Refuse a member that is present and not one of a list of values.
 * @param verb - The call.
 * @param definition - The checked definition.
 * @param field - The member.
 * @param allowed - The values it may take.
 */
export function optionalOneOf(
    verb: SimpleVerb,
    definition: CheckedDefinition,
    field: string,
    allowed: readonly (string | number | boolean)[],
): void {
    const value = definition[field];
    if (value !== undefined && !allowed.includes(value as string | number | boolean)) {
        const listed = allowed.map((item) => JSON.stringify(item)).join(", ");
        throw badDefinition(
            verb,
            definition.id,
            field,
            `"${field}" must be one of ${listed}; got ${describeValue(value)}.`,
        );
    }
}

/**
 * A key or an id in sentence case, for a name nobody wrote: "tierAttribute" reads "Tier
 * attribute", "acme-hop-reach" reads "Acme hop reach".
 * @param key - The key or id.
 * @returns The words.
 */
export function sentenceCase(key: string): string {
    const words = key
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .split(/[\s_-]+/)
        .filter((word) => word !== "")
        .map((word) => word.toLowerCase());
    const text = words.join(" ");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * What pickers show for a definition: its `name`, or its id in sentence case.
 * @param definition - The checked definition.
 * @returns The name.
 */
export function displayName(definition: CheckedDefinition): string {
    return typeof definition.name === "string" && definition.name !== ""
        ? definition.name
        : sentenceCase(definition.id);
}

/** Who was running when the author's own function threw. */
interface AuthorCall {
    /** The extension's id. */
    readonly id: string;
    /** The member of the definition that was called, such as "edge" or "place". */
    readonly member: string;
    /** What it was called for, worded for the message: `node 42`, `edge "17"`. Optional. */
    readonly subject?: string;
    /** Which area of the element the failure belongs to. */
    readonly source: GraphtyErrorSource;
}

/**
 * The error a throw from the author's own function becomes: `E_EXTENSION_FAILED`, never
 * `E_INTERNAL`, which would tell the reader to file an issue against graphty-element.
 * @param call - Who was running.
 * @param cause - What the function threw.
 * @returns The error, carrying the original as `cause`.
 */
export function extensionFailed(call: AuthorCall, cause: unknown): GraphtyError {
    const reason = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
    const subject = call.subject === undefined ? "" : ` for ${call.subject}`;
    return new GraphtyError({
        code: "E_EXTENSION_FAILED",
        message: `${call.id}: ${call.member}() threw${subject} (${reason}).`,
        source: call.source,
        details: {
            extension: call.id,
            member: call.member,
            ...(call.subject === undefined ? {} : { subject: call.subject }),
        },
        cause,
    });
}

/**
 * Call the author's function, turning a throw into `E_EXTENSION_FAILED`. A `GraphtyError` passes
 * through unchanged: it is already coded, and it may be the element's own refusal raised from
 * inside the call (a path nothing carries, a directed accessor on an undirected view).
 * @param call - Who is running.
 * @param work - The call.
 * @returns What the function returned.
 */
export function callAuthor<T>(call: AuthorCall, work: () => T): T {
    try {
        return work();
    } catch (error) {
        throw isGraphtyError(error) ? error : extensionFailed(call, error);
    }
}

/**
 * {@link callAuthor} for a function that may return a promise.
 * @param call - Who is running.
 * @param work - The call.
 * @returns What the function returned, awaited.
 */
export async function callAuthorAsync<T>(call: AuthorCall, work: () => T | Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (error) {
        throw isGraphtyError(error) ? error : extensionFailed(call, error);
    }
}

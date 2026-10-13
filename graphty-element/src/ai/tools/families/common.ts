/**
 * @file Helpers every tool family uses: catalog names as an enum or a validated string, the
 * session's errors as coded refusals, and the success result.
 */

import { z } from "zod";

import { isGraphtyError } from "../../../errors";
import { suggest } from "../search";
import { toJson } from "../shape";
import { type ActionResult, type JsonObject, type JsonValue, ToolRefusal } from "../types";

/** Catalog names past this many are a plain string, validated against the catalog. */
export const MAX_ENUM = 40;

/**
 * A field naming one catalog entry: an enum of the names up to 40, else a string the catalog
 * checks, whose description says to search.
 * @param names - The names.
 * @param description - What the field is.
 * @returns The field.
 */
export function nameField(names: readonly string[], description: string): z.ZodType<string> {
    if (names.length > 0 && names.length <= MAX_ENUM) {
        return z.enum(names as [string, ...string[]]).describe(description);
    }

    return z.string().max(200).describe(`${description} Find names with catalog search.`);
}

/**
 * Refuse a catalog name the catalog does not hold.
 * @param kind - What kind of entry.
 * @param name - The name given.
 * @param names - The names it may be.
 * @returns The name.
 * @throws {ToolRefusal} `AI_UNKNOWN_ENTRY` with suggestions.
 */
export function requireEntry(kind: string, name: string, names: readonly string[]): string {
    if (names.includes(name)) {
        return name;
    }

    throw new ToolRefusal("AI_UNKNOWN_ENTRY", { kind, name, didYouMean: suggest(name, names) });
}

/**
 * A success.
 * @param data - What the model reads.
 * @param params - The facts.
 * @param code - The session's own code, when it has one.
 * @returns The result.
 */
export function ok(data?: unknown, params: JsonObject = {}, code = "AI_OK"): ActionResult {
    return data === undefined ? { code, params } : { code, params, data: toJson(data) };
}

/**
 * Run a session call, turning its `GraphtyError` into a coded refusal the model can act on.
 * @param call - The call.
 * @returns What it returned.
 * @throws {ToolRefusal} The error's code and details.
 */
export async function coded<T>(call: () => T | Promise<T>): Promise<T> {
    try {
        return await call();
    } catch (error) {
        throw asRefusal(error);
    }
}

/**
 * Call a session verb that returns a run handle, without awaiting it (awaiting a `Run` yields its
 * result, not the handle), turning its `GraphtyError` into a coded refusal.
 * @param call - The call.
 * @returns What it returned.
 * @throws {ToolRefusal} The error's code and details.
 */
export function codedNow<T>(call: () => T): T {
    try {
        return call();
    } catch (error) {
        throw asRefusal(error);
    }
}

/**
 * An error as a coded refusal: a session `GraphtyError` passes its code and details through;
 * anything else is rethrown as it was.
 * @param error - What was thrown.
 * @returns The refusal, or the error itself.
 */
export function asRefusal(error: unknown): unknown {
    if (error instanceof ToolRefusal) {
        return error;
    }

    if (isGraphtyError(error)) {
        return new ToolRefusal(error.code, toJson(error.details) as JsonObject);
    }

    return error;
}

/**
 * A list as JSON for the model.
 * @param items - The items.
 * @returns The JSON.
 */
export function list(items: readonly unknown[]): JsonValue[] {
    return items.map((item) => toJson(item));
}

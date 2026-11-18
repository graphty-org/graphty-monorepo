/**
 * Manifest JSON values (design sections 5.9 and 9.5): decoding the `$num` and `$esc` tags the
 * writer uses for values JSON cannot spell, and parsing container JSON text with the
 * prototype-pollution keys refused.
 */

import { isPlainObject } from "../columns/column.js";
import { describeValue } from "../util/options.js";
import { badWire } from "./bad-wire.js";
import { defineJsonKey } from "./to-wire.js";

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);
const NUM_TAG = "$num";
const ESC_TAG = "$esc";
/** The deepest JSON nesting a manifest value may have; deeper input is refused instead of overflowing the stack. */
const MAX_JSON_DEPTH = 256;

/**
 * Decode a manifest JSON value (design section 5.9): `{ "$num": "Infinity" | "-Infinity" | "NaN" |
 * "-0" }` becomes the number, `{ "$esc": { ... } }` unwraps a user object whose only key collided
 * with a tag (the writer's escape), arrays and plain objects are rebuilt recursively (a key named
 * `__proto__`, `constructor` or `prototype` is refused), everything else is returned as is. Nesting
 * deeper than MAX_JSON_DEPTH is E_BAD_SERIALIZATION rather than a stack overflow.
 * @param value - the value from the manifest
 * @param path - the manifest path for error messages
 * @param depth - the current nesting depth
 * @returns the decoded value
 */
export function decodeJsonValue(value: unknown, path: string, depth = 0): unknown {
    if (depth > MAX_JSON_DEPTH) {
        throw badWire(path, `JSON nesting deeper than ${MAX_JSON_DEPTH}`, { reason: "nesting" });
    }
    if (Array.isArray(value)) {
        return value.map((item: unknown, i) => decodeJsonValue(item, `${path}[${i}]`, depth + 1));
    }
    if (!isPlainObject(value)) {
        return value;
    }
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === NUM_TAG) {
        const tag: unknown = value[NUM_TAG];
        switch (tag) {
            case "NaN":
                return Number.NaN;
            case "Infinity":
                return Infinity;
            case "-Infinity":
                return -Infinity;
            case "-0":
                return -0;
            default:
                throw badWire(path, `unknown number tag ${describeValue(tag)}`, { found: tag });
        }
    }
    if (keys.length === 1 && keys[0] === ESC_TAG) {
        const inner: unknown = value[ESC_TAG];
        if (!isPlainObject(inner)) {
            throw badWire(path, "an escaped object must hold a plain object", { found: typeof inner });
        }
        return decodeJsonObject(inner, path, depth);
    }
    return decodeJsonObject(value, path, depth);
}

/**
 * Rebuild a plain object's members (no tag interpretation of the object itself).
 * @param value - the plain object
 * @param path - the manifest path
 * @param depth - the nesting depth of the object
 * @returns the rebuilt object
 */
function decodeJsonObject(value: Record<string, unknown>, path: string, depth: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
        if (FORBIDDEN_KEYS.has(key)) {
            throw badWire(path, `forbidden key "${key}"`, { key });
        }
        defineJsonKey(out, key, decodeJsonValue(value[key], `${path}.${key}`, depth + 1));
    }
    return out;
}

/**
 * Refuse the prototype-pollution keys of design section 9.5 anywhere in a parsed JSON value.
 * JSON.parse defines them as plain own properties, so checking after the parse is as safe as a
 * reviver, and far cheaper: V8's reviver path (JSON.parse source text access) costs about eight
 * times the parse itself. An explicit stack keeps deep nesting off the call stack.
 * @param root - the parsed value
 */
function refuseForbiddenKeys(root: unknown): void {
    const stack: unknown[] = [root];
    while (stack.length > 0) {
        const value = stack.pop();
        if (Array.isArray(value)) {
            for (const item of value) {
                stack.push(item);
            }
        } else if (typeof value === "object" && value !== null) {
            for (const key of Object.keys(value)) {
                if (FORBIDDEN_KEYS.has(key)) {
                    throw badWire("manifest", `forbidden key "${key}"`, { key });
                }
                stack.push((value as Record<string, unknown>)[key]);
            }
        }
    }
}

/**
 * Parse JSON text from a container (the manifest or one json column row) and refuse the
 * prototype-pollution keys. A syntax error is E_BAD_SERIALIZATION.
 * @param text - the JSON text
 * @param path - the manifest path for error messages
 * @returns the parsed value
 */
export function parseGuardedJson(text: string, path: string): unknown {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text) as unknown;
    } catch (err) {
        throw badWire(path, `not valid JSON (${err instanceof Error ? err.message : String(err)})`);
    }
    refuseForbiddenKeys(parsed);
    return parsed;
}

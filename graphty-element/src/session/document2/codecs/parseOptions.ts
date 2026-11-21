/**
 * @file The parse options a version 2 source record may carry (spec/builtins.md, "Parse
 * options"): each name, the formats whose reader reads it and the values it takes, and the mapping
 * between a load's config and a record's `options`. The table is the format's own vocabulary:
 * `test/spec/schemas.test.ts` checks it against builtins.md.
 */

import type { JsonObject } from "../types";

/** One parse option: the formats that read it (`"*"`, every one) and the values it takes. */
export interface ParseOption {
    readonly formats: readonly string[] | "*";
    readonly valid: (value: unknown) => boolean;
    /** The load config key it is read from, when that is not its own name. */
    readonly config?: string;
}

const isText = (value: unknown): value is string => typeof value === "string";
const isTexts = (value: unknown): boolean => Array.isArray(value) && value.every(isText);
const isCount = (value: unknown): boolean => Number.isInteger(value) && (value as number) >= 0;
const oneOf =
    (...names: string[]) =>
    (value: unknown): boolean =>
        isText(value) && names.includes(value);

/**
 * Whether a value is an absolute URL.
 * @param value - The value.
 * @returns True for one.
 */
function isAbsoluteUrl(value: unknown): boolean {
    if (!isText(value)) {
        return false;
    }

    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

/** The members of `styleOptions` a file keeps; `framing` and the deprecated `labelLayers` are never written. */
const STYLE_OPTIONS: Readonly<Record<string, (value: unknown) => boolean>> = {
    lengths: oneOf("median", "file", "spacing"),
    labelSizes: oneOf("proportional", "file"),
    toolDefaults: (value) => typeof value === "boolean",
    imageBaseUrl: isAbsoluteUrl,
};

/** The formats whose reader in graphty-element chooses one of several graphs in a file. */
const GRAPH_FORMATS = ["cx", "cys", "json", "xgmml", "xlsx"];

/** Every parse option, in the order builtins.md lists them. */
export const PARSE_OPTIONS: Readonly<Record<string, ParseOption>> = {
    delimiter: { formats: ["csv"], valid: (value) => isText(value) && value.length === 1 },
    missing: { formats: ["csv", "json", "xlsx"], valid: isTexts },
    pointer: { formats: ["json"], valid: (value) => isText(value) && /^(?:\/(?:[^~/]|~[01])*)*$/.test(value) },
    sheet: { formats: ["xlsx"], valid: isText },
    graphIndex: { formats: GRAPH_FORMATS, valid: isCount },
    graphName: { formats: GRAPH_FORMATS, valid: isText },
    errorLimit: { formats: "*", valid: isCount },
    styles: { formats: "*", valid: oneOf("file", "none") },
    styleOptions: {
        formats: "*",
        valid: (value) =>
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            Object.entries(value).every(
                ([name, member]) => Object.hasOwn(STYLE_OPTIONS, name) && STYLE_OPTIONS[name](member),
            ),
    },
};

/**
 * The load config keys that are never parse options and are dropped without a report: how the
 * bytes arrived, how they were chunked and laid out, and the endpoint and id choices a mapping
 * carries.
 */
export const NOT_OPTIONS: ReadonlySet<string> = new Set([
    "data",
    "file",
    "url",
    "nodeFile",
    "edgeFile",
    "nodeURL",
    "edgeURL",
    "nodeData",
    "edgeData",
    "chunkSize",
    "layout",
    "edgeSource",
    "edgeTarget",
    "idColumn",
    "nodeIdPath",
    "edgeSrcIdPath",
    "edgeDstIdPath",
]);

/** Each parse option's name, by the load config key it is read from. */
const BY_CONFIG = new Map(Object.entries(PARSE_OPTIONS).map(([name, option]) => [option.config ?? name, name]));

/**
 * Whether a format's reader reads a parse option with this value.
 * @param format - The record's format.
 * @param name - The option's name.
 * @param value - Its value.
 * @returns True when the name is listed for the format and the value has the listed type.
 */
export function readsOption(format: string | undefined, name: string, value: unknown): boolean {
    const option = Object.hasOwn(PARSE_OPTIONS, name) ? PARSE_OPTIONS[name] : undefined;
    return (
        option !== undefined &&
        (option.formats === "*" || (format !== undefined && option.formats.includes(format))) &&
        option.valid(value)
    );
}

/**
 * A load's config as a record's `options` (spec 4.1.2 rule 9): the listed options the format reads,
 * `styleOptions` cut to the members a file keeps, and the name of every other config key that is
 * not one of {@link NOT_OPTIONS}.
 * @param format - The load's format.
 * @param config - Its config, the style choices included.
 * @returns The options, and the config keys left out that the save reports.
 */
export function optionsOf(
    format: string | undefined,
    config: Readonly<JsonObject>,
): { options: JsonObject; dropped: string[] } {
    const options: JsonObject = {};
    const dropped: string[] = [];
    for (const [key, raw] of Object.entries(config)) {
        if (raw === undefined || NOT_OPTIONS.has(key)) {
            continue;
        }

        const name = BY_CONFIG.get(key);
        const value =
            name === "styleOptions" && typeof raw === "object" && raw !== null
                ? Object.fromEntries(Object.entries(raw).filter(([member]) => Object.hasOwn(STYLE_OPTIONS, member)))
                : raw;
        if (name !== undefined && readsOption(format, name, value)) {
            options[name] = value;
        } else {
            dropped.push(key);
        }
    }

    return { options, dropped };
}

/**
 * A record's `options` as a load's config: each option its format reads, under its config key.
 * @param format - The record's format.
 * @param options - Its options.
 * @returns The config.
 */
export function configOf(format: string | undefined, options: Readonly<JsonObject>): JsonObject {
    return Object.fromEntries(
        Object.entries(options)
            .filter(([name, value]) => readsOption(format, name, value))
            .map(([name, value]) => [PARSE_OPTIONS[name].config ?? name, value]),
    );
}

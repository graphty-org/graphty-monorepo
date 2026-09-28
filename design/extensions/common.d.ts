/**
 * Shared vocabulary of every graphty-element extension point.
 *
 * NORMATIVE for the shapes it declares. Behaviour is specified in design/extensions/README.md.
 * Everything in the "Published" section exists in graphty-element 2.6.1 and is described here as
 * it is built. It is exported by @graphty/graphty-element/extend unless its comment says "NOT
 * EXPORTED BY NAME" (the type exists, but a plugin cannot import it; exporting it from ./extend
 * is additive and the element SHOULD do it). Everything in the "Proposed"
 * section is NOT built; each item names the open decision in README.md that it depends on, and
 * nothing in it may be relied on until that decision is taken and the item moves up.
 *
 * Type-check every declaration file here with: pnpm exec tsc -p design/extensions
 */

// =============================================================================================
// Published (graphty-element 2.6.1, entry point ./extend)
// =============================================================================================

/** How a second registration under an id that is already taken behaves. */
export interface RegisterOptions {
    /** When true, a DIFFERENT implementation under a taken id throws E_DUPLICATE_PLUGIN instead of replacing. */
    readonly strict?: boolean;
}

/** The data-dependent bound sources the element resolves against a loaded graph. NOT EXPORTED BY NAME. */
export type OptionBoundSource =
    | "graph.nodeCount"
    | "graph.edgeCount"
    | "graph.maxDegree"
    | "graph.maxCore"
    | "graph.componentCount";

/** A bound that depends on the loaded graph, written as a documented reference string. */
export interface OptionBound {
    /** OPEN UNION: a reader MUST treat an unknown source as "no bound". */
    from: OptionBoundSource | (string & {});
}

/**
 * The kinds of control an option asks for. CLOSED for writers (an extension MUST use one of
 * these), OPEN for readers (a reader MUST render an unknown type as "unknown").
 */
export type OptionType =
    | "number"
    | "integer"
    | "boolean"
    | "string"
    | "enum"
    | "seed"
    | "node-id"
    | "node-set"
    | "attribute"
    | "partition"
    | "ordering"
    | "unknown";

/** One choice of an "enum" option. */
export interface OptionChoice {
    value: string;
    label: string;
}

/** The value types an attribute can have. NOT EXPORTED BY NAME. */
export type AttributeType = "string" | "number" | "integer" | "boolean" | "time" | "category" | "mixed";

/**
 * One configurable option, as plain JSON. The ONLY options mechanism of every extension point.
 * JSON form: design/extensions/descriptors.schema.json#/$defs/OptionDescriptor.
 */
export interface OptionDescriptor {
    /** The key a caller passes. Unique within one descriptor's options. */
    name: string;
    /** What a form labels it with. */
    plainName: string;
    technicalName?: string;
    type: OptionType;
    /** Applied when the caller passes nothing. MUST be valid against the option's own constraints. */
    default?: unknown;
    min?: number | string | OptionBound;
    max?: number | string | OptionBound;
    step?: number;
    /** Required when type is "enum"; ignored otherwise. */
    values?: readonly OptionChoice[];
    /** For type "attribute": the value type the attribute must have. */
    attributeType?: AttributeType;
    group?: string;
    advanced?: boolean;
    /** Hidden from forms; still validated. */
    internal?: boolean;
    description?: string;
    /** Present exactly when type is "unknown". */
    unsupportedReason?: string;
}

/** Validation context a caller of resolveOptionValues supplies, so a failure names the extension. */
export interface OptionContext {
    readonly kind: string;
    readonly id: string;
}

/**
 * Resolve caller values against declared options: fill defaults, refuse unknown names with
 * E_UNKNOWN_OPTION and out-of-range or ill-typed values with E_OPTION_RANGE.
 */
export declare function resolveOptionValues(
    declared: readonly OptionDescriptor[],
    passed: Readonly<Record<string, unknown>>,
    context: OptionContext,
): Record<string, unknown>;

/**
 * The error codes an extension, or the element on an extension's behalf, uses. The full list is
 * graphty-element/src/errors/codes.ts, published on ./extend as GraphtyErrorCode (the type of
 * GraphtyErrorInit.code there). ExtensionErrorCode is this document's name for the subset the
 * extension contracts name; it is NOT an export. CLOSED for writers (an extension MUST NOT invent
 * a code), OPEN for readers (a consumer MUST treat an unknown code as a generic failure; adding a
 * code is a minor release). An element that receives a GraphtyError whose code it does not know
 * (thrown by an extension built against a newer element) passes it through unchanged.
 */
export type ExtensionErrorCode =
    | "E_BAD_COMMAND"
    | "E_DUPLICATE_PLUGIN"
    | "E_UNKNOWN_OPTION"
    | "E_OPTION_RANGE"
    | "E_UNKNOWN_ALGORITHM"
    | "E_UNKNOWN_LAYOUT"
    | "E_UNKNOWN_FORMAT"
    | "E_UNKNOWN_PALETTE"
    | "E_UNKNOWN_CAMERA"
    | "E_UNKNOWN_SINK"
    | "E_FETCH_FAILED"
    | "E_PARSE_FAILED"
    | "E_EMPTY_LOAD"
    | "E_CAP_EXCEEDED"
    | "E_SCOPE_EMPTY"
    | "E_NOT_CONVERGED"
    | "E_TOO_LARGE"
    | "E_SUPERSEDED"
    | "E_UNSUPPORTED"
    | "E_NO_ACCELERATOR"
    | "E_EDGE_ENDPOINTS_UNRESOLVED"
    | "E_PROTECTED"
    | "E_INTERNAL";

/** The area of the element a failure belongs to. CLOSED. */
export type GraphtyErrorSource = "data" | "run" | "layout" | "style" | "view" | "acceleration" | "registry" | "config";

/** The run, layer or scope a failure belongs to, when it belongs to one. */
export type GraphtyErrorTarget =
    | { readonly kind: "layer"; readonly id: string }
    | { readonly kind: "run"; readonly id: string }
    | { readonly kind: "scope"; readonly id: string };

/** What a GraphtyError is constructed from. */
export interface GraphtyErrorInit {
    /** The machine-readable reason. A consumer switches on this and never on the message. */
    code: ExtensionErrorCode;
    /** A sentence a person can read. Not part of the contract; it may be reworded in any release. */
    message: string;
    /** registry for registration failures; data, run, layout, view, style or config for use-time failures. */
    source: GraphtyErrorSource;
    /** Whether retrying with different input can succeed. */
    recoverable?: boolean;
    /** Plain-JSON facts about the failure. MUST survive JSON.stringify. */
    details?: Readonly<Record<string, unknown>>;
    target?: GraphtyErrorTarget;
    /** The original failure, when this error wraps one. */
    cause?: unknown;
}

/** The one failure type of the extension contracts. */
export declare class GraphtyError extends Error {
    constructor(init: GraphtyErrorInit);
    readonly code: ExtensionErrorCode;
    readonly source: GraphtyErrorSource;
    readonly recoverable: boolean;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly target?: GraphtyErrorTarget;
}

export declare function isGraphtyError(value: unknown): value is GraphtyError;

// =============================================================================================
// Proposed (NOT built). Each item depends on an open decision in design/extensions/README.md.
// =============================================================================================

/**
 * PROPOSED -- open decision "Host compatibility check".
 * The version of each point's contract, as full semver strings (node-semver rejects "1.0").
 * Each moves independently of the graphty-element package version, and its major is bumped on
 * ANY incompatible change to a type of that point on ./extend or ./logging -- "implemented by
 * extensions" and "called by extensions" alike (a removed protected helper is a break). One number
 * per point, so a break in the layout contract does not refuse every palette.
 */
export declare const EXTENSION_API_VERSIONS: {
    readonly palette: "1.0.0";
    readonly format: "1.0.0";
    readonly camera: "1.0.0";
    readonly layout: "1.0.0";
    readonly algorithm: "1.0.0";
    readonly logging: "1.0.0";
};

/**
 * PROPOSED -- open decision "Host compatibility check".
 * Carried by every registration (on the descriptor, or as statics on the class) to state the
 * contract range the extension was written against. The member is `requiresApi`, NOT `requires`,
 * because AlgorithmDescriptor.requires already holds graph preconditions.
 */
export interface ExtensionCompatibility {
    /**
     * A node-semver range over the point's EXTENSION_API_VERSIONS entry, for example "^1.0.0".
     * MUST NOT be "*" or empty.
     */
    readonly requiresApi?: string;
    /** The extension's own semver version, recorded as provenance wherever its key is recorded. */
    readonly version?: string;
    /** The npm package that ships the extension, recorded with the key so a replay can tell two vendors apart. */
    readonly package?: string;
    /**
     * Members of this descriptor an element MUST understand to honour it (preconditions, egress
     * declarations). An element that does not know a listed member refuses the registration with
     * E_UNSUPPORTED naming it, instead of silently ignoring a constraint.
     */
    readonly mustUnderstand?: readonly string[];
}

/**
 * PROPOSED -- README section 7. The option values a descriptor's `const` option array implies, so
 * a registration can hand them to the extension typed, with no cast:
 *   const options = [{ name: "margin", type: "number", ... }] as const;
 *   compute(input: CameraViewInput<OptionValues<typeof options>>)
 */
export type OptionValues<T extends readonly { readonly name: string; readonly type: OptionType }[]> = {
    readonly [O in T[number] as O["name"]]: O["type"] extends "number" | "integer" | "seed"
        ? number
        : O["type"] extends "boolean"
          ? boolean
          : O["type"] extends "node-set"
            ? readonly (string | number)[]
            : O["type"] extends "node-id"
              ? string | number
              : O["type"] extends "unknown"
                ? unknown
                : string;
};

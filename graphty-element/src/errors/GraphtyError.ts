/**
 * The one error class graphty-element throws.
 *
 * The module is free of Babylon.js, Lit and DOM references so that it can be re-exported from
 * the Node-safe entry points.
 * @module errors/GraphtyError
 */

import { type GraphtyErrorCode, isGraphtyErrorCode } from "./codes";

/**
 * The area of the element a failure came from.
 *
 * It answers "who was doing this" without the consumer parsing a message, and it is what an
 * error panel groups on.
 */
export type GraphtyErrorSource = "data" | "run" | "layout" | "style" | "view" | "acceleration" | "registry" | "config";

/**
 * The thing a failure belongs to, when it belongs to a thing rather than to the session.
 *
 * A run's failure lands on the run, a layer's failure lands on the layer, and everything else is
 * the session's. The ids are the element's ordinary opaque string ids.
 */
export type GraphtyErrorTarget =
    | { readonly kind: "layer"; readonly id: string }
    | { readonly kind: "run"; readonly id: string }
    | { readonly kind: "scope"; readonly id: string };

/**
 * Everything a `GraphtyError` is constructed from.
 */
export interface GraphtyErrorInit {
    /** The machine-readable reason. A consumer switches on this and never on the message. */
    code: GraphtyErrorCode;
    /** A sentence a person can read. Not part of the contract; it may be reworded any release. */
    message: string;
    /** The area of the element that failed. */
    source: GraphtyErrorSource;
    /**
     * Whether the same call could succeed later without the caller changing anything -- a fetch
     * that timed out, a device that was lost. Defaults to false: a malformed call, a missing
     * name and an exceeded cap all stay broken until something changes.
     */
    recoverable?: boolean;
    /**
     * The facts behind the failure: the offending name and the valid ones, the estimate and the
     * cap, the url and the status. Frozen on construction, and structured so an error UI can
     * render it without parsing prose.
     */
    details?: Readonly<Record<string, unknown>>;
    /** The run, layer or scope the failure belongs to, when it belongs to one. */
    target?: GraphtyErrorTarget;
    /** The original failure, when this error wraps one -- a sibling package's error, usually. */
    cause?: unknown;
}

/**
 * What a `GraphtyError` looks like once it has been serialised.
 *
 * Plain JSON: safe to log, to post across a worker boundary, and to put in a bug report.
 */
export interface GraphtyErrorJson {
    /** Always `"GraphtyError"`, so a log reader can tell what it is looking at. */
    name: string;
    /** The machine-readable reason. */
    code: GraphtyErrorCode;
    /** The human-readable message. */
    message: string;
    /** The area of the element that failed. */
    source: GraphtyErrorSource;
    /** Whether retrying unchanged could succeed. */
    recoverable: boolean;
    /** The structured facts behind the failure. */
    details: Readonly<Record<string, unknown>>;
    /** The run, layer or scope the failure belongs to, when it belongs to one. */
    target?: GraphtyErrorTarget;
    /** The wrapped failure's message, when there was one. The original object is not serialised. */
    causeMessage?: string;
}

const EMPTY_DETAILS: Readonly<Record<string, unknown>> = Object.freeze({});

/**
 * Reads a `code` property off an unknown thrown value.
 * @param value - The thrown value.
 * @returns The code when the value carries one the element recognises, otherwise undefined.
 */
function codeOf(value: unknown): GraphtyErrorCode | undefined {
    if (typeof value !== "object" || value === null || !("code" in value)) {
        return undefined;
    }

    const { code } = value;
    return isGraphtyErrorCode(code) ? code : undefined;
}

/**
 * Reads a `code` property off an unknown thrown value without requiring it to be one of ours.
 * @param value - The thrown value.
 * @returns The foreign code string, or undefined when there is none.
 */
function foreignCodeOf(value: unknown): string | undefined {
    if (typeof value !== "object" || value === null || !("code" in value)) {
        return undefined;
    }

    const { code } = value;
    return typeof code === "string" && !isGraphtyErrorCode(code) ? code : undefined;
}

/**
 * The error every graphty-element failure arrives as.
 *
 * It is an ordinary `Error`, so `instanceof Error`, `try`/`catch`, `await`, `.stack` and a
 * console log all behave the way a stranger expects. What it adds is the part a program can act
 * on: a stable `code`, the `source` area that failed, whether retrying could help, and a
 * structured `details` bag carrying the facts -- the name that was wrong and the names that
 * would have been right, the estimate and the cap, the url and the status.
 *
 * Codes cross module and worker boundaries; classes do not. A sibling package's error is
 * re-reported through `GraphtyError.wrap`, which keeps the original as `cause`.
 * @example
 * ```ts
 * try {
 *     await session.layout.set("frce");
 * } catch (err) {
 *     if (isGraphtyError(err) && err.code === "E_UNKNOWN_LAYOUT") {
 *         showPicker(err.details.available);
 *     }
 * }
 * ```
 */
export class GraphtyError extends Error {
    /** Always `"GraphtyError"`. */
    override readonly name: string = "GraphtyError";

    /** The machine-readable reason. Switch on this; never on the message. */
    readonly code: GraphtyErrorCode;

    /** The area of the element that failed. */
    readonly source: GraphtyErrorSource;

    /** Whether the same call, unchanged, could succeed later. */
    readonly recoverable: boolean;

    /** The structured facts behind the failure. Frozen. */
    readonly details: Readonly<Record<string, unknown>>;

    /** The run, layer or scope the failure belongs to, when it belongs to one. */
    readonly target?: GraphtyErrorTarget;

    /**
     * Builds an error.
     * @param init - The code, the message, the failing area and anything else known about the
     * failure.
     */
    constructor(init: GraphtyErrorInit) {
        super(init.message, init.cause === undefined ? undefined : { cause: init.cause });

        // Keeps instanceof working when this file is downlevelled, and when the class is
        // subclassed.
        Object.setPrototypeOf(this, new.target.prototype);

        this.code = init.code;
        this.source = init.source;
        this.recoverable = init.recoverable ?? false;
        this.details = init.details === undefined ? EMPTY_DETAILS : Object.freeze({ ...init.details });

        if (init.target !== undefined) {
            this.target = init.target;
        }
    }

    /**
     * Re-reports a failure from somewhere else as a `GraphtyError`.
     *
     * A sibling package -- graph-io, graph-format, the WebGPU peer -- throws its own class. The
     * class does not cross the boundary, so the element carries the code instead: when the
     * original's `code` is one the element knows, that code wins; when it is a string the
     * element does not know, it is kept in `details.sourceCode` and the caller's code is used.
     * A value that is already a `GraphtyError` is returned untouched, so the most specific code
     * survives.
     * @param cause - The thrown value being wrapped.
     * @param init - The code, area and facts to use when the original supplies none.
     * @returns The error to throw.
     */
    static wrap(
        cause: unknown,
        init: Omit<GraphtyErrorInit, "cause" | "message"> & { message?: string },
    ): GraphtyError {
        if (cause instanceof GraphtyError) {
            return cause;
        }

        const inherited = codeOf(cause);
        const foreign = foreignCodeOf(cause);
        const message = init.message ?? (cause instanceof Error ? cause.message : String(cause));
        const details = foreign === undefined ? init.details : { ...init.details, sourceCode: foreign };

        return new GraphtyError({
            ...init,
            code: inherited ?? init.code,
            message,
            details,
            cause,
        });
    }

    /**
     * Renders the error as plain JSON.
     *
     * Called by `JSON.stringify`, and used wherever an error has to survive a boundary a class
     * cannot cross: a log line, a worker message, a bug report.
     * @returns The serialisable form.
     */
    toJSON(): GraphtyErrorJson {
        const json: GraphtyErrorJson = {
            name: this.name,
            code: this.code,
            message: this.message,
            source: this.source,
            recoverable: this.recoverable,
            details: this.details,
        };

        if (this.target !== undefined) {
            json.target = this.target;
        }

        if (this.cause instanceof Error) {
            json.causeMessage = this.cause.message;
        }

        return json;
    }
}

/**
 * Narrows an unknown caught value to a `GraphtyError`.
 *
 * The shape of every `catch` block that handles element failures: test it, then switch on
 * `err.code`.
 * @param value - The caught value.
 * @returns True when the value is a `GraphtyError`.
 */
export function isGraphtyError(value: unknown): value is GraphtyError {
    return value instanceof GraphtyError;
}

/**
 * What error reporting may send, as an allowlist: the hooks `Sentry.init` runs on every error,
 * every transaction and every breadcrumb before anything leaves the page.
 *
 * The usage data notice promises error reports, not the reader's data. An error can carry far
 * more than its message: an AI provider's error holds the request it sent and the response it got
 * (the prompt, the reader's message, graph values, tool results, the key in a header), a console
 * line holds whatever was logged, a fetch breadcrumb holds the URL with its query. So nothing is
 * sent because it was not removed; a field is sent only because it is named here.
 *
 * An error's message is the reader's data too: graphty-element's messages quote the column, node
 * id or layer name they are about, and a JSON.parse error quotes the start of the file. So an error
 * that carries one of graphty-element's error codes is sent as that code alone, and any other
 * message is sent with every quoted run replaced.
 *
 * Kept: the error's type, its code or its message with quoted text removed, its stack (both with
 * anything shaped like a key removed), the SDK's own bookkeeping (event id, time, release, environment, trace and replay
 * ids, the browser), and for a breadcrumb its kind and level, plus a request's method, status
 * and URL cut as the analytics cut it (`cleanUrl` in analytics.ts: this site's URLs keep their
 * path, any other site's become "external", so a file's or server's address never leaves). Dropped: every
 * other error field, `extra`, `user`, other contexts and tags, request bodies, query strings,
 * console breadcrumbs, and the text of click and input breadcrumbs.
 *
 * Feedback the reader writes (`captureUserFeedback`) is not an error event and passes through
 * none of these hooks except the breadcrumb one: its words are what the reader chose to send.
 */

import { redactSecrets } from "@graphty/graphty-element/logging";
import type {
    Breadcrumb,
    BrowserOptions,
    ErrorEvent,
    Event,
    EventHint,
    Exception,
    ReplayFrameEvent,
} from "@sentry/react";

import { cleanUrl as cutUrl, EXTERNAL_URL } from "./analytics";

type Json = Record<string, unknown>;

/** The top-level event fields that are sent. */
const EVENT_FIELDS = [
    "event_id",
    "timestamp",
    "start_timestamp",
    "type",
    "platform",
    "level",
    "logger",
    "environment",
    "release",
    "dist",
    "sdk",
    "fingerprint",
    "transaction_info",
    "debug_meta",
    "measurements",
    "sdkProcessingMetadata",
] as const;

/** The contexts that are sent: the SDK's own, none of them carrying data. */
const CONTEXTS = ["browser", "os", "device", "culture", "replay", "react"] as const;
const TRACE_FIELDS = ["trace_id", "span_id", "parent_span_id", "op", "status", "origin"] as const;
const SPAN_FIELDS = [...TRACE_FIELDS, "start_timestamp", "timestamp", "exclusive_time"] as const;
const FRAME_FIELDS = ["filename", "abs_path", "function", "module", "lineno", "colno", "in_app", "platform"] as const;
const MECHANISM_FIELDS = [
    "type",
    "handled",
    "synthetic",
    "source",
    "exception_id",
    "parent_id",
    "is_exception_group",
] as const;
/** The span attributes that are sent: the SDK's own (`sentry.*`) and these. */
const SPAN_DATA = ["http.request.method", "http.method", "http.response.status_code"] as const;

/**
 * The named fields of an object, and nothing else.
 * @param from - the object to read.
 * @param fields - the fields to keep.
 * @returns a new object with only those fields that are set.
 */
function pick(from: unknown, fields: readonly string[]): Json {
    const out: Json = {};
    if (from !== null && typeof from === "object") {
        for (const field of fields) {
            const value = (from as Json)[field];
            if (value !== undefined) {
                out[field] = value;
            }
        }
    }
    return out;
}

/**
 * A URL cut as the analytics cut it, then with any key left in it removed. This site's own URLs
 * keep their origin, so a stack frame still names the script Sentry has the source map of.
 * @param url - an absolute or relative URL.
 * @returns the URL safe to send, or undefined for none.
 */
function cleanUrl(url: unknown): string | undefined {
    if (typeof url !== "string") {
        return undefined;
    }
    // Already cut: a breadcrumb is cleaned when it is added and again with the event that carries
    // it, and "external" read as a relative URL would become this site's "/external".
    if (url === EXTERNAL_URL) {
        return url;
    }
    const cut = cutUrl(url);
    return redactSecrets(cut.startsWith("/") ? globalThis.location.origin + cut : cut);
}

/**
 * Text that is sent: a message, a stack, a span name, with keys removed and URLs cut to their path.
 * @param text - the text.
 * @returns the text safe to send.
 */
function cleanText(text: unknown): string | undefined {
    if (typeof text !== "string") {
        return undefined;
    }
    return redactSecrets(text.replaceAll(/https?:\/\/[^\s"'<>]+/g, (url) => cleanUrl(url) ?? ""));
}

/** What every quoted run in a message becomes. */
const QUOTED_TEXT = '"[quoted]"';
/**
 * Quoted runs: "...", `...` and '...' (a single quote only after a non-letter, so the apostrophe
 * of "can't" opens none).
 */
const QUOTED = /"(?:[^"\\]|\\.)*"|`[^`]*`|(?<![\p{L}\d])'(?:[^'\\]|\\.)*'/gu;

/**
 * A message that is sent: {@link cleanText} with every quoted run replaced, as a quote is where a
 * message names the reader's column, node, layer or file contents.
 * @param text - the message.
 * @returns the message safe to send.
 */
function cleanMessage(text: unknown): string | undefined {
    return typeof text === "string" ? cleanText(text.replaceAll(QUOTED, QUOTED_TEXT)) : undefined;
}

/** Reads whether a value is one of graphty-element's error codes; loaded on the first error. */
type CodeCheck = (value: unknown) => boolean;
let codeCheck: Promise<CodeCheck> | undefined;
/** The check once it has loaded: from then on an error is cleaned at once, not after an await. */
let loadedCodeCheck: CodeCheck | undefined;

/**
 * graphty-element's own check for its error codes, loaded with its session entry when error
 * reporting starts (see {@link preloadErrorCodes}) or on the first error, so the landing page never
 * downloads it for error reporting alone.
 * @returns the check, or one that knows no code when the entry cannot load.
 */
function loadCodeCheck(): Promise<CodeCheck> {
    codeCheck ??= import("@graphty/graphty-element/session").then(
        (session) => session.isGraphtyErrorCode,
        () => () => false,
    );
    void codeCheck.then((check) => {
        loadedCodeCheck = check;
    });
    return codeCheck;
}

/**
 * Starts loading graphty-element's error code check, so errors are cleaned synchronously: an
 * error captured while reporting is off is refused at once, and never sent by a quick Share after
 * it while an await was pending. Called when error reporting starts.
 */
export function preloadErrorCodes(): void {
    void loadCodeCheck();
}

/**
 * The graphty-element error codes of an error and its causes, by their message.
 * @param error - the error Sentry was handed.
 * @param isCode - graphty-element's check for its codes.
 * @returns each message that belongs to an error with a known code, and that code.
 */
function codesByMessage(error: unknown, isCode: CodeCheck): Map<string, string> {
    const codes = new Map<string, string>();
    const seen = new Set<unknown>();
    let each: unknown = error;
    while (each instanceof Error && !seen.has(each)) {
        seen.add(each);
        const { code } = each as { code?: unknown };
        if (isCode(code)) {
            codes.set(each.message, code as string);
        }
        each = each.cause;
    }
    return codes;
}

/**
 * Span attributes, keeping only the SDK's own and the request's method and status.
 * @param data - the attributes.
 * @returns the attributes safe to send.
 */
function cleanSpanData(data: unknown): Json {
    const keys = Object.keys(data ?? {}).filter((key) => key.startsWith("sentry.") || SPAN_DATA.includes(key as never));
    return pick(data, keys);
}

/**
 * A breadcrumb with only its kind and level, plus what a request or navigation safely says.
 * @param crumb - the breadcrumb Sentry recorded.
 * @returns the breadcrumb that is kept.
 */
function cleanBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
    if (crumb.category === "console") {
        // A guard: sentry.ts removes the Console integration, so none should arrive.
        return null;
    }
    const out: Breadcrumb = pick(crumb, ["timestamp", "type", "category", "level"]);
    const data: Json = crumb.data ?? {};
    if (crumb.category === "fetch" || crumb.category === "xhr") {
        out.data = { ...pick(data, ["method", "status_code"]), url: cleanUrl(data.url) };
    } else if (crumb.category === "navigation") {
        out.data = { from: cleanUrl(data.from), to: cleanUrl(data.to) };
    } else if (crumb.category?.startsWith("sentry.")) {
        // The event id, the SDK's own. Not its message: for an error, that is the error's message.
        Object.assign(out, pick(crumb, ["event_id"]));
    }
    return out;
}

/**
 * An exception with only its type, its code or cleaned message, its stack and how it was caught.
 * @param exception - one exception of the event.
 * @param codes - the graphty-element codes of the error and its causes, by message.
 * @returns the exception safe to send.
 */
function cleanException(exception: Exception, codes: ReadonlyMap<string, string>): Json {
    const code = exception.value === undefined ? undefined : codes.get(exception.value);
    const frames = exception.stacktrace?.frames?.map((frame) => ({
        ...pick(frame, FRAME_FIELDS),
        filename: cleanUrl(frame.filename),
    }));
    return {
        ...pick(exception, ["type", "module"]),
        // A graphty-element error is its code alone; one whose code is not known sends no message.
        value: code ?? (exception.type === "GraphtyError" ? undefined : cleanMessage(exception.value)),
        stacktrace: frames ? { frames } : undefined,
        mechanism: exception.mechanism ? pick(exception.mechanism, MECHANISM_FIELDS) : undefined,
    };
}

/**
 * Any event -- an error or a transaction -- with only the allowlisted fields.
 * @param event - the event Sentry is about to send.
 * @param codes - the graphty-element codes of the error and its causes, by message.
 * @returns the event that is sent.
 */
function cleanEvent<T extends Event>(event: T, codes: ReadonlyMap<string, string> = new Map()): T {
    const contexts: Json = pick(event.contexts, CONTEXTS);
    if (event.contexts?.trace) {
        contexts.trace = {
            ...pick(event.contexts.trace, TRACE_FIELDS),
            data: cleanSpanData(event.contexts.trace.data),
        };
    }
    const out: Json = {
        ...pick(event, EVENT_FIELDS),
        contexts,
        tags: pick(event.tags, ["replayId"]),
        transaction: cleanText(event.transaction),
        message: cleanMessage(event.message),
        breadcrumbs: event.breadcrumbs?.map(cleanBreadcrumb).filter((crumb) => crumb !== null),
    };
    if (event.exception?.values) {
        out.exception = { values: event.exception.values.map((each) => cleanException(each, codes)) };
    }
    if (event.request) {
        out.request = { url: cleanUrl(event.request.url), headers: pick(event.request.headers, ["User-Agent"]) };
    }
    if (event.spans) {
        out.spans = event.spans.map((span) => ({
            ...pick(span, SPAN_FIELDS),
            description: cleanText(span.description),
            data: cleanSpanData(span.data),
        }));
    }
    return out as T;
}

/**
 * The error replay's own hook: replay recordings pass neither `beforeSend` nor `beforeBreadcrumb`.
 * Drops console breadcrumbs and cuts the URL each performance span (navigation, resource, network)
 * carries in its description. It never sees the recording's Meta event, whose address the query
 * strip before `initSentry` protects (analytics.ts `stripQueryForRecorders`).
 * @param event - a custom recording event.
 * @returns the event to record, or null to drop it.
 */
export function beforeAddRecordingEvent(event: ReplayFrameEvent): ReplayFrameEvent | null {
    const { data } = event;
    if (data.tag === "breadcrumb" && data.payload.category === "console") {
        return null;
    }
    if (data.tag === "performanceSpan" && typeof data.payload.description === "string") {
        return {
            ...event,
            data: { ...data, payload: { ...data.payload, description: cleanText(data.payload.description) ?? "" } },
        };
    }
    return event;
}

/** The hooks handed to `Sentry.init`. */
// No beforeSendTransaction: sentry.ts sets up no tracing, and with tracing's lifecycle left at Sentry
// 11's default (streamed spans) the hook is ignored and only logs a warning on every init.
/**
 * The error hook: the event cut to its allowlist, each graphty-element error sent as its code.
 * @param event - the error event.
 * @param hint - what Sentry was handed, the error with its causes.
 * @returns the event that is sent.
 */
function cleanErrorEvent(event: ErrorEvent, hint: EventHint): ErrorEvent | Promise<ErrorEvent> {
    if (!event.exception?.values) {
        return cleanEvent(event);
    }
    if (loadedCodeCheck !== undefined) {
        return cleanEvent(event, codesByMessage(hint.originalException, loadedCodeCheck));
    }
    return loadCodeCheck().then((isCode) => cleanEvent(event, codesByMessage(hint.originalException, isCode)));
}

export const privacyFilters: Pick<BrowserOptions, "beforeSend" | "beforeBreadcrumb"> = {
    beforeSend: cleanErrorEvent,
    beforeBreadcrumb: cleanBreadcrumb,
};

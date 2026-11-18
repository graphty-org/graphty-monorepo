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
 * Kept: the error's type, its message and its stack (both with anything shaped like a key
 * removed), the SDK's own bookkeeping (event id, time, release, environment, trace and replay
 * ids, the browser), and for a breadcrumb its kind and level, plus a request's method, status
 * and URL cut as the analytics cut it (`cleanUrl` in analytics.ts: this site's URLs keep their
 * path, any other site's keep only its origin, so a file's address never leaves). Dropped: every
 * other error field, `extra`, `user`, other contexts and tags, request bodies, query strings,
 * console breadcrumbs, and the text of click and input breadcrumbs.
 *
 * Feedback the reader writes (`captureUserFeedback`) is not an error event and passes through
 * none of these hooks except the breadcrumb one: its words are what the reader chose to send.
 */

import { redactSecrets } from "@graphty/graphty-element/logging";
import type { Breadcrumb, BrowserOptions, Event, Exception, ReplayFrameEvent } from "@sentry/react";

import { cleanUrl as cutUrl } from "./analytics";

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
        // An event id, the SDK's own.
        out.message = crumb.message;
    }
    return out;
}

/**
 * An exception with only its type, message, stack and how it was caught.
 * @param exception - one exception of the event.
 * @returns the exception safe to send.
 */
function cleanException(exception: Exception): Json {
    const frames = exception.stacktrace?.frames?.map((frame) => ({
        ...pick(frame, FRAME_FIELDS),
        filename: cleanUrl(frame.filename),
    }));
    return {
        ...pick(exception, ["type", "module"]),
        value: cleanText(exception.value),
        stacktrace: frames ? { frames } : undefined,
        mechanism: exception.mechanism ? pick(exception.mechanism, MECHANISM_FIELDS) : undefined,
    };
}

/**
 * Any event -- an error or a transaction -- with only the allowlisted fields.
 * @param event - the event Sentry is about to send.
 * @returns the event that is sent.
 */
function cleanEvent<T extends Event>(event: T): T {
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
        message: cleanText(event.message),
        breadcrumbs: event.breadcrumbs?.map(cleanBreadcrumb).filter((crumb) => crumb !== null),
    };
    if (event.exception?.values) {
        out.exception = { values: event.exception.values.map(cleanException) };
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
export const privacyFilters: Pick<BrowserOptions, "beforeSend" | "beforeBreadcrumb"> = {
    beforeSend: cleanEvent,
    beforeBreadcrumb: cleanBreadcrumb,
};

/**
 * How a Gremlin script travels to a server, chosen by the endpoint's scheme:
 *
 * - `http:` / `https:`: Gremlin Server's HTTP endpoint (`POST` of `{ gremlin, bindings, language }`,
 *   GraphSON 3 back), through `ctx.fetch`, so retries, redirects, limits and every credential
 *   (`basic`, and `awsSigV4` for Amazon Neptune) work as for any source. A browser sends it with
 *   no `Content-Type` header, so there is no preflight (Gremlin Server answers every preflight
 *   405); a credential header always needs one, so in a browser a credential over HTTP is refused
 *   before any request (E_SOURCE_RUNTIME, reason "cors"): use a `wss://` endpoint there.
 * - `ws:` / `wss:`: the WebSocket protocol every Gremlin Server, JanusGraph and Neptune speak:
 *   GraphSON 3 request messages in binary frames, answered in one or more messages (status 206
 *   until the last). A `basic` credential logs in inside the protocol (SASL PLAIN on the server's
 *   407 challenge), which a browser can do; no other credential kind can be sent this way.
 */

import { throwIfAborted } from "../../common/input.js";
// detectRuntime() is what ctx.runtime holds; called here so a test can mock the runtime at the module boundary
import { detectRuntime, isLoopback, transportOptions } from "../context.js";
import { originOf, unwrapCredential } from "../credentials.js";
import { failOn } from "../fail.js";
import { type SourceContext } from "../types.js";

/** The GraphSON 3 media type, asked for over HTTP and declared in every WebSocket frame. */
const GRAPHSON3 = "application/vnd.gremlin-v3.0+json";

/** The script language every request names. */
const LANGUAGE = "gremlin-groovy";

/** The longest server message a report keeps. */
const MAX_SERVER_MESSAGE = 500;

/** One way scripts reach a server. */
export interface Transport {
    /**
     * Run one script.
     * @param script - the script
     * @param bindings - its bindings, sent separately
     * @returns the result items, as the server sent them (GraphSON)
     */
    run(script: string, bindings: Readonly<Record<string, unknown>>): Promise<unknown[]>;
    /** Release the connection. */
    close(): void;
}

/** What a server said about a failed script. */
interface ServerError {
    /** The server's code: an exception class, Neptune's code, or the protocol status. */
    readonly code: string | null;
    /** Its message, or "". */
    readonly message: string;
    /** The HTTP or protocol status. */
    readonly status: number;
    /** Whether the message may be kept: a client error, never a server fault. */
    readonly showable: boolean;
}

/**
 * Raise the source issue a server error is.
 * @param ctx - the context
 * @param err - what the server said
 * @returns never; it throws
 */
function serverError(ctx: SourceContext, err: ServerError): never {
    const origin = ctx.endpoint === null ? "" : originOf(ctx.endpoint);
    const { report } = ctx;
    if (err.status === 401 || err.status === 407) {
        return failOn(report, "E_SOURCE_AUTH", `${origin} refused the login`, {
            origin,
            status: err.status,
            scheme: null,
            serverCode: err.code,
        });
    }
    if (err.status === 403) {
        return failOn(report, "E_SOURCE_FORBIDDEN", `${origin} refused the script`, {
            origin,
            status: err.status,
            serverCode: err.code,
        });
    }
    if (err.status === 598 || /Timeout|TimeLimitExceeded/i.test(`${err.code ?? ""} ${err.message}`)) {
        return failOn(report, "E_SOURCE_TIMEOUT", `${origin} timed the script out`, {
            origin,
            timeoutMs: null,
            serverSide: true,
        });
    }
    const where = /line (\d+), column (\d+)/i.exec(err.message);
    return failOn(report, "E_SOURCE_QUERY", `${origin} refused the script: ${err.code ?? String(err.status)}`, {
        origin,
        serverCode: err.code,
        line: where === null ? null : Number(where[1]),
        column: where === null ? null : Number(where[2]),
        serverMessage: err.showable && err.message !== "" ? err.message.slice(0, MAX_SERVER_MESSAGE) : null,
    });
}

/**
 * Parse JSON, or null when the text is not JSON.
 * @param text - the text
 * @returns the value, or null
 */
function parseJson(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
}

/**
 * The items of a result's `data`: a typed `g:List`, a plain array, or nothing.
 * @param data - `result.data`
 * @returns the items
 */
function items(data: unknown): unknown[] {
    if (Array.isArray(data)) {
        return data;
    }
    const typed = data as { "@type"?: unknown; "@value"?: unknown } | null | undefined;
    if (typed?.["@type"] === "g:List" && Array.isArray(typed["@value"])) {
        return typed["@value"];
    }
    return data === null || data === undefined ? [] : [data];
}

/** A Gremlin answer as the HTTP endpoint and the WebSocket protocol share it. */
interface Answer {
    readonly requestId?: unknown;
    readonly status?: {
        readonly code?: number;
        readonly message?: string;
        readonly attributes?: unknown;
    };
    readonly result?: { readonly data?: unknown };
}

/** An HTTP error body: Gremlin Server's, or Neptune's. */
interface HttpErrorBody {
    readonly message?: string;
    readonly "Exception-Class"?: string;
    readonly code?: string;
    readonly detailedMessage?: string;
}

/**
 * The request arguments every script sends.
 * @param script - the script
 * @param bindings - its bindings
 * @param traversalSource - the alias of `g`, if any
 * @returns the arguments
 */
function argsOf(
    script: string,
    bindings: Readonly<Record<string, unknown>>,
    traversalSource: string | undefined,
): Record<string, unknown> {
    return {
        gremlin: script,
        bindings,
        language: LANGUAGE,
        ...(traversalSource === undefined ? {} : { aliases: { g: traversalSource } }),
    };
}

/**
 * The HTTP transport.
 * @param ctx - the context
 * @param traversalSource - the alias of `g`, if any
 * @returns the transport
 */
function httpTransport(ctx: SourceContext, traversalSource: string | undefined): Transport {
    const runtime = detectRuntime();
    const browser = runtime === "browser" || runtime === "worker";
    if (browser && transportOptions(ctx).credential !== undefined) {
        failOn(ctx.report, "E_SOURCE_RUNTIME", "a browser cannot send a credential to Gremlin over HTTP; use wss://", {
            runtime: detectRuntime(),
            reason: "cors",
        });
    }
    const origin = ctx.endpoint === null ? "" : originOf(ctx.endpoint);
    return {
        async run(script, bindings): Promise<unknown[]> {
            const response = await ctx.fetch(ctx.endpoint ?? "", {
                method: "POST",
                idempotent: true,
                allowStatus: [400, 500],
                // no Content-Type in a browser: the body goes as text/plain, with no preflight
                headers: browser ? { Accept: GRAPHSON3 } : { Accept: GRAPHSON3, "Content-Type": "application/json" },
                body: JSON.stringify(argsOf(script, bindings, traversalSource)),
            });
            const contentType = response.headers.get("content-type");
            const body = parseJson(await response.text());
            if (response.status === 400 || response.status === 500) {
                const e = (body ?? {}) as HttpErrorBody;
                serverError(ctx, {
                    code: e["Exception-Class"] ?? e.code ?? null,
                    message: e.message ?? e.detailedMessage ?? "",
                    status: response.status,
                    showable: response.status === 400 && body !== null,
                });
            }
            const answer = body as Answer | null;
            if (answer === null || typeof answer !== "object" || !("result" in answer)) {
                return failOn(ctx.report, "E_SOURCE_RESPONSE", "the server did not answer GraphSON", {
                    origin,
                    expected: "graphson",
                    contentType,
                });
            }
            return items(answer.result?.data);
        },
        close: () => undefined,
    };
}

/**
 * A random version 4 UUID; `getRandomValues` works on a plain-http page, `randomUUID` does not.
 * @returns the UUID
 */
function uuid(): string {
    const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * A value in GraphSON 3: whole numbers as `g:Int64` (Gremlin's usual id type), other numbers as
 * `g:Double`, arrays as `g:List`; strings, booleans, null and plain objects as they are.
 * @param v - the value
 * @returns the GraphSON value
 */
function graphson(v: unknown): unknown {
    if (typeof v === "number") {
        return { "@type": Number.isInteger(v) ? "g:Int64" : "g:Double", "@value": v };
    }
    if (Array.isArray(v)) {
        return { "@type": "g:List", "@value": v.map(graphson) };
    }
    if (v !== null && typeof v === "object") {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, graphson(x)]));
    }
    return v;
}

/**
 * One request message as a binary frame: the media type's length, the media type, the JSON.
 * @param message - the message
 * @returns the frame
 */
function frame(message: unknown): Uint8Array {
    const encoder = new TextEncoder();
    const mime = encoder.encode(GRAPHSON3);
    const json = encoder.encode(JSON.stringify(message));
    const out = new Uint8Array(1 + mime.length + json.length);
    out[0] = mime.length;
    out.set(mime, 1);
    out.set(json, 1 + mime.length);
    return out;
}

/**
 * SASL PLAIN's response, base64: NUL, user name, NUL, password, in UTF-8.
 * @param username - the user name
 * @param password - the password
 * @returns the base64 text
 */
function saslPlain(username: string, password: string): string {
    const bytes = new TextEncoder().encode(`\u0000${username}\u0000${password}`);
    let text = "";
    for (const b of bytes) {
        text += String.fromCodePoint(b);
    }
    return btoa(text);
}

/** One request waiting for its answer. */
interface Pending {
    readonly items: unknown[];
    readonly resolve: (items: unknown[]) => void;
    readonly reject: (err: unknown) => void;
}

/**
 * The error a function throws, as a value.
 * @param fn - a function that throws
 * @returns what it threw
 */
function thrown(fn: () => never): unknown {
    try {
        return fn();
    } catch (err) {
        return err;
    }
}

/**
 * Check the endpoint and the credential before opening a WebSocket.
 * @param ctx - the context
 * @param endpoint - the ws: or wss: endpoint
 * @returns the SASL login, or null to send none
 */
function wsLogin(ctx: SourceContext, endpoint: URL): { username: string; password: string } | null {
    const page = (globalThis as { location?: { protocol?: string } }).location;
    const plain = endpoint.protocol === "ws:" && !isLoopback(endpoint.hostname);
    if (detectRuntime() === "browser" && page?.protocol === "https:" && plain) {
        failOn(ctx.report, "E_SOURCE_RUNTIME", "an https page cannot open a plain WebSocket", {
            runtime: detectRuntime(),
            reason: "insecure-endpoint",
        });
    }
    const { credential, allowInsecure } = transportOptions(ctx);
    const bound =
        credential !== undefined &&
        (credential.origins.length === 0 || credential.origins.includes(originOf(endpoint)));
    if (!bound) {
        return null;
    }
    if (plain && allowInsecure !== true) {
        failOn(ctx.report, "E_SOURCE_PARAM", "a credential is never sent without TLS", {
            name: "endpoint",
            reason: "insecure-endpoint",
        });
    }
    const secret = unwrapCredential(credential);
    if (secret === undefined || !("username" in secret)) {
        return failOn(ctx.report, "E_SOURCE_PARAM", "Gremlin over a WebSocket takes a basic credential", {
            name: "credential",
            reason: "kind",
        });
    }
    return { username: secret.username, password: secret.password };
}

/**
 * The WebSocket transport: one socket per load, one request at a time.
 * @param ctx - the context
 * @param endpoint - the ws: or wss: endpoint
 * @param traversalSource - the alias of `g`, if any
 * @returns the transport, once the socket is open
 */
async function wsTransport(ctx: SourceContext, endpoint: URL, traversalSource: string | undefined): Promise<Transport> {
    const Socket = (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
    if (Socket === undefined) {
        failOn(ctx.report, "E_SOURCE_RUNTIME", "this runtime has no WebSocket", {
            runtime: detectRuntime(),
            reason: "needs-websocket",
        });
    }
    const login = wsLogin(ctx, endpoint);
    const origin = originOf(endpoint);
    const unreachable = (): unknown =>
        thrown(() =>
            detectRuntime() === "browser"
                ? failOn(ctx.report, "E_SOURCE_BLOCKED", `${origin} could not be reached over a WebSocket`, {
                      url: `${origin}${endpoint.pathname}`,
                      cause: "unknown",
                  })
                : failOn(ctx.report, "E_FETCH", `${origin} could not be reached over a WebSocket`, {
                      url: `${origin}${endpoint.pathname}`,
                      status: null,
                  }),
        );

    throwIfAborted(ctx.signal);
    const socket = new Socket(endpoint.href);
    socket.binaryType = "arraybuffer";
    const pending = new Map<string, Pending>();
    // the coded error (or the abort reason) that ended the socket
    let failure: Error | null = null;
    const failAll = (err: unknown): void => {
        failure ??= err as Error;
        for (const p of pending.values()) {
            p.reject(err);
        }
        pending.clear();
    };
    const onAbort = (): void => {
        failAll(ctx.signal.reason);
        socket.close();
    };
    ctx.signal.addEventListener("abort", onAbort, { once: true });

    const send = (requestId: string, op: string, args: unknown): void => {
        socket.send(frame({ requestId: { "@type": "g:UUID", "@value": requestId }, op, processor: "", args }));
    };

    const answer = (requestId: string, p: Pending, msg: Answer): void => {
        const code = msg.status?.code ?? 0;
        if (code === 206 || code === 200 || code === 204) {
            p.items.push(...items(msg.result?.data));
            if (code !== 206) {
                pending.delete(requestId);
                p.resolve(p.items);
            }
            return;
        }
        if (code === 407 && login !== null) {
            send(requestId, "authentication", {
                saslMechanism: "PLAIN",
                sasl: saslPlain(login.username, login.password),
            });
            return;
        }
        pending.delete(requestId);
        const attributes = (msg.status?.attributes ?? {}) as { exceptions?: unknown };
        const exceptions = items(attributes.exceptions);
        p.reject(
            thrown(() =>
                serverError(ctx, {
                    code: typeof exceptions[0] === "string" ? exceptions[0] : String(code),
                    message: msg.status?.message ?? "",
                    status: code,
                    // malformed request, bad arguments, a script the server could not evaluate
                    showable: code === 498 || code === 499 || code === 597,
                }),
            ),
        );
    };

    socket.onmessage = (event: MessageEvent): void => {
        const { data } = event as { data: unknown };
        const text = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
        const msg = parseJson(text) as Answer | null;
        const raw = msg?.requestId;
        const id = typeof raw === "string" ? raw : String((raw as { "@value"?: unknown } | undefined)?.["@value"]);
        const p = pending.get(id);
        if (msg !== null && p !== undefined) {
            answer(id, p, msg);
        }
    };
    // until the socket opens, an error, a close or an abort fails the open; after, every pending request
    const opened = new Promise<void>((resolve, reject) => {
        const refuse = (): void => {
            reject(failure ?? unreachable());
        };
        socket.onopen = (): void => {
            ctx.signal.removeEventListener("abort", refuse);
            socket.onerror = null;
            socket.onclose = (): void => {
                failAll(unreachable());
            };
            resolve();
        };
        socket.onerror = refuse;
        socket.onclose = refuse;
        ctx.signal.addEventListener("abort", refuse, { once: true });
    });
    try {
        await opened;
    } catch (err) {
        ctx.signal.removeEventListener("abort", onAbort);
        socket.onclose = null;
        socket.close();
        throw err;
    }

    return {
        run(script, bindings): Promise<unknown[]> {
            throwIfAborted(ctx.signal);
            if (failure !== null) {
                return Promise.reject(failure);
            }
            const requestId = uuid();
            return new Promise<unknown[]>((resolve, reject) => {
                pending.set(requestId, { items: [], resolve, reject });
                send(requestId, "eval", graphson(argsOf(script, bindings, traversalSource)));
            });
        },
        close(): void {
            ctx.signal.removeEventListener("abort", onAbort);
            socket.onclose = null;
            socket.close();
        },
    };
}

/**
 * Open the transport the endpoint's scheme names.
 * @param ctx - the context
 * @param traversalSource - the alias of `g`, if any
 * @returns the transport
 */
export async function openTransport(ctx: SourceContext, traversalSource: string | undefined): Promise<Transport> {
    const endpoint =
        ctx.endpoint ??
        failOn(ctx.report, "E_SOURCE_PARAM", "the gremlin source needs an endpoint", {
            name: "endpoint",
            reason: "missing",
        });
    if (endpoint.protocol === "ws:" || endpoint.protocol === "wss:") {
        return wsTransport(ctx, endpoint, traversalSource);
    }
    if (endpoint.protocol === "http:" || endpoint.protocol === "https:") {
        return httpTransport(ctx, traversalSource);
    }
    return failOn(ctx.report, "E_SOURCE_PARAM", `${endpoint.protocol} is not an http or ws scheme`, {
        name: "endpoint",
        reason: "scheme",
    });
}

/**
 * The `bolt` transport (design sections 9 and 12.2): the official neo4j-driver, an optional peer
 * dependency imported only here. Absent, a load fails with E_SOURCE_RUNTIME (`reason:
 * "needs-peer-dependency"`). It is the only path to a Neo4j older than 5.26, such as Hetionet's 3.5.
 *
 * - Direct connections only (`bolt:`, `bolt+s:`, `bolt+ssc:`): a routing scheme would send the
 *   credential to every host the routing table lists, so `neo4j:` schemes are refused.
 * - `+ssc` accepts any certificate, so it is refused with a credential; plain `bolt:` is refused
 *   with one unless the host is this machine or `allowInsecure` is set.
 * - Statements run as auto-commit `session.run` in a READ session, never as managed transactions,
 *   which retry a server timeout for 30 s.
 * - Integers stay lossless and are converted by the type mapper; the signal closes the session.
 */

import { throwIfAborted } from "../../../common/input.js";
import { isLoopback, transportOptions } from "../../context.js";
import { originOf, unwrapCredential } from "../../credentials.js";
import { failOn } from "../../fail.js";
import { type QueryResult } from "../flatten.js";
import { type CypherProfile, profileFromAgent } from "../profiles.js";
import { type DriverTypes, fromDriver } from "../types-map.js";
import { serverError, type Transport, type TransportInput } from "./transport.js";

/** The optional peer dependency. */
const DRIVER_PACKAGE = "neo4j-driver";

/** The URL schemes of a direct Bolt connection. */
const DIRECT_SCHEMES = new Set(["bolt:", "bolt+s:", "bolt+ssc:"]);

/** The parts of a neo4j-driver session this transport uses. */
interface DriverSession {
    run(
        statement: string,
        parameters: Readonly<Record<string, unknown>>,
        config?: { readonly timeout?: number },
    ): Promise<{
        readonly records: readonly { readonly keys: readonly PropertyKey[]; get(key: PropertyKey): unknown }[];
    }>;
    close(): Promise<void>;
}

/** The parts of a neo4j-driver driver this transport uses. */
interface Driver {
    session(config: { readonly defaultAccessMode: string; readonly database?: string }): DriverSession;
    getServerInfo(): Promise<{ readonly agent?: string }>;
    close(): Promise<void>;
}

/** The parts of the neo4j-driver module this transport uses. */
interface DriverModule extends DriverTypes {
    driver(url: string, auth?: unknown, config?: Readonly<Record<string, unknown>>): Driver;
    readonly auth: { basic(user: string, password: string): unknown; bearer(token: string): unknown };
    readonly session: { readonly READ: string };
}

/**
 * Import the optional peer dependency.
 * @param input - the transport input
 * @returns the driver module
 */
async function loadDriver(input: TransportInput): Promise<DriverModule> {
    let mod: { default?: DriverModule } & Partial<DriverModule>;
    try {
        mod = (await import("neo4j-driver")) as unknown as typeof mod;
    } catch {
        return failOn(input.ctx.report, "E_SOURCE_RUNTIME", `the bolt transport needs ${DRIVER_PACKAGE} installed`, {
            runtime: input.ctx.runtime,
            reason: "needs-peer-dependency",
            package: DRIVER_PACKAGE,
        });
    }
    return mod.default ?? (mod as DriverModule);
}

/**
 * Fail when an https page would open a plain Bolt WebSocket to another machine, which the browser
 * blocks.
 * @param ctx - the context
 * @param url - the endpoint
 */
function refuseMixedContent(ctx: TransportInput["ctx"], url: URL): void {
    const page = (globalThis as { location?: { protocol?: string } }).location;
    if (
        ctx.runtime === "browser" &&
        page?.protocol === "https:" &&
        url.protocol === "bolt:" &&
        !isLoopback(url.hostname)
    ) {
        failOn(ctx.report, "E_SOURCE_RUNTIME", "an https page cannot open a plain Bolt WebSocket", {
            runtime: ctx.runtime,
            reason: "insecure-endpoint",
        });
    }
}

/**
 * Check the endpoint and the credential before connecting, and turn the credential into the
 * driver's auth token.
 * @param input - the transport input
 * @param neo4j - the driver module
 * @returns the URL and auth token
 */
async function connection(input: TransportInput, neo4j: DriverModule): Promise<{ url: URL; auth: unknown }> {
    const { ctx } = input;
    const { report } = ctx;
    const bad = (reason: string, message: string): never =>
        failOn(report, "E_SOURCE_PARAM", message, { name: "endpoint", reason });
    const url = ctx.endpoint ?? bad("missing", "the bolt transport needs an endpoint");
    if (!DIRECT_SCHEMES.has(url.protocol)) {
        bad(url.protocol.startsWith("neo4j") ? "routing" : "scheme", `${url.protocol} is not a direct Bolt scheme`);
    }
    refuseMixedContent(ctx, url);
    const { credential, allowInsecure } = transportOptions(ctx);
    const origin = originOf(url);
    const bound = credential !== undefined && (credential.origins.length === 0 || credential.origins.includes(origin));
    if (!bound || credential === undefined) {
        return { url, auth: undefined };
    }
    if (url.protocol === "bolt+ssc:") {
        bad("unverified-tls", "bolt+ssc accepts any certificate, so no credential is sent over it");
    }
    if (url.protocol === "bolt:" && !isLoopback(url.hostname) && allowInsecure !== true) {
        bad("insecure-endpoint", "a credential is never sent without TLS");
    }
    const secret = unwrapCredential(credential);
    if (secret !== undefined && "username" in secret) {
        return { url, auth: neo4j.auth.basic(secret.username, secret.password) };
    }
    if (secret !== undefined && "token" in secret) {
        const token = typeof secret.token === "string" ? secret.token : await secret.token();
        return { url, auth: neo4j.auth.bearer(token) };
    }
    return failOn(report, "E_SOURCE_PARAM", "the bolt transport takes a basic or bearer credential", {
        name: "credential",
        reason: "kind",
    });
}

/**
 * Make the transport: import the driver, check the endpoint and credential, open a READ session.
 * @param input - the context, params and mapper
 * @returns the transport
 */
export async function boltTransport(input: TransportInput): Promise<Transport> {
    const { ctx, params, m } = input;
    throwIfAborted(ctx.signal);
    const neo4j = await loadDriver(input);
    const { url, auth } = await connection(input, neo4j);
    throwIfAborted(ctx.signal);
    const origin = originOf(url);
    const { userAgent } = transportOptions(ctx);
    const driver = neo4j.driver(`${url.protocol}//${url.host}`, auth, userAgent === undefined ? {} : { userAgent });
    const session = driver.session({
        defaultAccessMode: neo4j.session.READ,
        ...(params.database === undefined ? {} : { database: params.database }),
    });
    let closed: Promise<void> | null = null;
    const close = (): Promise<void> => {
        closed ??= session
            .close()
            .catch(() => undefined)
            .then(() => driver.close())
            .catch(() => undefined);
        return closed;
    };
    const onAbort = (): void => {
        void close();
    };
    ctx.signal.addEventListener("abort", onAbort, { once: true });

    const fail = (err: unknown): never => {
        throwIfAborted(ctx.signal);
        const e = err as { code?: unknown; message?: unknown };
        const code = typeof e.code === "string" ? e.code : null;
        if (code === null || code === "ServiceUnavailable" || code === "SessionExpired") {
            return ctx.runtime === "browser"
                ? failOn(ctx.report, "E_SOURCE_BLOCKED", `${origin} could not be reached over Bolt`, {
                      url: origin,
                      cause: "unknown",
                  })
                : failOn(ctx.report, "E_FETCH", `${origin} could not be reached over Bolt`, {
                      url: origin,
                      status: null,
                  });
        }
        return serverError(
            ctx.report,
            {
                code,
                message: typeof e.message === "string" ? e.message : "",
                status: null,
                showable: code.startsWith("Neo.ClientError."),
            },
            origin,
            params.database,
        );
    };

    let detected: CypherProfile | null = null;
    const profile = async (): Promise<CypherProfile> => {
        if (detected === null) {
            const info = await driver.getServerInfo().catch(fail);
            detected = profileFromAgent(info.agent ?? "");
        }
        return detected;
    };
    const timeout = ctx.limits.timeoutMs;

    return {
        async run(statement, parameters): Promise<QueryResult> {
            throwIfAborted(ctx.signal);
            const result = await session
                .run(statement, parameters, timeout === undefined ? undefined : { timeout })
                .catch(fail);
            const fields = (result.records[0]?.keys ?? []).map(String);
            return {
                fields,
                rows: result.records.map((r) => fields.map((k) => fromDriver(r.get(k), k, m, neo4j))),
            };
        },
        profile,
        probe: profile,
        close: async (): Promise<void> => {
            ctx.signal.removeEventListener("abort", onAbort);
            await close();
        },
    };
}

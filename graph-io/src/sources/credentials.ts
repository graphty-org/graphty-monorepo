/**
 * Credentials (design section 6): objects made by factories, holding their secret where no code
 * can read it back. graph-io applies a credential inside `ctx.fetch`, only to the origins it is
 * bound to, and keeps nothing after a load settles.
 *
 * Experimental, with the source contract.
 */

import { failAlone } from "./fail.js";
import { type AwsCredentials, type Credential, type CredentialKind } from "./types.js";

/**
 * Where a credential may go: the load's endpoint origin by default. Experimental.
 * @category Network sources
 */
export interface CredentialBind {
    /** The origins (scheme, host and port) it may be sent to. */
    readonly origins?: readonly string[] | undefined;
}

/**
 * The options of `credentials.awsSigV4`. Experimental.
 * @category Network sources
 */
export interface AwsSigV4Options {
    /** The AWS region ("us-east-1"). */
    readonly region: string;
    /** The signing service: "neptune-db" (default) or "neptune-graph" for Neptune Analytics. */
    readonly service?: string | undefined;
    /** The credentials, or a function returning fresh ones per request. */
    readonly credentials: AwsCredentials | (() => Promise<AwsCredentials>);
}

/** What only graph-io's own code can read about a credential. */
type Secret =
    | { readonly kind: "bearer"; readonly token: string | (() => Promise<string>) }
    | { readonly kind: "basic"; readonly username: string; readonly password: string }
    | {
          readonly kind: "api-key";
          readonly header: string | null;
          readonly query: string | null;
          readonly value: string;
      }
    | { readonly kind: "aws-sigv4"; readonly options: AwsSigV4Options }
    | {
          readonly kind: "custom";
          readonly name: string;
          readonly apply: (request: Request) => Promise<Request> | Request;
      };

/** The secrets, by credential; a WeakMap so nothing reachable from the object holds them. */
const SECRETS = new WeakMap<Credential, Secret>();

/** The key Node's util.inspect looks up. */
const INSPECT = Symbol.for("nodejs.util.inspect.custom");

/**
 * The scheme, host and port of a URL. `URL.origin` is "null" for schemes such as bolt+s:, so this
 * is used everywhere instead.
 * @param url - the URL
 * @returns the origin string
 */
export function originOf(url: URL): string {
    return `${url.protocol}//${url.host}`;
}

/**
 * Normalize the origins a credential is bound to.
 * @param bind - the bind option
 * @returns the normalized origins
 */
function bindOrigins(bind: CredentialBind | undefined): readonly string[] {
    return Object.freeze(
        (bind?.origins ?? []).map((o) => {
            let url: URL;
            try {
                url = new URL(o);
            } catch {
                return failAlone("E_SOURCE_PARAM", `credential origin ${JSON.stringify(o)} is not a URL`, {
                    name: "origins",
                    reason: "origin",
                });
            }
            return originOf(url);
        }),
    );
}

/** The object every factory returns: kind and origins visible, the secret in SECRETS. */
class SourceCredential implements Credential {
    readonly kind: CredentialKind;
    readonly origins: readonly string[];
    readonly username: string | undefined;

    /**
     * Create one; only the factories do.
     * @param secret - the secret
     * @param bind - the origins it is bound to
     */
    constructor(secret: Secret, bind: CredentialBind | undefined) {
        this.kind = secret.kind === "custom" ? secret.name : secret.kind;
        this.origins = bindOrigins(bind);
        this.username = secret.kind === "basic" ? secret.username : undefined;
        SECRETS.set(this, secret);
        Object.freeze(this);
    }

    /**
     * What JSON.stringify writes: never the secret.
     * @returns kind, origins and a basic credential's user name
     */
    toJSON(): Record<string, unknown> {
        return this.username === undefined
            ? { kind: this.kind, origins: this.origins }
            : { kind: this.kind, origins: this.origins, username: this.username };
    }

    /**
     * What util.inspect and console.log show in Node: never the secret.
     * @returns the same as toJSON
     */
    [INSPECT](): Record<string, unknown> {
        return this.toJSON();
    }

    /**
     * What string conversion shows: never the secret.
     * @returns a description
     */
    toString(): string {
        return `[Credential ${this.kind}]`;
    }
}

/**
 * Base64 of a string's UTF-8 bytes.
 * @param text - the text
 * @returns base64
 */
function base64(text: string): string {
    let binary = "";
    for (const b of new TextEncoder().encode(text)) {
        binary += String.fromCodePoint(b);
    }
    return btoa(binary);
}

/**
 * The factories that make credentials. Pass the result as the `credential` option of a load; it is
 * sent only to the load's endpoint origin, or to `bind.origins` when you give them. Experimental.
 * @example
 * ```ts
 * await loadFromSource("people", { team: "core" }, {
 *     endpoint: "https://example.com",
 *     credential: credentials.bearer(token),
 * });
 * ```
 * @category Network sources
 */
export const credentials = Object.freeze({
    /**
     * An `Authorization: Bearer` token, or a function returning a fresh one per request.
     * @param token - the token or a function returning it
     * @param bind - the origins it may be sent to
     * @returns the credential
     */
    bearer(token: string | (() => Promise<string>), bind?: CredentialBind): Credential {
        return new SourceCredential({ kind: "bearer", token }, bind);
    },
    /**
     * HTTP basic authentication (a database user and password).
     * @param username - the user name
     * @param password - the password
     * @param bind - the origins it may be sent to
     * @returns the credential
     */
    basic(username: string, password: string, bind?: CredentialBind): Credential {
        return new SourceCredential({ kind: "basic", username, password }, bind);
    },
    /**
     * An API key sent in a request header or a query parameter.
     * @param where - `{ header: "X-Api-Key" }` or `{ query: "api_key" }`
     * @param value - the key
     * @param bind - the origins it may be sent to
     * @returns the credential
     */
    apiKey(
        where: { readonly header: string } | { readonly query: string },
        value: string,
        bind?: CredentialBind,
    ): Credential {
        const header = "header" in where ? where.header : null;
        const query = "query" in where ? where.query : null;
        return new SourceCredential({ kind: "api-key", header, query, value }, bind);
    },
    /**
     * AWS Signature Version 4 (Amazon Neptune). The signer loads on first use.
     * @param options - region, service and the credentials or a provider of them
     * @param bind - the origins it may be sent to
     * @returns the credential
     */
    awsSigV4(options: AwsSigV4Options, bind?: CredentialBind): Credential {
        return new SourceCredential({ kind: "aws-sigv4", options }, bind);
    },
    /**
     * Anything else: a function that returns the request with its authentication added. The
     * request's origin must not change.
     * @param apply - adds the authentication
     * @param kind - what to call it in `credential.kind`
     * @param bind - the origins it may be sent to
     * @returns the credential
     */
    custom(apply: (request: Request) => Promise<Request> | Request, kind: string, bind?: CredentialBind): Credential {
        return new SourceCredential({ kind: "custom", name: kind, apply }, bind);
    },
});

/**
 * The secret of a credential made by the factories, or undefined for any other object.
 * @param credential - the credential
 * @returns the secret
 */
function secretOf(credential: Credential): Secret | undefined {
    return SECRETS.get(credential);
}

/**
 * Whether an object is a credential made by the `credentials` factories.
 * @param value - the value
 * @returns true for a factory-made credential
 */
export function isCredential(value: unknown): value is Credential {
    return typeof value === "object" && value !== null && secretOf(value as Credential) !== undefined;
}

/**
 * The request header a credential sets, for the browser checks; null for a query key or a custom one.
 * @param credential - the credential
 * @returns the header name, lowercase
 */
export function credentialHeader(credential: Credential): string | null {
    const secret = secretOf(credential);
    if (secret?.kind === "api-key") {
        return secret.header?.toLowerCase() ?? null;
    }
    return secret?.kind === "bearer" || secret?.kind === "basic" || secret?.kind === "aws-sigv4"
        ? "authorization"
        : null;
}

/**
 * Add a credential to a request. Internal to graph-io: only `ctx.fetch` calls it.
 * @param credential - the credential
 * @param request - the request
 * @returns the request with its authentication
 */
export async function applyCredential(credential: Credential, request: Request): Promise<Request> {
    const secret = secretOf(credential);
    if (secret === undefined) {
        return failAlone("E_SOURCE_PARAM", "the credential was not made by the credentials factories", {
            name: "credential",
            reason: "type",
        });
    }
    switch (secret.kind) {
        case "bearer": {
            const token = typeof secret.token === "string" ? secret.token : await secret.token();
            const headers = new Headers(request.headers);
            headers.set("Authorization", `Bearer ${token}`);
            return new Request(request, { headers });
        }
        case "basic": {
            const headers = new Headers(request.headers);
            const pair = `${secret.username}:${secret.password}`;
            headers.set("Authorization", `Basic ${base64(pair)}`);
            return new Request(request, { headers });
        }
        case "api-key": {
            if (secret.header !== null) {
                const headers = new Headers(request.headers);
                headers.set(secret.header, secret.value);
                return new Request(request, { headers });
            }
            const url = new URL(request.url);
            url.searchParams.set(secret.query ?? "api_key", secret.value);
            return new Request(url, request);
        }
        case "aws-sigv4": {
            const { signRequest } = await import("./sigv4.js");
            return signRequest(request, secret.options);
        }
        case "custom":
            return secret.apply(request);
        default:
            return request;
    }
}

/**
 * The raw secret, for a transport that must hand it to a driver (Bolt). Internal to graph-io; the
 * caller applies the origin and TLS rules itself.
 * @param credential - the credential
 * @returns the kind and the values the driver needs
 */
export function unwrapCredential(
    credential: Credential,
):
    | { readonly kind: "basic"; readonly username: string; readonly password: string }
    | { readonly kind: "bearer"; readonly token: string | (() => Promise<string>) }
    | { readonly kind: CredentialKind }
    | undefined {
    const secret = secretOf(credential);
    if (secret?.kind === "basic") {
        return { kind: "basic", username: secret.username, password: secret.password };
    }
    if (secret?.kind === "bearer") {
        return { kind: "bearer", token: secret.token };
    }
    return secret === undefined ? undefined : { kind: credential.kind };
}

/**
 * Whether a credential can be remembered: its secret is a plain value, not a function. A token
 * refresher, a custom credential and an AWS provider cannot.
 * @param credential - the credential
 * @returns true for basic, a bearer string token and an API key
 */
export function isStorableCredential(credential: Credential): boolean {
    const secret = secretOf(credential);
    return (
        secret?.kind === "basic" ||
        secret?.kind === "api-key" ||
        (secret?.kind === "bearer" && typeof secret.token === "string")
    );
}

/**
 * The plain parts of a credential that can be remembered. Experimental.
 * @category Network sources
 */
export type StorableCredential =
    | {
          /** A user name and password, sent as HTTP Basic authentication. */
          readonly kind: "basic";
          /** The user name. */
          readonly username: string;
          /** The password. */
          readonly password: string;
      }
    | {
          /** A bearer token, sent in the Authorization header. */
          readonly kind: "bearer";
          /** The token. */
          readonly token: string;
      }
    | {
          /** An API key, sent in a header or a query parameter. */
          readonly kind: "api-key";
          /** The header that carries the key, or null when a query parameter does. */
          readonly header: string | null;
          /** The query parameter that carries the key, or null when a header does. */
          readonly query: string | null;
          /** The key. */
          readonly value: string;
      };

/**
 * The parts of a credential a credential store saves (graphty-element's `CredentialStore` is the
 * one caller), or null when it cannot be saved: a token function, an AWS provider or a custom
 * credential. The result HOLDS THE SECRET: never log it, and keep it only where you would keep the
 * password itself. `fromStorableCredential` makes the credential again. Experimental.
 * @param credential - a credential made by the `credentials` factories
 * @returns the parts, or null
 * @category Network sources
 */
export function storableCredential(credential: Credential): StorableCredential | null {
    const secret = secretOf(credential);
    switch (secret?.kind) {
        case "basic":
            return { kind: "basic", username: secret.username, password: secret.password };
        case "api-key":
            return { kind: "api-key", header: secret.header, query: secret.query, value: secret.value };
        case "bearer":
            return typeof secret.token === "string" ? { kind: "bearer", token: secret.token } : null;
        default:
            return null;
    }
}

/**
 * The credential `storableCredential` took apart, bound to the origins given. Experimental.
 * @param parts - what `storableCredential` returned
 * @param bind - the origins it may be sent to
 * @returns the credential
 * @category Network sources
 */
export function fromStorableCredential(parts: StorableCredential, bind?: CredentialBind): Credential {
    switch (parts.kind) {
        case "basic":
            return credentials.basic(parts.username, parts.password, bind);
        case "bearer":
            return credentials.bearer(parts.token, bind);
        default:
            return new SourceCredential(
                { kind: "api-key", header: parts.header, query: parts.query, value: parts.value },
                bind,
            );
    }
}

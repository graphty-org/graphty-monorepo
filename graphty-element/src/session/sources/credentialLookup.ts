/**
 * @file The credential a source call uses when none is passed: the one remembered for the source,
 * the origin about to be contacted and the source's credential slot (sources.md, "Credential
 * slots"). `<graphty-element>` attaches its credential store to its session's data surface; a
 * session with nothing attached finds nothing.
 */

import { type Credential, credentials, credentialSlots, registry, type SourceCredentialSlot } from "@graphty/graph-io";

/** What answers a lookup: a credential store's `lookup`. */
export type CredentialResolver = (source: string, origin: string, slot: string) => Promise<Credential | undefined>;

/** The resolver of each data surface. */
const RESOLVERS = new WeakMap<object, CredentialResolver>();

/** The slot name of a source that takes no credential, or declares none. */
const DEFAULT_SLOT = "default";

/**
 * Attach the resolver a data surface's source calls look credentials up with.
 * @param owner - the session's data surface
 * @param resolver - the lookup
 */
export function attachCredentials(owner: object, resolver: CredentialResolver): void {
    RESOLVERS.set(owner, resolver);
}

/**
 * The credential slot a load from a source fills: its descriptor's first.
 * ponytail: one slot per load; a source declaring several would need the caller to name one.
 * @param source - the source id
 * @returns the slot, or undefined for a source that takes no credential
 */
export function slotOf(source: string): SourceCredentialSlot | undefined {
    return credentialSlots(registry.listSources().find((info) => info.id === source)?.descriptor)[0];
}

/**
 * The name of the slot a load from a source fills.
 * @param source - the source id
 * @returns the name; `default` for a source that declares none
 */
export function slotNameOf(source: string): string {
    return slotOf(source)?.name ?? DEFAULT_SLOT;
}

/**
 * The remembered credential for a source, an origin and the source's slot; else the login an
 * example of the source publishes for everyone there.
 * @param owner - the session's data surface
 * @param source - the source id
 * @param origin - the origin about to be contacted
 * @param params - the load's params, which pick among several examples at one origin
 * @returns the credential, or undefined
 */
export async function resolve(
    owner: object,
    source: string,
    origin: string,
    params?: Readonly<Record<string, unknown>>,
): Promise<Credential | undefined> {
    return (await RESOLVERS.get(owner)?.(source, origin, slotNameOf(source))) ?? publicLogin(source, origin, params);
}

/**
 * The scheme, host and port of an endpoint. Not `URL.origin`, which is the string "null" for a
 * scheme that is not special (`bolt+s://`, `neo4j://`).
 * @param endpoint - the endpoint
 * @returns the origin
 */
export function originOf(endpoint: string): string {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}`;
}

/**
 * The login an example of the source publishes for everyone at that origin, so an example's next
 * page, refresh and expansions reach the service its first load did. Several examples at one
 * origin (the Neo4j demo server's databases, each with its own login) are told apart by their
 * `database` param.
 * ponytail: matches on `database` only; compare every example param when a source needs more.
 * @param source - the source id
 * @param origin - the origin about to be contacted
 * @param params - the load's params
 * @returns the credential, or undefined when no example there publishes one
 */
function publicLogin(
    source: string,
    origin: string,
    params: Readonly<Record<string, unknown>> | undefined,
): Credential | undefined {
    const descriptor = registry.listSources().find((info) => info.id === source)?.descriptor;
    const here = (descriptor?.examples ?? []).filter((example) => {
        const endpoint = example.endpoint ?? descriptor?.defaultEndpoint;
        return example.publicLogin !== undefined && typeof endpoint === "string" && originOf(endpoint) === origin;
    });
    const login = (here.find((example) => example.params.database === params?.database) ?? here[0])?.publicLogin;
    return login === undefined ? undefined : credentials.basic(login.username, login.password);
}

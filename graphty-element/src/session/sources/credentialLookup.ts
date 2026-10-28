/**
 * @file The credential a source call uses when none is passed: the one remembered for the source,
 * the origin about to be contacted and the source's credential slot (sources.md, "Credential
 * slots"). `<graphty-element>` attaches its credential store to its session's data surface; a
 * session with nothing attached finds nothing.
 */

import { type Credential, credentials, credentialSlots, registry, type SourceCredentialSlot } from "@graphty/graph-io";

import { ensureGraphSamplesSource } from "../../data/graphSamplesSource";

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
    ensureGraphSamplesSource();
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
 * The remembered credential for a source, an origin and the source's slot.
 * @param owner - the session's data surface
 * @param source - the source id
 * @param origin - the origin about to be contacted
 * @returns the credential, or undefined
 */
export async function resolve(owner: object, source: string, origin: string): Promise<Credential | undefined> {
    return (await RESOLVERS.get(owner)?.(source, origin, slotNameOf(source))) ?? publicLogin(source, origin);
}

/**
 * The login a sample of the source publishes for everyone at that origin, so a sample's next
 * page, refresh and expansions reach the service its first load did.
 * @param source - the source id
 * @param origin - the origin about to be contacted
 * @returns the credential, or undefined when no sample there publishes one
 */
function publicLogin(source: string, origin: string): Credential | undefined {
    ensureGraphSamplesSource();
    const descriptor = registry.listSources().find((info) => info.id === source)?.descriptor;
    for (const sample of descriptor?.samples ?? []) {
        const endpoint = sample.endpoint ?? descriptor?.defaultEndpoint;
        const login = sample.publicLogin;
        if (login !== undefined && typeof endpoint === "string" && new URL(endpoint).origin === origin) {
            return credentials.basic(login.username, login.password);
        }
    }

    return undefined;
}

/**
 * @file The credential a source call uses when none is passed: the one remembered for the source
 * and the origin about to be contacted. `<graphty-element>` attaches its credential store to its
 * session's data surface; a session with nothing attached finds nothing.
 */

import type { Credential } from "@graphty/graph-io";

/** What answers a lookup: a credential store's `lookup`. */
export type CredentialResolver = (source: string, origin: string) => Promise<Credential | undefined>;

/** The resolver of each data surface. */
const RESOLVERS = new WeakMap<object, CredentialResolver>();

/**
 * Attach the resolver a data surface's source calls look credentials up with.
 * @param owner - the session's data surface
 * @param resolver - the lookup
 */
export function attachCredentials(owner: object, resolver: CredentialResolver): void {
    RESOLVERS.set(owner, resolver);
}

/**
 * The remembered credential for a source and an origin.
 * @param owner - the session's data surface
 * @param source - the source id
 * @param origin - the origin about to be contacted
 * @returns the credential, or undefined
 */
export async function resolve(owner: object, source: string, origin: string): Promise<Credential | undefined> {
    return RESOLVERS.get(owner)?.(source, origin);
}

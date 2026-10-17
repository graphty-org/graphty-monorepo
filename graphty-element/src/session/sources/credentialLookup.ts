/**
 * @file The credential a source call uses when none is passed: the element's credential store,
 * looked up by the source and the origin about to be contacted. The store is not built yet, so
 * nothing is found.
 */

import type { Credential } from "@graphty/graph-io";

/**
 * The remembered credential for a source and an origin.
 * @param _source - the source id
 * @param _origin - the origin about to be contacted
 * @returns the credential, or undefined (always, until the credential store lands)
 */
export function resolve(_source: string, _origin: string): Credential | undefined {
    return undefined;
}

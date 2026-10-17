/**
 * @file Loading from a network source through `session.data`: `import({ source, config })`, the
 * probe and the search, `more`, and the pending loads of an opened project. Not built yet: each
 * call rejects with `E_SOURCE_UNSUPPORTED` and changes nothing.
 */

import type { SourceListing, SourceListQuery, SourceProbe } from "@graphty/graph-io";

import { notBuiltYet } from "./errors";
import type { SourceHost } from "./host";
import type { PendingSourceLoad, SourceInput, SourceLoadOptions } from "./types";

/**
 * Load from a source as one undoable step.
 * @param _host - the session pieces
 * @param _input - the source and its params
 * @param _options - the load options
 * @returns rejects with E_SOURCE_UNSUPPORTED
 */
export function importSource(_host: SourceHost, _input: SourceInput, _options: SourceLoadOptions): Promise<void> {
    return Promise.reject(notBuiltYet("loading"));
}

/**
 * Check a source's params and credential.
 * @param _host - the session pieces
 * @param _input - the source and its params
 * @param _options - the credential and endpoint
 * @returns rejects with E_SOURCE_UNSUPPORTED
 */
export function testSource(_host: SourceHost, _input: SourceInput, _options: SourceLoadOptions): Promise<SourceProbe> {
    return Promise.reject(notBuiltYet("testing"));
}

/**
 * Search what a source holds.
 * @param _host - the session pieces
 * @param _input - the source and its params
 * @param _query - the search
 * @param _options - the credential and endpoint
 * @returns rejects with E_SOURCE_UNSUPPORTED
 */
export function listSource(
    _host: SourceHost,
    _input: SourceInput,
    _query: Omit<SourceListQuery<Record<string, unknown>>, "params">,
    _options: SourceLoadOptions,
): Promise<SourceListing> {
    return Promise.reject(notBuiltYet("searching"));
}

/**
 * Load the next page after a capped load.
 * @param _host - the session pieces
 * @param _options - the load options
 * @returns rejects with E_SOURCE_UNSUPPORTED
 */
export function more(_host: SourceHost, _options: SourceLoadOptions): Promise<void> {
    return Promise.reject(notBuiltYet("loading more"));
}

/**
 * The source loads an opened project holds but has not run.
 * @param _host - the session pieces
 * @returns none yet
 */
export function pendingSourceLoads(_host: SourceHost): readonly PendingSourceLoad[] {
    return [];
}

/**
 * Run one pending source load.
 * @param _host - the session pieces
 * @param _id - the load's key
 * @param _options - the credential
 * @returns rejects with E_SOURCE_UNSUPPORTED
 */
export function runPendingSourceLoad(_host: SourceHost, _id: string, _options: SourceLoadOptions): Promise<void> {
    return Promise.reject(notBuiltYet("running a saved load"));
}

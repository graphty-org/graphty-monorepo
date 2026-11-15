/**
 * @file Element references and the data binding for the open data (spec 6): owned by the data
 * codec, used by every bound section through the framing's context. Experimental (`save-files-v2`).
 */

import type { GraphSession } from "../../types";
import { notImplemented, throwNotImplemented } from "../notImplemented";
import type { ElementRefs } from "../types";

/**
 * Element references for the session's data as it is now (spec 6.1 to 6.3).
 * @param _session - The session.
 * @returns The references, both ways.
 */
export function elementRefsOf(_session: GraphSession): ElementRefs {
    return throwNotImplemented("data.refs");
}

/**
 * The content hash of every source, the reader source included, and the fingerprint (spec 6.4).
 * @param _session - The session.
 * @returns `bindsTo.sources` and `bindsTo.fingerprint` of a results section.
 */
export function dataBindingOf(
    _session: GraphSession,
): Promise<{ readonly sources: Readonly<Record<string, string>>; readonly fingerprint: string }> {
    return Promise.reject(notImplemented("data.binding"));
}

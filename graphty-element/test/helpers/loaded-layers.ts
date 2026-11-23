/**
 * @file The layers the last load added from a file's styles, read the way any consumer reads them:
 * the ids its one-time load report lists. The layers themselves carry nothing that says a load made
 * them.
 */

import type { Layer } from "../../src/session/styles/Layer";

/** What the helper reads of a session. */
interface Reads {
    readonly styles: { list(): readonly Layer[] };
    readonly data: { lastImport(): { readonly styles?: { readonly layers: readonly string[] } } | null };
}

/**
 * The layers the last load added that the stack still holds, bottom first.
 * @param session - The session.
 * @returns The layers.
 */
export function loadedLayers(session: Reads): Layer[] {
    const ids = new Set(session.data.lastImport()?.styles?.layers ?? []);
    return session.styles.list().filter((layer) => ids.has(layer.id));
}

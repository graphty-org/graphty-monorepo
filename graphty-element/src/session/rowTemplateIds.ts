/**
 * @file The built-in row template ids, for the saved-name scan. Kept out of styles/ because it only
 * lists the ids a save file may name; it never treats a layer differently from another.
 */
import { LEGACY_GHOST_ROW_ID, startingRows } from "./styles/rows";

/**
 * The built-in row templates code branches on, for the saved-name scan: a save file that names one by id depends on this
 * build still shipping it (design/architecture/self-contained-save-files.md, section 2.2).
 * Exported, and so tagged public, because test/saved-format/builtInIds.ts finds and loads it by reading the source.
 * @returns The kind and its ids.
 * @public
 */
export function builtInIdsForTesting(): { kind: string; ids: readonly string[] } {
    return {
        kind: "rowTemplates",
        ids: [
            ...startingRows({
                selection: { color: "", scale: 0, edgeColor: "", edgeScale: 0 },
                pinned: { color: "", scale: 0, opacity: 0 },
            }).map((row) => row.templateId),
            ...startingRows({ timelineHidden: "hidden" }).map((row) => row.templateId),
            LEGACY_GHOST_ROW_ID,
        ],
    };
}

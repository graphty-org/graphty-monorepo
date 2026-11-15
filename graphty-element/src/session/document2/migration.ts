/**
 * @file Version 1 files to version 2 (spec 9.1). Experimental (`save-files-v2`).
 *
 * Called by `project.open` only with the experiment on and `migrate: true`; each function returns
 * undefined for anything it does not migrate, and the file is then read as before.
 */

import type { DocumentProblem, DocumentSection, JsonObject } from "./types";

/**
 * A version 1 file as a version 2 full file: the nine-member `graphty-document` version 1, a bare
 * version 1 member, or the kind-less style graphty-element 2.x wrote.
 * @param _value - The parsed file.
 * @param _problems - Collects `W_SECTION_UPGRADED` and what could not be carried over.
 * @returns The version 2 full file, or undefined to read the file as before.
 */
export function migrateDocument1(_value: JsonObject, _problems: DocumentProblem[]): JsonObject | undefined {
    return undefined;
}

/**
 * A section of a version 2 file written at an older version than its codec reads, upgraded.
 * @param _section - The section.
 * @param _value - The section as read.
 * @param _problems - Collects `W_SECTION_UPGRADED`.
 * @returns The upgraded section, or undefined to hold it as it is.
 */
export function migrateSection(
    _section: DocumentSection,
    _value: JsonObject,
    _problems: DocumentProblem[],
): JsonObject | undefined {
    return undefined;
}

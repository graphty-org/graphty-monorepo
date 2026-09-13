/**
 * The inspector's bridge to the shell store's tier 2 section map.
 *
 * A region never keeps its own copy of a section's open state: the map in
 * `ShellContext` is one of the four things 6.5 persists, and its keys are shell-wide
 * unique strings (`inspector.counts`, `inspector.schema`, ...). This module is the one
 * place the inspector reaches for it, so every section in the column is remembered the
 * same way.
 */

import { useCallback } from "react";

import { useShell } from "../ShellContext";

/**
 * One section's open state and the handler that writes it back to the store.
 *
 * {@link useInspectorSection}'s return.
 * @public
 */
export interface InspectorSectionState {
    /** Whether the section is currently expanded. */
    readonly opened: boolean;
    /** Records a new open state against this section's id. */
    readonly onOpenChange: (opened: boolean) => void;
}

/**
 * Reads and writes one tier 2 section's open state through the shell store.
 * @param sectionId - the shell-wide unique section id, from `INSPECTOR_SECTION_IDS`.
 * @param defaultOpen - the section's resting state before the user has touched it.
 * @returns the section's current open state and its change handler.
 */
export function useInspectorSection(sectionId: string, defaultOpen: boolean): InspectorSectionState {
    const { isSectionOpen, setSectionOpen } = useShell();
    const opened = isSectionOpen(sectionId, defaultOpen);

    const onOpenChange = useCallback(
        (next: boolean): void => {
            setSectionOpen(sectionId, next);
        },
        [sectionId, setSectionOpen],
    );

    return { opened, onOpenChange };
}

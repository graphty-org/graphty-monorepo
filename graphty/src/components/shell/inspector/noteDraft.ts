/**
 * The note the reader is still typing, kept with their work.
 *
 * A note is graphty-element's once it is added; until then its text lives only in the input.
 * The shell hands every note input this context, which stashes the text through the element's
 * autosave (`autosaver.stash`) and hands back what the last visit left, so a half-typed note
 * survives a reload, a closed tab or a crash with the rest of the work. Without a provider the
 * inputs behave as they always did.
 */

import { createContext } from "react";

/** The stash name graphty-element keeps the draft under. */
export const NOTE_DRAFT_STASH = "app.graphty.note-draft";

/** A half-typed note: which input it was typed in, and its text. */
export interface NoteDraft {
    /** The input: `graph`, `node:<id>` or `edge:<id>`. */
    readonly where: string;
    readonly text: string;
}

/** What a note input reads and writes. */
export interface NoteDraftKeeper {
    /** The draft the last visit left, once the element has restored it; null otherwise. */
    readonly restored: NoteDraft | null;
    /** Keeps the text typed in one input (an empty text clears it). */
    readonly keep: (draft: NoteDraft) => void;
}

/** The keeper, or null outside a shell that autosaves. */
export const NoteDraftContext = createContext<NoteDraftKeeper | null>(null);

/**
 * Reads a stashed value as a draft, refusing anything else.
 * @param value - what the element's stash held.
 * @returns the draft, or null.
 */
export function asNoteDraft(value: unknown): NoteDraft | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }
    const { where, text } = value as Record<string, unknown>;
    return typeof where === "string" && typeof text === "string" && text !== "" ? { where, text } : null;
}

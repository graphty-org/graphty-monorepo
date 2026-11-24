/**
 * Autosave's hooks into a session's open draft of the sources and steps (`data.draft()`, the
 * source-steps experiment). Kept apart from the data model so autosave, which the landing page
 * loads, does not pull it in.
 * @module
 */

/**
 * An open source draft as autosave keeps it: each state it went through (the oldest first, the
 * current one last, so Undo still steps back), the rows as read of the sources it staged, and how
 * it is drawn. Plain JSON.
 */
export interface SavedSourceDraft {
    readonly askOverlap: boolean;
    readonly shown: { readonly on: boolean; readonly side: "before" | "after" };
    /** Each state: its value, the copies it reads by id, and the draft's bookkeeping. */
    readonly states: readonly unknown[];
    /** The rows as read of the sources the draft staged, by copy id. */
    readonly copies: Readonly<Record<string, unknown>>;
}

/** What autosave reads of a session's open source draft: an internal hook, on no public type. */
export interface SourceDraftHooks {
    /** The open draft, as autosave keeps it, or null when none is open. */
    saved(): SavedSourceDraft | null;
    /**
     * Open a kept draft again over the committed sources and steps.
     * @returns False when it could not be (the experiment is off, a draft is open, or the rows it
     *   read are gone).
     */
    reopen(saved: SavedSourceDraft): Promise<boolean>;
}

const HOOKS = new WeakMap<object, SourceDraftHooks>();

/**
 * Give a data model its source-draft hooks; the session's data model calls it once.
 * @param data - The model.
 * @param hooks - Its hooks.
 */
export function setSourceDraftHooks(data: object, hooks: SourceDraftHooks): void {
    HOOKS.set(data, hooks);
}

/**
 * The source-draft hooks of a data model.
 * @param data - The model.
 * @returns Its hooks, or undefined for an object the session did not make.
 */
export function sourceDraftHooks(data: object): SourceDraftHooks | undefined {
    return HOOKS.get(data);
}

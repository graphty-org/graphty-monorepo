/**
 * Autosave's hooks into a visibility model's open filter drafts. Kept apart from VisibilityApi so
 * autosave, which the landing page loads, does not pull the whole filter model in with it.
 * @module
 */
import type { FilterCondition } from "../../catalog/types";
import type { VisibilityApi } from "./VisibilityApi";

/**
 * An open filter draft as autosave keeps it: a draft of a new condition holds the condition whole,
 * a draft of an existing condition holds its id and the edits it made, so a write that landed on
 * the condition meanwhile is kept.
 */
export type SavedFilterDraft =
    | { readonly condition: FilterCondition }
    | { readonly id: string; readonly edits: Partial<Omit<FilterCondition, "id">> };

/** What autosave reads of a visibility model's open drafts: an internal hook, on no public type. */
export interface FilterDraftHooks {
    /** The open drafts, as autosave keeps them. */
    saved(): SavedFilterDraft[];
    /** Called each time a draft opens, changes, commits or is canceled. */
    readonly changed: Set<() => void>;
}

const DRAFT_HOOKS = new WeakMap<object, FilterDraftHooks>();

/**
 * Give a visibility model its open-draft hooks; `createVisibilityApi` calls it once per model.
 * @param visibility - The model.
 * @param hooks - Its hooks.
 */
export function setFilterDraftHooks(visibility: object, hooks: FilterDraftHooks): void {
    DRAFT_HOOKS.set(visibility, hooks);
}

/**
 * The open-draft hooks of a visibility model.
 * @param visibility - The model, as `createVisibilityApi` made it.
 * @returns Its hooks, or undefined for an object no `createVisibilityApi` made.
 */
export function filterDraftHooks(visibility: object): FilterDraftHooks | undefined {
    return DRAFT_HOOKS.get(visibility);
}

/**
 * Open again drafts autosave kept. A draft whose condition is gone, or whose new condition's id is
 * taken by now, is dropped.
 * @param visibility - The model.
 * @param saved - The drafts.
 * @returns The ids of the conditions whose drafts were dropped.
 */
export function reopenFilterDrafts(visibility: VisibilityApi, saved: readonly SavedFilterDraft[]): string[] {
    const dropped: string[] = [];
    for (const each of saved) {
        const id = "id" in each ? each.id : each.condition.id;
        try {
            if (visibility.draftOf(id) !== null) {
                continue;
            }
            if ("id" in each) {
                visibility.draft(each.id).update(each.edits);
            } else {
                visibility.draft(each.condition);
            }
        } catch {
            dropped.push(id);
        }
    }
    return dropped;
}

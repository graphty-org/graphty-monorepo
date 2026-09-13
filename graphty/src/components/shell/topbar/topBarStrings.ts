/**
 * Every string the top bar draws, and the builders that assemble the titles.
 *
 * The strings are character for character what build spec 02
 * (tmp/shell-spec/02-bars-and-rail.md) sections 2.2 to 2.5 and section 8 print, and
 * the register (design/ui/mockups/system/REGISTER-1.5.md) is their source. Nothing
 * here is invented copy.
 *
 * Key chips never appear as literals: they come from `keyChipFor` (spec 04 section
 * 10.3, which allows a binding in exactly four places, a control's tooltip being one
 * of them). The `apple` parameter every builder carries is the one the binding table
 * exposes, so a test can pin the platform spelling without pinning the platform.
 *
 * Accessible names are the tooltip with the key chip removed (spec 04 section 8.2),
 * which is why each builder has an accessible-name twin rather than a caller
 * stripping the chip itself.
 */

import { isApplePlatform, keyChipFor } from "../bindings";

/* -------------------------------------------------------------------------- */
/* Fixed strings                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The command palette pill's text -- the same string on every screen (5.5).
 * Spec 02 section 2.3.
 */
export const PALETTE_PILL_TEXT = "Search commands, nodes and edges";

/**
 * The undo verb, which a toggle-free title is built from. Spec 02 section 8. The one home for
 * the verb, so the button, its title and its accessible name are built from one word.
 * @public
 */
export const UNDO_VERB = "Undo";

/**
 * The redo verb. Spec 02 section 8. The one home for the verb, so the button, its title and its
 * accessible name are built from one word.
 * @public
 */
export const REDO_VERB = "Redo";

/**
 * The caret half's title: what that half opens. Never a bare `More`, and never the
 * main half's words. Spec 02 section 2.3.
 */
export const HISTORY_TITLE = "History";

/** The Export trigger's label and title. Spec 02 section 2.4. */
export const EXPORT_LABEL = "Export";

/** Export menu row 1 of exactly two; it lands in the Present panel. Spec 02 section 2.4. */
export const EXPORT_MENU_IMAGE = "Image";

/** Export menu row 2 of exactly two; it lands in the Present panel. Spec 02 section 2.4. */
export const EXPORT_MENU_DATA = "Data";

/** The Share button's title. Spec 02 section 2.4. */
export const SHARE_TITLE = "Share this view";

/** Share menu row 1; it lands in the Present panel. Spec 02 section 2.4. */
export const SHARE_MENU_EXPORT_DATA = "Export data";

/** Share menu row 2; it lands in the Present panel. Spec 02 section 2.4. */
export const SHARE_MENU_COPY_IMAGE = "Copy image";

/** The Compare toggle's title, in every state. Spec 02 section 2.4. */
export const COMPARE_TITLE = "Compare two views";

/** The inspector toggle's verb; a toggle never renames itself. Spec 02 section 2.4. */
export const INSPECTOR_TOGGLE_VERB = "Toggle inspector";

/**
 * The panel toggle's verb, the mirror of the inspector's.
 *
 * Spec 02 section 2.4 draws one region switch in this bar. The product owner asked for
 * the second on 2026-09-12 ("the right panel has an open / close button, but the left
 * doesn't"), and it takes the shape the first already has: one verb in every state, the
 * chip from the one binding table. The binding itself is not new -- `togglePanel` /
 * Mod+B already ships, and the panel header's X already advertises it.
 */
export const PANEL_TOGGLE_VERB = "Toggle panel";

/**
 * The suffix a control disabled for want of data takes. Spec 02 sections 1.2 and 2.4.
 *
 * The one home for the suffix, which three titles append.
 * @public
 */
export const LOAD_DATA_FIRST_SUFFIX = ". Load data first";

/**
 * The reason the undo half carries while the history store is empty. Spec 02 section 2.3. The
 * one home for the reason, which both the title and the accessible name append.
 * @public
 */
export const NOTHING_TO_UNDO_SUFFIX = ". Nothing to undo yet";

/**
 * The reason Redo carries while nothing has been undone. Spec 02 section 2.3. The one home for
 * the reason, which both the title and the accessible name append.
 * @public
 */
export const NOTHING_TO_REDO_SUFFIX = ". Nothing to redo yet";

/** The register's close title, on the History pop-out's X. Spec 02 sections 2.5 and 8. */
export const CLOSE_TITLE = "Close (Esc)";

/**
 * The History pop-out's info circle. The resident footer line is an explanation, so
 * Rule 8 circles it rather than leaving it on the surface. Spec 02 section 2.5.
 */
export const HISTORY_INFO_TEXT =
    "Hover previews, click restores, click a title opens its panel, Esc closes.";

/** The mark on the entry at the current position. HistoryPopover.dc.html. */
export const HISTORY_CURRENT_BADGE = "Current";

/**
 * The provenance line a voice-taken step inside an XR session carries, on a second
 * line. Spec 02 section 2.5.
 */
export const XR_VOICE_PROVENANCE = "by voice, in VR";

/* -------------------------------------------------------------------------- */
/* Title builders                                                              */
/* -------------------------------------------------------------------------- */

function withChip(verb: string, chip: string | null): string {
    if (chip === null) {
        return verb;
    }

    return `${verb} (${chip})`;
}

/**
 * The Undo main half's title: the verb, its chip, and -- when the history store is
 * empty -- the reason it cannot act. Spec 02 section 2.3.
 * @param canUndo - whether there is anything to undo.
 * @param apple - whether to print the Apple spelling of the chip; defaults to the running platform.
 * @returns the tooltip text, e.g. "Undo (Cmd+Z). Nothing to undo yet".
 */
export function undoTitle(canUndo: boolean, apple: boolean = isApplePlatform()): string {
    const base = withChip(UNDO_VERB, keyChipFor("undo", apple));

    return canUndo ? base : `${base}${NOTHING_TO_UNDO_SUFFIX}`;
}

/**
 * The Undo main half's accessible name: its tooltip with the key chip removed.
 * Spec 04 section 8.2.
 * @param canUndo - whether there is anything to undo.
 * @returns the accessible name, e.g. "Undo. Nothing to undo yet".
 */
export function undoAccessibleName(canUndo: boolean): string {
    return canUndo ? UNDO_VERB : `${UNDO_VERB}${NOTHING_TO_UNDO_SUFFIX}`;
}

/**
 * Redo's title: the verb, its chip, and the reason when nothing has been undone.
 * Spec 02 section 2.3.
 * @param canRedo - whether there is anything to redo.
 * @param apple - whether to print the Apple spelling of the chip; defaults to the running platform.
 * @returns the tooltip text, e.g. "Redo (Shift+Cmd+Z). Nothing to redo yet".
 */
export function redoTitle(canRedo: boolean, apple: boolean = isApplePlatform()): string {
    const base = withChip(REDO_VERB, keyChipFor("redo", apple));

    return canRedo ? base : `${base}${NOTHING_TO_REDO_SUFFIX}`;
}

/**
 * Redo's accessible name: its tooltip with the key chip removed. Spec 04 section 8.2.
 * @param canRedo - whether there is anything to redo.
 * @returns the accessible name, e.g. "Redo. Nothing to redo yet".
 */
export function redoAccessibleName(canRedo: boolean): string {
    return canRedo ? REDO_VERB : `${REDO_VERB}${NOTHING_TO_REDO_SUFFIX}`;
}

/**
 * Export's title, which takes the disabled reason until data is loaded.
 * Spec 02 section 2.4.
 * @param dataLoaded - whether data is loaded.
 * @returns "Export", or "Export. Load data first".
 */
export function exportTitle(dataLoaded: boolean): string {
    return dataLoaded ? EXPORT_LABEL : `${EXPORT_LABEL}${LOAD_DATA_FIRST_SUFFIX}`;
}

/**
 * Share's title, which takes the disabled reason until data is loaded.
 * Spec 02 section 2.4.
 * @param dataLoaded - whether data is loaded.
 * @returns "Share this view", or "Share this view. Load data first".
 */
export function shareTitle(dataLoaded: boolean): string {
    return dataLoaded ? SHARE_TITLE : `${SHARE_TITLE}${LOAD_DATA_FIRST_SUFFIX}`;
}

/**
 * The Compare toggle's title, which takes the disabled reason until data is loaded
 * and never renames itself when it is on. Spec 02 section 2.4.
 * @param dataLoaded - whether data is loaded.
 * @returns "Compare two views", or "Compare two views. Load data first".
 */
export function compareTitle(dataLoaded: boolean): string {
    return dataLoaded ? COMPARE_TITLE : `${COMPARE_TITLE}${LOAD_DATA_FIRST_SUFFIX}`;
}

/**
 * The inspector toggle's title -- the same string in every state, because a toggle
 * never renames itself. Spec 02 section 2.4.
 * @param apple - whether to print the Apple spelling of the chip; defaults to the running platform.
 * @returns "Toggle inspector (D)".
 */
export function inspectorToggleTitle(apple: boolean = isApplePlatform()): string {
    return withChip(INSPECTOR_TOGGLE_VERB, keyChipFor("toggleInspector", apple));
}

/**
 * The panel toggle's title -- the same string in every state, for the same reason the
 * inspector's is. The chip is `togglePanel`'s, so it reads Cmd+B on an Apple platform
 * and Ctrl+B elsewhere.
 * @param apple - whether to print the Apple spelling of the chip; defaults to the running platform.
 * @returns "Toggle panel (Ctrl+B)".
 */
export function panelToggleTitle(apple: boolean = isApplePlatform()): string {
    return withChip(PANEL_TOGGLE_VERB, keyChipFor("togglePanel", apple));
}

/**
 * The History pop-out header's state line. Spec 02 section 2.5 (form "N entries,
 * M undone").
 * @param entryCount - how many entries the one history store holds.
 * @param undone - how many of them have been undone and are redoable.
 * @returns the state line, e.g. "12 entries, 6 undone".
 */
export function historyStateLine(entryCount: number, undone: number): string {
    const noun = entryCount === 1 ? "entry" : "entries";

    return `${entryCount} ${noun}, ${undone} undone`;
}

/**
 * The step count on an XR session's group header. HistoryPopover.dc.html ("3 steps").
 * @param steps - how many steps the session holds.
 * @returns the count, e.g. "3 steps".
 */
export function xrSessionStepCount(steps: number): string {
    return `${steps} ${steps === 1 ? "step" : "steps"}`;
}

/**
 * A history entry's time, as the pop-out's mono column draws it: 24-hour HH:MM, the
 * form every row on HistoryPopover.dc.html takes.
 * @param at - the moment the step was taken, in epoch milliseconds.
 * @returns the time, e.g. "14:15".
 */
export function formatHistoryTime(at: number): string {
    const date = new Date(at);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

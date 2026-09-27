import type { PersistedShellLayout, PrimaryActivityId, SectionOpenMap } from "./types";

/**
 * Local storage key for the things this store persists. Versioned, so a shape
 * change becomes a missing key rather than a corrupt read.
 *
 * IT MOVES TO v3 ON 2026-09-14, with the panel model itself. The product owner's
 * instruction was "our panel open / closed / autohide is a confusing nightmare. remove
 * the panel locks and remove autohide ... there is one button to hide / show both at the
 * same time and not individual buttons", and the whole of the old model went with it:
 * the two "Keep open" latches, the width-aware first-visit layout, the narrow
 * one-overlay-at-a-time rule, the canvas-tap and Escape dismissals of a single overlay,
 * and `inspectorOpen` as an axis independent of the panel.
 *
 * The key HAD to move, and not for a shape change -- a v2 reader is validated field by
 * field, so an unknown field costs nothing. It moved because every v2 record carries
 * `activeActivity` (possibly null) and `inspectorOpen: false`, both of which a v3 reader
 * would otherwise honour as "this reader deliberately hid things". Under the new model
 * both sidebars are shown by default, so honouring those two fields would deliver the
 * OLD default -- no panel, no inspector -- to every reader who has ever opened the app,
 * which is precisely the complaint. A new key is the only way the new default reaches
 * them.
 *
 * WHAT THAT COSTS, and it is a real, one-time, visible loss the product owner should be
 * told about rather than discover: every existing reader's panel width, inspector width
 * and tier-2 section open map are discarded. It is the same cost the v1-to-v2 bump
 * already accepted, and all three are re-earned by one drag and one disclosure click.
 */
export const SHELL_LAYOUT_STORAGE_KEY = "graphty.shell.layout.v3";

const PRIMARY_ACTIVITY_IDS: readonly string[] = ["data", "explore", "analyze", "style", "present", "ai"];

/**
 * Only the six panel activities are restorable. Settings is a full-panel overlay and
 * Help is a menu (spec 03 sections 2.7, 2.8): neither is a resting panel, so neither
 * may come back as one on the next load.
 * @param value - the persisted value to test.
 * @returns true when the value names one of the six panel activities.
 */
function isRestorableActivityId(value: unknown): value is PrimaryActivityId {
    return typeof value === "string" && PRIMARY_ACTIVITY_IDS.includes(value);
}

/**
 * Whether a persisted value is a usable section-open map.
 * @param value - the persisted value to test.
 * @returns true when every entry is a boolean.
 */
function isSectionOpenMap(value: unknown): value is SectionOpenMap {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    return Object.values(value).every((entry) => typeof entry === "boolean");
}

/**
 * Whether a persisted value is a real number.
 * @param value - the persisted value to test.
 * @returns true when the value is a finite number.
 */
function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * Reads the persisted layout, surviving an absent key, an unreadable store (private
 * mode, disabled site data), malformed JSON and a value of the wrong shape. Each
 * field is validated on its own, so one bad field costs only that field.
 *
 * 6.5 says exactly what may be stored. Under the 2026-09-14 panel model that list is
 * the tier-2 section open states, the last active activity, the two widths and ONE
 * boolean, `sidebarsHidden`. Nothing else is read here even if a future version wrote
 * it, and nothing that a v2 record carried -- `inspectorOpen`, `panelKeptOpen`,
 * `inspectorKeptOpen` -- is read at all, because the key moved with the model.
 * @returns whatever of the persisted layout could be trusted.
 */
export function readPersistedShellLayout(): Partial<PersistedShellLayout> {
    let raw: string | null = null;

    try {
        raw = window.localStorage.getItem(SHELL_LAYOUT_STORAGE_KEY);
    } catch {
        return {};
    }

    if (raw === null || raw === "") {
        return {};
    }

    let parsed: unknown = null;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return {};
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
    }

    const record = parsed as Record<string, unknown>;
    const result: {
        activeActivity?: PrimaryActivityId;
        panelWidth?: number;
        inspectorWidth?: number;
        sidebarsHidden?: boolean;
        sectionOpen?: SectionOpenMap;
    } = {};

    /* A stored null -- which every v2 record could carry, and which meant "no panel is
       open" under the old model -- is NOT a restorable activity and falls through to
       `DEFAULT_ACTIVITY`. There is no such thing as "no panel" while the sidebars are
       shown, so there is no value that could express it. */
    if (isRestorableActivityId(record.activeActivity)) {
        result.activeActivity = record.activeActivity;
    }

    if (isFiniteNumber(record.panelWidth)) {
        result.panelWidth = record.panelWidth;
    }

    if (isFiniteNumber(record.inspectorWidth)) {
        result.inspectorWidth = record.inspectorWidth;
    }

    if (typeof record.sidebarsHidden === "boolean") {
        result.sidebarsHidden = record.sidebarsHidden;
    }

    if (isSectionOpenMap(record.sectionOpen)) {
        result.sectionOpen = record.sectionOpen;
    }

    return result;
}

/**
 * Writes the persisted layout, surviving a full or unavailable store.
 * @param layout - the record to write.
 */
export function writePersistedShellLayout(layout: PersistedShellLayout): void {
    try {
        window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
        // A full or unavailable store is not an error the shell can act on: the
        // layout simply does not survive the session.
    }
}

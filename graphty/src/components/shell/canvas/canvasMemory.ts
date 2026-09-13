/**
 * The canvas region's own slice of the 6.5 memory rule.
 *
 * The shell store persists exactly four layout entries (last active activity, panel
 * widths, inspector collapsed state, tier 2 section open states). Everything else on
 * the 6.5 list belongs to the region that owns it, behind its own versioned key and
 * its own guarded read -- `readPersistedShellLayout` is the pattern this copies.
 *
 * The entries below are the canvas region's, and nothing that is not on the 6.5 list
 * is stored here or anywhere else:
 *
 * - "Data table drawer open state and height"
 * - "minimap and legend visibility"
 * - "canvas toolbar visibility, beside minimap and legend visibility"
 * - "time slider on or off"
 * - "dismissed Insights strip (global across datasets, restored only from Help)"
 *
 * Build spec 04 section 6.1.
 */

import { DATA_DRAWER_DEFAULT_HEIGHT } from "../constants";
import { DATA_DRAWER_MIN_HEIGHT } from "./canvasLayout";

/**
 * Local storage key for the canvas region's 6.5 entries. Versioned, so a shape change
 * becomes a missing key rather than a corrupt read.
 */
export const CANVAS_LAYOUT_STORAGE_KEY = "graphty.shell.canvas.v1";

/**
 * Exactly what the canvas region writes to local storage, and nothing more.
 *
 * The shape {@link readPersistedCanvasLayout} and {@link writePersistedCanvasLayout} exchange
 * with a caller.
 * @public
 */
export interface PersistedCanvasLayout {
    /** 6.5 "Data table drawer open state and height". */
    readonly drawerOpen: boolean;
    /** 6.5 "Data table drawer open state and height". */
    readonly drawerHeight: number;
    /** 6.5 "minimap and legend visibility". */
    readonly minimap: boolean;
    /** 6.5 "minimap and legend visibility". */
    readonly legend: boolean;
    /** 6.5 "canvas toolbar visibility, beside minimap and legend visibility". */
    readonly toolbar: boolean;
    /** 6.5 "time slider on or off". */
    readonly timeSlider: boolean;
    /** 6.5 "dismissed Insights strip", global across datasets. */
    readonly insightsDismissed: boolean;
}

/**
 * What the canvas opens with when nothing has been remembered: the three baseline
 * overlays shown, the two docks and the slider off, the Insights strip not dismissed.
 */
export const DEFAULT_CANVAS_LAYOUT: PersistedCanvasLayout = {
    drawerOpen: false,
    drawerHeight: DATA_DRAWER_DEFAULT_HEIGHT,
    minimap: true,
    legend: true,
    toolbar: true,
    timeSlider: false,
    insightsDismissed: false,
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * Reads the canvas region's remembered state, surviving an absent key, an unreadable
 * store (private mode, disabled site data), malformed JSON and a value of the wrong
 * shape. Each field is validated on its own, so one bad field costs only that field.
 * @returns whatever of the canvas layout could be trusted.
 */
export function readPersistedCanvasLayout(): Partial<PersistedCanvasLayout> {
    let raw: string | null = null;

    try {
        raw = window.localStorage.getItem(CANVAS_LAYOUT_STORAGE_KEY);
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
        drawerOpen?: boolean;
        drawerHeight?: number;
        minimap?: boolean;
        legend?: boolean;
        toolbar?: boolean;
        timeSlider?: boolean;
        insightsDismissed?: boolean;
    } = {};

    if (typeof record.drawerOpen === "boolean") {
        result.drawerOpen = record.drawerOpen;
    }

    if (typeof record.minimap === "boolean") {
        result.minimap = record.minimap;
    }

    if (typeof record.legend === "boolean") {
        result.legend = record.legend;
    }

    if (typeof record.toolbar === "boolean") {
        result.toolbar = record.toolbar;
    }

    if (typeof record.timeSlider === "boolean") {
        result.timeSlider = record.timeSlider;
    }

    if (typeof record.insightsDismissed === "boolean") {
        result.insightsDismissed = record.insightsDismissed;
    }

    // Floored on read, not only on drag: the stored number came from another window and
    // nothing guarantees it is still a height a drawer can take. The ceiling is the
    // canvas's, which nothing has measured yet at this point, so it is applied where
    // the drawer is drawn and where the offset ladder is computed (`canvasBottomStack`
    // clamps against the live rect).
    if (isFiniteNumber(record.drawerHeight)) {
        result.drawerHeight = Math.max(record.drawerHeight, DATA_DRAWER_MIN_HEIGHT);
    }

    return result;
}

/**
 * Writes the canvas region's remembered state. A full or unavailable store is not an
 * error the shell can act on: the layout simply does not survive the session.
 * @param layout - the canvas layout to remember.
 */
export function writePersistedCanvasLayout(layout: PersistedCanvasLayout): void {
    try {
        window.localStorage.setItem(CANVAS_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
        // Deliberately ignored: see the JSDoc above.
    }
}

/**
 * The canvas layout to start a session with: the defaults, overwritten by whatever of
 * the remembered layout could be trusted.
 * @param persisted - the result of {@link readPersistedCanvasLayout}.
 * @returns a complete canvas layout.
 */
export function resolveCanvasLayout(persisted: Partial<PersistedCanvasLayout>): PersistedCanvasLayout {
    return { ...DEFAULT_CANVAS_LAYOUT, ...persisted };
}

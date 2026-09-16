import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
    ACTIVITY_PANEL_WIDTH_DEFAULT,
    clampActivityPanelWidth,
    clampInspectorWidth,
    INSPECTOR_WIDTH_DEFAULT,
    isNarrowViewport,
    NARROW_BREAKPOINT,
} from "./constants";
import type {
    PersistedShellLayout,
    PrimaryActivityId,
    SectionOpenMap,
    ShellBreakpoint,
    ShellContextValue,
    ShellStateAxis,
} from "./types";

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
 * The activity a reader lands on when the store remembers none.
 *
 * Data, because it is the only activity the Empty state enables
 * (`ACTIVITIES_REQUIRING_DATA`, constants.ts) and it is where a reader goes to get a
 * dataset. The first data load still moves the panel to Explore (spec 02 section 1.5).
 */
const DEFAULT_ACTIVITY: PrimaryActivityId = "data";

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
function writePersistedShellLayout(layout: PersistedShellLayout): void {
    try {
        window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
        // A full or unavailable store is not an error the shell can act on: the
        // layout simply does not survive the session.
    }
}

/**
 * The window's width, or the given fallback where there is no window.
 * @param fallback - the width to use when the window cannot be read.
 * @returns the measured width.
 */
function measureViewportWidth(fallback: number): number {
    if (typeof window === "undefined") {
        return fallback;
    }

    return window.innerWidth;
}

/**
 * The width the provider lays its FIRST render out at, measured synchronously wherever
 * the provider measures at all.
 *
 * The measurement effect below lands after the first paint, which is too late for the
 * shell's own "is this screen wide enough to lay out at all" decision: below
 * {@link NARROW_BREAKPOINT} the shell draws a "screen too small" state instead of a
 * layout (product owner, 2026-09-14: "there will be no more auto-hide. below 1280 should
 * just say 'screen too small' or something similar"). Reading `window.innerWidth` from
 * the initialiser is the only moment the real width is knowable in time, and it keeps
 * the first paint from flashing a full layout at a width that does not support one.
 *
 * A provider with measurement off is unchanged: `initialShellWidth` alone decides its
 * breakpoint, which is what the tests and the isolated stories pin.
 * @param initialShellWidth - the width to start from when the window cannot be read.
 * @param measureViewport - whether this provider measures the window at all.
 * @returns the width the first render uses.
 */
function firstPaintWidth(initialShellWidth: number, measureViewport: boolean): number {
    return measureViewport ? measureViewportWidth(initialShellWidth) : initialShellWidth;
}

const ShellContext = createContext<ShellContextValue | null>(null);

/**
 * Props of the shell store provider.
 * @public
 */
export interface ShellProviderProps {
    /**
     * The viewport width to start from, before the first measurement lands. Tests
     * pass it to pin a breakpoint; the app leaves it alone.
     */
    readonly initialShellWidth?: number;
    /** Whether the persisted layout is read and written. Tests turn it off. */
    readonly persist?: boolean;
    /**
     * Whether the provider measures the window and follows resizes. Defaults to true;
     * tests turn it off so `initialShellWidth` alone decides the breakpoint.
     */
    readonly measureViewport?: boolean;
    /** The initial state axis. The shell starts Empty until data loads. */
    readonly initialStateAxis?: ShellStateAxis;
    /** The shell tree. */
    readonly children: React.ReactNode;
}

/**
 * Owns the shell's layout state: which activity the panel draws, the two widths, the
 * per-section open map, the state axis, the breakpoint, and ONE boolean that says
 * whether both sidebars are hidden.
 *
 * WHAT THIS STORE USED TO BE, and why none of it is here any more. Until 2026-09-14 it
 * carried five interlocking mechanisms: two "Keep open" latches, a width-aware
 * first-visit layout built on those latches, three auto-close rules the latches could
 * veto (the narrow one-overlay-at-a-time rule, the canvas tap and the Escape ladder's
 * third rung), an `inspectorOpen` axis independent of the panel, and a
 * close-on-active-click on the rail. The product owner's verdict on the result was
 * "our panel open / closed / autohide is a confusing nightmare. remove the panel locks
 * and remove autohide ... there is one button to hide / show both at the same time and
 * not individual buttons", and the five could not be removed one at a time: each
 * existed to correct another, so any subset left behind is incoherent. They were
 * deleted whole and replaced by {@link ShellContextValue.sidebarsHidden}.
 *
 * NOTHING IN THIS STORE HIDES A SIDEBAR AS A SIDE EFFECT OF ANYTHING ELSE. The only
 * writer of `sidebarsHidden` is the reader's own control -- one top-bar button and the
 * Cmd/Ctrl+B binding behind it -- which is the whole of the new model and the reason
 * there is nothing left to be confused by. `selectActivity` reveals the sidebars because
 * a rail click IS the reader asking to see that panel, and a rail icon that did nothing
 * while the sidebars were hidden would be a control that lies (floor item 4); it is not
 * a second hiding mechanism, because it can only ever show.
 *
 * BELOW 1280 px THERE IS NO LAYOUT AT ALL. `breakpoint` is still published, because the
 * frame reads it to draw the "screen too small" state instead of a layout, and the
 * canvas region reads it for its own chip-versus-card decision. No narrow BEHAVIOUR
 * survives: there are no overlays below the breakpoint, so there is nothing for a tap or
 * an Escape press to dismiss.
 *
 * Persistence is exactly 6.5's entries under the new model -- the active activity, the
 * two widths, the section map and `sidebarsHidden` -- behind a guarded read. Widths are
 * stored as REQUESTED and exposed CLAMPED, so a viewport change never destroys a width
 * the user chose on a wider screen.
 * @param props - the provider's props.
 * @returns the provider element wrapping the shell tree.
 */
export function ShellProvider(props: ShellProviderProps): React.JSX.Element {
    const {
        children,
        initialShellWidth = NARROW_BREAKPOINT,
        initialStateAxis = "empty",
        measureViewport = true,
        persist = true,
    } = props;

    const [shellWidth, setShellWidth] = useState<number>(() => firstPaintWidth(initialShellWidth, measureViewport));

    /*
     * A provider with persistence off is a store with no memory of the reader at all --
     * what the tests and the isolated stories ask for. It takes the SAME defaults a first
     * visit takes, because under the new model the defaults are not a "first-visit
     * layout" computed from the width: they are one activity and one false boolean, and
     * a store with no memory and a store with nothing remembered are the same thing.
     */
    const [restored] = useState<Partial<PersistedShellLayout>>(() => (persist ? readPersistedShellLayout() : {}));

    const [activeActivity, setActiveActivity] = useState<PrimaryActivityId>(
        () => restored.activeActivity ?? DEFAULT_ACTIVITY,
    );
    const [requestedPanelWidth, setRequestedPanelWidth] = useState<number>(
        () => restored.panelWidth ?? ACTIVITY_PANEL_WIDTH_DEFAULT,
    );
    const [requestedInspectorWidth, setRequestedInspectorWidth] = useState<number>(
        () => restored.inspectorWidth ?? INSPECTOR_WIDTH_DEFAULT,
    );
    const [sidebarsHidden, setSidebarsHiddenState] = useState<boolean>(() => restored.sidebarsHidden ?? false);
    const [sectionOpen, setSectionOpenState] = useState<SectionOpenMap>(() => restored.sectionOpen ?? {});
    const [stateAxis, setStateAxis] = useState<ShellStateAxis>(initialStateAxis);

    // Measurement is a side effect, so it happens after paint and never in render.
    useEffect(() => {
        if (!measureViewport || typeof window === "undefined") {
            return undefined;
        }

        const sync = (): void => {
            setShellWidth(measureViewportWidth(initialShellWidth));
        };

        sync();
        window.addEventListener("resize", sync);

        return () => {
            window.removeEventListener("resize", sync);
        };
    }, [initialShellWidth, measureViewport]);

    const breakpoint: ShellBreakpoint = isNarrowViewport(shellWidth) ? "narrow" : "desktop";

    /* Widths are derived, not stored twice: the request survives, the clamp decides what
       is drawn. Each region is clamped against the OTHER region's drawn width, which is
       zero while the sidebars are hidden -- so hiding them gives the canvas the whole
       row and showing them again restores both widths the reader chose. */
    const panelWidth = useMemo(
        () => clampActivityPanelWidth(requestedPanelWidth, shellWidth, sidebarsHidden ? 0 : requestedInspectorWidth),
        [requestedInspectorWidth, requestedPanelWidth, shellWidth, sidebarsHidden],
    );
    const inspectorWidth = useMemo(
        () => clampInspectorWidth(requestedInspectorWidth, shellWidth, sidebarsHidden ? 0 : panelWidth),
        [panelWidth, requestedInspectorWidth, shellWidth, sidebarsHidden],
    );

    /**
     * Shows or hides BOTH sidebars. The one writer of the one boolean.
     * @param hidden - true to hide both sidebars, false to show both.
     */
    const setSidebarsHidden = useCallback((hidden: boolean) => {
        setSidebarsHiddenState(hidden);
    }, []);

    const toggleSidebars = useCallback(() => {
        setSidebarsHiddenState((current) => !current);
    }, []);

    /**
     * Draws a different activity in the panel, without touching whether the sidebars are
     * shown.
     *
     * This is the PROGRAMMATIC route -- the first-load rule (spec 02 section 1.5), a run
     * function opening its own panel, a "go to Data" verb on a failure surface. It
     * deliberately does not reveal hidden sidebars: a reader who hid them asked for the
     * canvas, and a background completion yanking them back is exactly the kind of
     * shell-performed layout change this model exists to abolish.
     * @param activity - the activity the panel draws.
     */
    const openActivity = useCallback((activity: PrimaryActivityId) => {
        setActiveActivity(activity);
    }, []);

    /**
     * The rail click: a pure activity chooser that also reveals hidden sidebars.
     *
     * TWO THINGS IT NO LONGER DOES, both deleted on 2026-09-14. It no longer closes the
     * panel when the already-active icon is clicked (spec:153's close-on-active-click --
     * the last individual control that hid one sidebar on its own, and the reason this
     * change needs the product owner's explicit assent), and it no longer displaces the
     * inspector below 1280, because there are no overlays below 1280 any more.
     *
     * It DOES show the sidebars when they are hidden, and that is not a relapse into
     * auto-behaviour: a click on a rail icon has exactly one meaning, "draw me that
     * panel", and a rail that silently did nothing for six of its eight destinations
     * would be six controls reporting a state they are not in (6.14, design line 6633).
     * @param activity - the activity the panel draws.
     */
    const selectActivity = useCallback((activity: PrimaryActivityId) => {
        setActiveActivity(activity);
        setSidebarsHiddenState(false);
    }, []);

    const setPanelWidth = useCallback((width: number) => {
        setRequestedPanelWidth(width);
    }, []);

    const setInspectorWidth = useCallback((width: number) => {
        setRequestedInspectorWidth(width);
    }, []);

    const isSectionOpen = useCallback(
        (sectionId: string, defaultOpen?: boolean) => sectionOpen[sectionId] ?? defaultOpen ?? false,
        [sectionOpen],
    );

    const setSectionOpen = useCallback((sectionId: string, open: boolean) => {
        setSectionOpenState((current) => ({ ...current, [sectionId]: open }));
    }, []);

    const toggleSection = useCallback((sectionId: string, defaultOpen?: boolean) => {
        setSectionOpenState((current) => ({ ...current, [sectionId]: !(current[sectionId] ?? defaultOpen ?? false) }));
    }, []);

    const setSectionsOpen = useCallback((sectionIds: readonly string[], open: boolean) => {
        setSectionOpenState((current) => {
            const next: Record<string, boolean> = { ...current };

            for (const sectionId of sectionIds) {
                next[sectionId] = open;
            }

            return next;
        });
    }, []);

    /*
     * Persistence: 6.5's entries, written after the state settles.
     *
     * The old store guarded this with a "nothing is written until something differs from
     * the first paint" check plus a `latchChosen` ref, because a default written on mount
     * was indistinguishable from a deliberate choice on the next visit and suppressed the
     * width-aware default. That machinery is gone with the model it protected: the record
     * now holds one boolean whose default is false and one activity whose default is
     * Data, and writing either on mount says exactly what the absent record said. 6.5a's
     * "a default is not a choice" problem collapses when no default is ambiguous.
     */
    useEffect(() => {
        if (!persist) {
            return;
        }

        writePersistedShellLayout({
            activeActivity,
            panelWidth: requestedPanelWidth,
            inspectorWidth: requestedInspectorWidth,
            sidebarsHidden,
            sectionOpen,
        });
    }, [activeActivity, persist, requestedInspectorWidth, requestedPanelWidth, sectionOpen, sidebarsHidden]);

    const value = useMemo<ShellContextValue>(
        () => ({
            activeActivity,
            panelWidth,
            inspectorWidth,
            sidebarsHidden,
            sectionOpen,
            stateAxis,
            breakpoint,
            shellWidth,
            selectActivity,
            openActivity,
            setPanelWidth,
            setInspectorWidth,
            setSidebarsHidden,
            toggleSidebars,
            isSectionOpen,
            setSectionOpen,
            toggleSection,
            setSectionsOpen,
            setStateAxis,
        }),
        [
            activeActivity,
            breakpoint,
            inspectorWidth,
            isSectionOpen,
            openActivity,
            panelWidth,
            sectionOpen,
            selectActivity,
            setInspectorWidth,
            setPanelWidth,
            setSectionOpen,
            setSectionsOpen,
            setSidebarsHidden,
            shellWidth,
            sidebarsHidden,
            stateAxis,
            toggleSection,
            toggleSidebars,
        ],
    );

    return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

/**
 * Reads the shell store.
 * @returns the shell store's value.
 * @throws when called outside a `ShellProvider`.
 */
export function useShell(): ShellContextValue {
    const value = useContext(ShellContext);

    if (value === null) {
        throw new Error("useShell must be used inside a ShellProvider");
    }

    return value;
}

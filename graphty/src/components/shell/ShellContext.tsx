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
    ActivityId,
    NarrowOverlay,
    PersistedShellLayout,
    SectionOpenMap,
    ShellBreakpoint,
    ShellContextValue,
    ShellStateAxis,
} from "./types";

/**
 * Local storage key for the things this store persists. Versioned, so a shape
 * change becomes a missing key rather than a corrupt read.
 *
 * The two latches (6.12) were added to the record on 2026-09-12 and the key did NOT
 * move to v2: `readPersistedShellLayout` validates every field on its own, so an old
 * record is simply a record with no latches and a new one costs an old reader nothing.
 */
export const SHELL_LAYOUT_STORAGE_KEY = "graphty.shell.layout.v1";

const PRIMARY_ACTIVITY_IDS: readonly string[] = ["data", "explore", "analyze", "style", "present", "ai"];

/**
 * Only the six panel activities are restorable. Settings is a full-panel overlay and
 * Help is a menu (spec 03 sections 2.7, 2.8): neither is a resting panel, so neither
 * may come back as one on the next load.
 * @param value - the persisted value to test.
 * @returns true when the value names one of the six panel activities.
 */
function isRestorableActivityId(value: unknown): value is ActivityId {
    return typeof value === "string" && PRIMARY_ACTIVITY_IDS.includes(value);
}

function isSectionOpenMap(value: unknown): value is SectionOpenMap {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    return Object.values(value).every((entry) => typeof entry === "boolean");
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * Reads the persisted layout, surviving an absent key, an unreadable store (private
 * mode, disabled site data), malformed JSON and a value of the wrong shape. Each
 * field is validated on its own, so one bad field costs only that field.
 *
 * 6.5 says exactly what may be stored: tier 2 section open states, the last active
 * activity, panel widths and the inspector collapsed state, and 6.12 adds the two
 * latches, which are facts about how the reader works. Nothing else is read here even
 * if a future version wrote it.
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
        activeActivity?: ActivityId | null;
        panelWidth?: number;
        inspectorWidth?: number;
        inspectorOpen?: boolean;
        sectionOpen?: SectionOpenMap;
        panelKeptOpen?: boolean;
        inspectorKeptOpen?: boolean;
    } = {};

    if (record.activeActivity === null || isRestorableActivityId(record.activeActivity)) {
        result.activeActivity = record.activeActivity;
    }

    if (isFiniteNumber(record.panelWidth)) {
        result.panelWidth = record.panelWidth;
    }

    if (isFiniteNumber(record.inspectorWidth)) {
        result.inspectorWidth = record.inspectorWidth;
    }

    if (typeof record.inspectorOpen === "boolean") {
        result.inspectorOpen = record.inspectorOpen;
    }

    if (isSectionOpenMap(record.sectionOpen)) {
        result.sectionOpen = record.sectionOpen;
    }

    if (typeof record.panelKeptOpen === "boolean") {
        result.panelKeptOpen = record.panelKeptOpen;
    }

    if (typeof record.inspectorKeptOpen === "boolean") {
        result.inspectorKeptOpen = record.inspectorKeptOpen;
    }

    return result;
}

function writePersistedShellLayout(layout: PersistedShellLayout): void {
    try {
        window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
        // A full or unavailable store is not an error the shell can act on: the
        // layout simply does not survive the session.
    }
}

function measureViewportWidth(fallback: number): number {
    if (typeof window === "undefined") {
        return fallback;
    }

    return window.innerWidth;
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
 * Owns the shell's layout state: the active activity, panel and inspector widths, the
 * per-section open map, the state axis, the breakpoint, the narrow-screen
 * one-overlay-at-a-time rule and the two "Keep open" latches (6.12).
 *
 * Persistence is exactly 6.5's four layout entries plus 6.12's two latches and nothing
 * more, behind a guarded read. Widths are stored as REQUESTED and exposed CLAMPED, so a
 * viewport change never destroys a width the user chose on a wider screen.
 *
 * The latch is a veto and nothing else: it stops the shell closing a surface as a side
 * effect of something else -- the narrow one-overlay rule, a canvas tap, the Escape
 * ladder's third rung -- and it never stops the user's own close control, which is the
 * one gesture that always means close.
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

    const [restored] = useState<Partial<PersistedShellLayout>>(() => (persist ? readPersistedShellLayout() : {}));

    const [activeActivity, setActiveActivity] = useState<ActivityId | null>(() => restored.activeActivity ?? null);
    const [requestedPanelWidth, setRequestedPanelWidth] = useState<number>(
        () => restored.panelWidth ?? ACTIVITY_PANEL_WIDTH_DEFAULT,
    );
    const [requestedInspectorWidth, setRequestedInspectorWidth] = useState<number>(
        () => restored.inspectorWidth ?? INSPECTOR_WIDTH_DEFAULT,
    );
    const [inspectorOpen, setInspectorOpenState] = useState<boolean>(() => restored.inspectorOpen ?? false);
    const [panelKeptOpen, setPanelKeptOpenState] = useState<boolean>(() => restored.panelKeptOpen ?? false);
    const [inspectorKeptOpen, setInspectorKeptOpenState] = useState<boolean>(
        () => restored.inspectorKeptOpen ?? false,
    );
    const [sectionOpen, setSectionOpenState] = useState<SectionOpenMap>(() => restored.sectionOpen ?? {});
    const [stateAxis, setStateAxis] = useState<ShellStateAxis>(initialStateAxis);
    const [shellWidth, setShellWidth] = useState<number>(initialShellWidth);
    const [narrowOverlay, setNarrowOverlay] = useState<NarrowOverlay>("none");

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

    const narrow = isNarrowViewport(shellWidth);
    const breakpoint: ShellBreakpoint = narrow ? "narrow" : "desktop";

    // Widths are derived, not stored twice: the request survives, the clamp decides
    // what is drawn. Below the breakpoint both regions are 280 px overlays.
    const panelWidth = useMemo(
        () => clampActivityPanelWidth(requestedPanelWidth, shellWidth, inspectorOpen ? requestedInspectorWidth : 0),
        [inspectorOpen, requestedInspectorWidth, requestedPanelWidth, shellWidth],
    );
    const inspectorWidth = useMemo(
        () => clampInspectorWidth(requestedInspectorWidth, shellWidth, activeActivity === null ? 0 : panelWidth),
        [activeActivity, panelWidth, requestedInspectorWidth, shellWidth],
    );

    // Leaving the narrow breakpoint retires the one-overlay-at-a-time rule; both
    // regions are columns again and neither is an overlay.
    useEffect(() => {
        if (!narrow) {
            setNarrowOverlay("none");
        }
    }, [narrow]);

    /* Arriving at the narrow breakpoint with both surfaces latched -- from a resize, or
       from a record written on a desktop, where both latches are allowed -- would leave
       48 + 280 + 280 of chrome with nothing a tap may dismiss. One has to yield, and it
       is the panel's: the inspector is the surface a selection fills and the one the
       latch exists to protect, and the panel is one rail click away (6.12). */
    useEffect(() => {
        if (narrow) {
            setPanelKeptOpenState((kept) => (kept && inspectorKeptOpen ? false : kept));
        }
    }, [inspectorKeptOpen, narrow]);

    const openActivity = useCallback(
        (activity: ActivityId) => {
            setActiveActivity(activity);

            if (narrow) {
                // Spec 01 section 7 item 2: only one overlay is open at a time and
                // opening one closes the other -- UNLESS the other is latched, in which
                // case the newly opened surface takes the dismissible slot and the
                // latched one stays (6.12, "The latch").
                setNarrowOverlay("panel");

                if (!inspectorKeptOpen) {
                    setInspectorOpenState(false);
                }
            }
        },
        [inspectorKeptOpen, narrow],
    );

    const closePanel = useCallback(() => {
        setActiveActivity(null);
        setNarrowOverlay((current) => (current === "panel" ? "none" : current));
    }, []);

    const selectActivity = useCallback(
        (activity: ActivityId) => {
            // Spec 02 section 1.4: clicking the icon of the already-active activity
            // closes its panel, and after the close no activity is active.
            if (activity === activeActivity) {
                closePanel();
                return;
            }

            openActivity(activity);
        },
        [activeActivity, closePanel, openActivity],
    );

    const setPanelWidth = useCallback((width: number) => {
        setRequestedPanelWidth(width);
    }, []);

    const setInspectorWidth = useCallback((width: number) => {
        setRequestedInspectorWidth(width);
    }, []);

    const setInspectorOpen = useCallback(
        (open: boolean) => {
            setInspectorOpenState(open);

            if (!narrow) {
                return;
            }

            if (open) {
                setNarrowOverlay("inspector");

                // The twin of openActivity's guard: a latched panel is not displaced by
                // the inspector opening over it (6.12).
                if (!panelKeptOpen) {
                    setActiveActivity(null);
                }
            } else {
                setNarrowOverlay((current) => (current === "inspector" ? "none" : current));
            }
        },
        [narrow, panelKeptOpen],
    );

    const toggleInspector = useCallback(() => {
        setInspectorOpen(!inspectorOpen);
    }, [inspectorOpen, setInspectorOpen]);

    /*
     * The two latches. Below 1280 px at most one surface may be latched, so latching one
     * unlatches the other: without that rule rail 48 + panel 280 + inspector 280 leaves
     * a 1200 px window no graph to read, and 5.2's one-overlay guarantee has nothing
     * left to guarantee. On desktop both may be latched, because neither is an overlay.
     *
     * Latching also hands the dismissible slot to the OTHER surface when that one is
     * open, because the un-latched surface is the only one a canvas tap may close.
     */
    const setPanelKeptOpen = useCallback(
        (kept: boolean) => {
            setPanelKeptOpenState(kept);

            if (!kept || !narrow) {
                return;
            }

            setInspectorKeptOpenState(false);
            setNarrowOverlay((current) => (current === "panel" && inspectorOpen ? "inspector" : current));
        },
        [inspectorOpen, narrow],
    );

    const setInspectorKeptOpen = useCallback(
        (kept: boolean) => {
            setInspectorKeptOpenState(kept);

            if (!kept || !narrow) {
                return;
            }

            setPanelKeptOpenState(false);
            setNarrowOverlay((current) => (current === "inspector" && activeActivity !== null ? "panel" : current));
        },
        [activeActivity, narrow],
    );

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
     * Escape rung 3 and the canvas tap both land here. A latched overlay is refused and
     * false is returned, so the press falls through to the next rung rather than closing
     * a surface the reader latched: 6.12 makes the latch a veto on every close the shell
     * performs as a side effect, and this is one of them.
     */
    const closeNarrowOverlay = useCallback(() => {
        if (!narrow || narrowOverlay === "none") {
            return false;
        }

        if (narrowOverlay === "panel") {
            if (panelKeptOpen) {
                return false;
            }

            setActiveActivity(null);
        } else {
            if (inspectorKeptOpen) {
                return false;
            }

            setInspectorOpenState(false);
        }

        setNarrowOverlay("none");

        return true;
    }, [inspectorKeptOpen, narrow, narrowOverlay, panelKeptOpen]);

    // Persistence: 6.5's four layout entries plus 6.12's two latches, written after the
    // state settles.
    useEffect(() => {
        if (!persist) {
            return;
        }

        writePersistedShellLayout({
            activeActivity,
            panelWidth: requestedPanelWidth,
            inspectorWidth: requestedInspectorWidth,
            inspectorOpen,
            sectionOpen,
            panelKeptOpen,
            inspectorKeptOpen,
        });
    }, [
        activeActivity,
        inspectorKeptOpen,
        inspectorOpen,
        panelKeptOpen,
        persist,
        requestedInspectorWidth,
        requestedPanelWidth,
        sectionOpen,
    ]);

    const value = useMemo<ShellContextValue>(
        () => ({
            activeActivity,
            panelWidth,
            inspectorOpen,
            inspectorWidth,
            panelKeptOpen,
            inspectorKeptOpen,
            sectionOpen,
            stateAxis,
            breakpoint,
            narrowOverlay,
            shellWidth,
            selectActivity,
            openActivity,
            closePanel,
            setPanelWidth,
            setInspectorOpen,
            setPanelKeptOpen,
            setInspectorKeptOpen,
            toggleInspector,
            setInspectorWidth,
            isSectionOpen,
            setSectionOpen,
            toggleSection,
            setSectionsOpen,
            setStateAxis,
            closeNarrowOverlay,
        }),
        [
            activeActivity,
            breakpoint,
            closeNarrowOverlay,
            closePanel,
            inspectorKeptOpen,
            inspectorOpen,
            inspectorWidth,
            isSectionOpen,
            narrowOverlay,
            openActivity,
            panelKeptOpen,
            panelWidth,
            sectionOpen,
            selectActivity,
            setInspectorKeptOpen,
            setInspectorOpen,
            setInspectorWidth,
            setPanelKeptOpen,
            setPanelWidth,
            setSectionOpen,
            setSectionsOpen,
            shellWidth,
            stateAxis,
            toggleInspector,
            toggleSection,
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

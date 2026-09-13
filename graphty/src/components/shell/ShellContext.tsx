import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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
 * move to v2 then: `readPersistedShellLayout` validates every field on its own, so an old
 * record is simply a record with no latches and a new one costs an old reader nothing.
 *
 * It DOES move to v2 on 2026-09-13, and not for a shape change. The product owner asked
 * for both sidebars to start latched open, and the write effect below runs on mount, so
 * every reader who has ever opened the app already holds a v1 record carrying the OLD
 * defaults -- `inspectorOpen: false`, `panelKeptOpen: false`, `inspectorKeptOpen: false`.
 * A stored value must keep winning, because a reader who unlatched a panel last week may
 * not find it latched again; but those three are indistinguishable from a deliberate
 * unlatch, so under v1 the new first-visit default would reach nobody who has ever opened
 * the app. A new key is the only way it reaches them, and it costs an old reader only the
 * widths and section states, which are re-earned by the first drag.
 */
export const SHELL_LAYOUT_STORAGE_KEY = "graphty.shell.layout.v2";

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

/**
 * The width the provider lays its FIRST render out at, measured synchronously wherever
 * the provider measures at all.
 *
 * {@link firstVisitLayout} has to know the breakpoint and is consumed in a `useState`
 * initialiser, so the measurement effect below -- which lands after the first paint --
 * is too late to decide what the shell opens with. Reading `window.innerWidth` from the
 * initialiser is the only moment the real width is knowable in time. A provider with
 * measurement off is unchanged: `initialShellWidth` alone decides its breakpoint, which
 * is what the tests and the isolated stories pin.
 * @param initialShellWidth - the width to start from when the window cannot be read.
 * @param measureViewport - whether this provider measures the window at all.
 * @returns the width the first render uses.
 */
function firstPaintWidth(initialShellWidth: number, measureViewport: boolean): number {
    return measureViewport ? measureViewportWidth(initialShellWidth) : initialShellWidth;
}

/**
 * What a FIRST VISIT starts from: the layout a reader gets when the store remembers
 * nothing about them at all.
 *
 * DESKTOP, a DEPARTURE from 6.12 at the product owner's direction on 2026-09-13 ("the
 * sidebars should be locked open by default"). 6.12 says "an UNKEPT surface behaves
 * exactly as it did before this section existed", and before it the shell opened with no
 * panel and a collapsed inspector. At or above {@link NARROW_BREAKPOINT} it now opens
 * with the Data panel and the inspector both on screen and both LATCHED, so a first
 * reader is shown the shape of the tool rather than a bare canvas, and nothing incidental
 * takes either surface away again. Data is the activity because it is the only one Empty
 * enables (ACTIVITIES_REQUIRING_DATA, constants.ts); the first data load still moves the
 * panel to Explore (spec 02 section 1.5).
 *
 * NARROW, below the breakpoint, it opens NEITHER surface, and this is what the width
 * argument exists for (2026-09-13, second pass). Below 1280 both surfaces are 280 px
 * OVERLAYS over a canvas that is never resized under them, and a latch vetoes every close
 * the shell performs as a side effect -- `closeNarrowOverlay` refuses a latched overlay,
 * which is both the canvas tap and the Escape ladder's third rung. A first visit that
 * latched both therefore arrived in a state the reader could not leave by any gesture the
 * Welcome screen teaches. Measured on genuine first visits with the store cleared: at
 * 1024x900 the panel took [48,328] and the inspector [744,1024] while the Welcome sheet
 * spanned [219,853], so 109 px of the sheet sat under each overlay and its heading read
 * "aph to get started"; at 600 and at 375 there was no canvas and no Welcome content at
 * all. Design 6.12 and 5.2 allow at most ONE kept surface below 1280; the reader may
 * still latch both there with two deliberate clicks (the 2026-09-13 departure recorded at
 * `setPanelKeptOpen`), but a DEFAULT spends no latch the reader did not ask for, so below
 * the breakpoint the first visit is the pre-6.12 opening and the Welcome sheet gets the
 * whole canvas.
 *
 * Every field here is ONLY a fallback. It is spread UNDER the persisted record, so any
 * field that record holds wins -- `panelKeptOpen: false` included. Only the absent case
 * changes. The cost of the narrow branch is the one this record always pays: the write
 * effect runs on mount, so a reader whose first visit was narrow holds a stored
 * `panelKeptOpen: false`, which is indistinguishable from a deliberate unlatch (see the
 * note on {@link SHELL_LAYOUT_STORAGE_KEY}) and so wins on a later wide visit in the same
 * browser. A latch the reader never asked for is the cheaper thing to lose.
 * @param shellWidth - the width the first render lays itself out at.
 * @returns the fallback layout for that width.
 */
function firstVisitLayout(shellWidth: number): Partial<PersistedShellLayout> {
    if (isNarrowViewport(shellWidth)) {
        return {
            activeActivity: null,
            inspectorOpen: false,
            panelKeptOpen: false,
            inspectorKeptOpen: false,
        };
    }

    return {
        activeActivity: "data",
        inspectorOpen: true,
        panelKeptOpen: true,
        inspectorKeptOpen: true,
    };
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

    /*
     * The width comes FIRST, because the first-visit layout below is keyed off the
     * breakpoint and both initialisers run in this order on the first render. Measuring
     * here rather than in the effect is what lets a narrow first visit open narrow
     * (2026-09-13, second pass); the effect still owns every later width.
     */
    const [shellWidth, setShellWidth] = useState<number>(() => firstPaintWidth(initialShellWidth, measureViewport));

    /*
     * The first-visit layout sits UNDER the persisted record, so a stored field always
     * wins and only an ABSENT field takes a default (2026-09-13). A provider with
     * persistence off is a store with no memory of the reader at all -- what the tests
     * and the isolated stories ask for -- so it takes no first-visit layout either, and
     * the `??` fallbacks below are what it starts from.
     */
    const [restored] = useState<Partial<PersistedShellLayout>>(() =>
        persist ? { ...firstVisitLayout(shellWidth), ...readPersistedShellLayout() } : {},
    );

    /*
     * Whether the READER has ever chosen a latch state, as opposed to being handed one.
     *
     * The latches are written down only once this is true, and that is what keeps a first
     * visit from poisoning the next one. Without it, a narrow first visit stored
     * `panelKeptOpen: false` immediately -- a value nobody chose, and indistinguishable
     * from a deliberate unlatch -- so the same browser opened later on a wide screen found
     * a record saying "unlatched" and showed neither sidebar. That is the product owner's
     * original complaint, reachable by anyone whose first visit happened to be narrow
     * (found in review, 2026-09-13).
     *
     * A record written before this change carries the latch fields already, so it seeds
     * true and keeps winning: an existing reader's deliberate unlatch is not re-opened.
     */
    const latchChosen = useRef(
        (() => {
            if (!persist) {
                return false;
            }

            const stored = readPersistedShellLayout();

            return stored.panelKeptOpen !== undefined || stored.inspectorKeptOpen !== undefined;
        })(),
    );

    /** The record this mount first painted, used to tell a default from a choice. */
    const firstPaintRecord = useRef<string | null>(null);

    /** Whether this mount began with nothing remembered, i.e. whether it is a first visit. */
    const storeWasEmpty = useRef(persist && Object.keys(readPersistedShellLayout()).length === 0);

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
     * The two latches: plain setters, and deliberately nothing else. Each latch is
     * changed by its own control and by nothing in the shell.
     *
     * DEPARTURE from 6.12 ("Below 1280 px at most ONE surface may be kept, and latching
     * one releases the other") and from 5.2's "at most one surface may be kept open below
     * 1280 px", at the product owner's direction on 2026-09-13: "there's a bug with the
     * panel lock state: if I lock one panel, open the other, lock the other, the first one
     * closes."
     *
     * What the old rule was protecting: below 1280 both surfaces are 280 px overlays over
     * a canvas that is never resized under them (`liveCanvasWidth`), so two latched
     * surfaces cover 560 px of graph with nothing a tap may dismiss. At 1200 px that
     * leaves a 592 px strip of graph, which still clears CANVAS_MIN_WIDTH (520); at
     * 1024 px it leaves 416 px, which does not. That is the honest cost of the departure,
     * and it is bought by the reader's own two deliberate clicks.
     *
     * What went wrong instead, and why it read as a close: releasing the other surface's
     * latch was SILENT. The first surface stayed on screen with its latch stripped, and
     * then died one unrelated gesture later, on the next canvas tap, when
     * `closeNarrowOverlay` found no latch to veto.
     *
     * What happens now: both surfaces may be latched at every width. `closeNarrowOverlay`
     * needs no change -- with both latched it already refuses and lets the Escape ladder
     * fall through to its next rung.
     */
    const setPanelKeptOpen = useCallback((kept: boolean) => {
        latchChosen.current = true;
        setPanelKeptOpenState(kept);
    }, []);

    const setInspectorKeptOpen = useCallback((kept: boolean) => {
        latchChosen.current = true;
        setInspectorKeptOpenState(kept);
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

        /* The latches are omitted until the reader has chosen one, so an unchosen
           default is never mistaken for a deliberate unlatch on the next visit. */
        const record: PersistedShellLayout = {
            activeActivity,
            panelWidth: requestedPanelWidth,
            inspectorWidth: requestedInspectorWidth,
            inspectorOpen,
            sectionOpen,
            ...(latchChosen.current ? { panelKeptOpen, inspectorKeptOpen } : {}),
        };
        const serialised = JSON.stringify(record);

        firstPaintRecord.current ??= serialised;

        /* Nothing is written until something actually differs from the first paint.
           Without this the effect wrote the DEFAULTS on mount, before the reader had done
           anything -- so a narrow first visit stored `activeActivity: null` and
           `inspectorOpen: false`, and the same browser opened later on a wide screen read
           those back as the reader's own choices and showed no sidebars. The latch fields
           had the same problem and are handled above; this covers the other five
           (2026-09-13, second review). */
        if (storeWasEmpty.current && serialised === firstPaintRecord.current) {
            return;
        }

        storeWasEmpty.current = false;
        writePersistedShellLayout(record);
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

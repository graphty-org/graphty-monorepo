/**
 * The two pieces of state the inspector's chrome shares with its content.
 *
 * 1. **The pin** (spec 03 section 3.3). Pinning freezes a copy of the current content
 *    as card A above the live content. The live content keeps following the selection,
 *    and its numeric rows show a delta against A. One pin at a time; it is released
 *    from the card, or automatically on data reload.
 * 2. **The footer slot** (spec 03 section 5, the binding pinning rule). Computed
 *    metrics, neighbors and the actions block never move below the first screen, so
 *    blocks 1 to 5 scroll and block 6 is a sticky footer OUTSIDE the scroll. The
 *    chrome owns that footer element; the content renders into it through this
 *    context.
 */

import { MetricRow, useNumberFormatter } from "@graphty/compact-mantine";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * One numeric row as it was at the moment the pin was taken.
 *
 * Named in {@link InspectorPinContextValue.registerMetric}, which a row calls with one of
 * these.
 * @public
 */
export interface PinnedMetric {
    /** Stable id, unique within the inspector's live content. */
    readonly metricId: string;
    /** The row's name, as it was drawn. */
    readonly name: string;
    /** The raw figure, which is what the delta is computed against. */
    readonly value: number;
    /** The figure as it was drawn, already formatted for the reader's locale. */
    readonly display: string;
}

/**
 * The frozen copy card A shows.
 */
export interface InspectorPinSnapshot {
    /** The surface KIND at the moment of the pin, e.g. "Node". */
    readonly kindLabel: string;
    /** The surface IDENTITY at the moment of the pin, or null when it had none. */
    readonly identityLabel: string | null;
    /** Every numeric row that was on screen when the pin was taken. */
    readonly metrics: readonly PinnedMetric[];
}

/**
 * What the inspector's content can do with the pin.
 *
 * {@link useInspectorPin}'s return, which every inspector row reads.
 * @public
 */
export interface InspectorPinContextValue {
    /** The frozen card, or null when nothing is pinned. */
    readonly snapshot: InspectorPinSnapshot | null;
    /** Freezes the live content as card A. Replaces any existing pin: one at a time. */
    readonly pin: () => void;
    /** Releases the pin. */
    readonly unpin: () => void;
    /**
     * Registers one live numeric row so a later pin can freeze it.
     * @returns the function that removes the registration again.
     */
    readonly registerMetric: (metric: PinnedMetric) => () => void;
    /** The delta of a live figure against card A, or null when there is nothing to compare. */
    readonly deltaFor: (metricId: string, value: number) => number | null;
}

const NO_PIN: InspectorPinContextValue = {
    snapshot: null,
    pin: () => undefined,
    unpin: () => undefined,
    registerMetric: () => () => undefined,
    deltaFor: () => null,
};

const InspectorPinContext = createContext<InspectorPinContextValue>(NO_PIN);

const InspectorFooterContext = createContext<HTMLElement | null>(null);

/**
 * Props of the inspector's shared-state provider.
 * @public
 */
export interface InspectorStateProviderProps {
    /** The surface KIND, which card A freezes along with the figures. */
    readonly kindLabel: string;
    /** The surface IDENTITY, which card A freezes along with the figures. */
    readonly identityLabel?: string;
    /**
     * Whether the shell says a pin exists. Passing `false` releases the pin, which is
     * how "unpin automatically on data reload" reaches this component.
     */
    readonly pinned?: boolean;
    /** Called when the pin is taken or released, so the shell can mirror the state. */
    readonly onPinnedChange?: (pinned: boolean) => void;
    /** The sticky footer element blocks 6 render into, or null before it is measured. */
    readonly footerNode: HTMLElement | null;
    /** The inspector's chrome and content. */
    readonly children: React.ReactNode;
}

/**
 * Holds the pin and hands the content the sticky footer element.
 * @param props - the provider's props.
 * @returns the provider wrapping the inspector's chrome and content.
 */
export function InspectorStateProvider(props: InspectorStateProviderProps): React.JSX.Element {
    const { kindLabel, identityLabel, pinned, onPinnedChange, footerNode, children } = props;

    const [snapshot, setSnapshot] = useState<InspectorPinSnapshot | null>(null);
    const metricsRef = useRef<Map<string, PinnedMetric>>(new Map());

    // The shell releasing the pin -- a data reload is the case the spec names -- is
    // the one way the card goes away without a click on it.
    useEffect(() => {
        if (pinned === false) {
            setSnapshot(null);
        }
    }, [pinned]);

    const registerMetric = useCallback((metric: PinnedMetric): (() => void) => {
        metricsRef.current.set(metric.metricId, metric);

        return () => {
            metricsRef.current.delete(metric.metricId);
        };
    }, []);

    const pin = useCallback((): void => {
        setSnapshot({
            kindLabel,
            identityLabel: identityLabel ?? null,
            metrics: [...metricsRef.current.values()],
        });
        onPinnedChange?.(true);
    }, [identityLabel, kindLabel, onPinnedChange]);

    const unpin = useCallback((): void => {
        setSnapshot(null);
        onPinnedChange?.(false);
    }, [onPinnedChange]);

    const visibleSnapshot = pinned === false ? null : snapshot;

    const deltaFor = useCallback(
        (metricId: string, value: number): number | null => {
            if (visibleSnapshot === null) {
                return null;
            }

            const frozen = visibleSnapshot.metrics.find((metric) => metric.metricId === metricId);

            if (frozen === undefined) {
                return null;
            }

            return value - frozen.value;
        },
        [visibleSnapshot],
    );

    const value = useMemo<InspectorPinContextValue>(
        () => ({ snapshot: visibleSnapshot, pin, unpin, registerMetric, deltaFor }),
        [deltaFor, pin, registerMetric, unpin, visibleSnapshot],
    );

    return (
        <InspectorPinContext.Provider value={value}>
            <InspectorFooterContext.Provider value={footerNode}>{children}</InspectorFooterContext.Provider>
        </InspectorPinContext.Provider>
    );
}

/**
 * Reads the pin. Outside a provider it reports "nothing pinned", so a kind component
 * can be rendered on its own in a test without a pin harness.
 * @returns the pin's state and its two verbs.
 */
export function useInspectorPin(): InspectorPinContextValue {
    return useContext(InspectorPinContext);
}

/**
 * Reads the sticky footer element the actions block renders into.
 * @returns the footer element, or null when the inspector's chrome is not above.
 */
export function useInspectorFooterNode(): HTMLElement | null {
    return useContext(InspectorFooterContext);
}

/**
 * Props of one computed-metric row.
 * @public
 */
export interface InspectorMetricRowProps {
    /** Stable id, which is what a pinned delta is matched on. */
    readonly metricId: string;
    /**
     * The metric's name. 6.3's pair -- `Bridges (betweenness)` -- on first mention in
     * this surface, the plain name alone on repeats.
     */
    readonly name: string;
    /** The raw figure, which the delta against card A is computed from. */
    readonly value: number;
    /** The figure as the reader should see it, e.g. "4,212, top 0.4%". */
    readonly display: string;
    /** Where the value falls in its distribution, 0 to 100, drawn as the micro-bar. */
    readonly percentile: number;
    /** The rank, already spelled short: `#6`. Drawn in a rank chip. */
    readonly rank?: string;
    /** Whether the figure is still being computed by a background pass. */
    readonly busy?: boolean;
}

/**
 * One RT-6 metric row: plain name, the figure, a rank chip and a percentile micro-bar
 * -- never two lines, because a percentile and a rank are the same fact in two units
 * (spec 03 section 7).
 *
 * While a pin is held the row appends its delta against card A to the figure. A delta
 * of zero is not drawn: "nothing changed" is a row nobody needs (6.2).
 * @param props - the row's props.
 * @returns the metric row.
 */
export function InspectorMetricRow(props: InspectorMetricRowProps): React.JSX.Element {
    const { metricId, name, value, display, percentile, rank, busy } = props;
    const { registerMetric, deltaFor } = useInspectorPin();
    const formatter = useNumberFormatter();

    useEffect(() => registerMetric({ metricId, name, value, display }), [display, metricId, name, registerMetric, value]);

    const delta = deltaFor(metricId, value);
    let deltaText: string | null = null;

    if (delta !== null && delta !== 0) {
        const sign = delta > 0 ? "+" : "";

        deltaText = ` (${sign}${formatter.format(delta)} against A)`;
    }

    return (
        <MetricRow
            name={name}
            percentile={percentile}
            value={deltaText === null ? display : `${display}${deltaText}`}
            rank={rank}
            busy={busy}
        />
    );
}

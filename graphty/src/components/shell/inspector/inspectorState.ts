/**
 * The inspector's shared state -- the pin and the footer slot -- and the hooks that read
 * it, apart from the provider in `inspectorContext.tsx` so that file exports components only.
 */

import { createContext, useContext } from "react";

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

export const InspectorPinContext = createContext<InspectorPinContextValue>(NO_PIN);

export const InspectorFooterContext = createContext<HTMLElement | null>(null);

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

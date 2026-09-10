import React, { createContext, useContext } from "react";

// The "show labels on controls" preference. Off by default, because the panel's
// premise is that a drawing replaces a word; on, it writes the word beside the
// drawing as well. It exists because an icon-first panel is hard to defend to
// someone seeing it for the first time, and this is the switch that answers
// them. Surface it wherever your application keeps its appearance settings.
const PanelLabelsContext = createContext<boolean>(false);

/**
 * Props for the PanelLabelsProvider component.
 */
export interface PanelLabelsProviderProps {
    /** Whether panel controls draw their label word beside their glyph. Off by default. */
    showLabels?: boolean;
    /** The panel rows the preference applies to. */
    children: React.ReactNode;
}

/**
 * Provides the "show labels on controls" preference to every panel row.
 *
 * Wrap one panel or the whole application. Every row type reads the preference
 * through `usePanelLabels` and answers it in its own way: a field grows its
 * label word inside its box, and a pair of fields becomes two single rows --
 * never a two-line stack.
 * @param props - Component props
 * @param props.showLabels - Whether panel controls draw their label word beside their glyph
 * @param props.children - The panel rows the preference applies to
 * @returns The provider wrapping its children
 */
export function PanelLabelsProvider({ showLabels = false, children }: PanelLabelsProviderProps): React.JSX.Element {
    return <PanelLabelsContext.Provider value={showLabels}>{children}</PanelLabelsContext.Provider>;
}

/**
 * Reads the "show labels on controls" preference.
 *
 * Returns false when there is no provider above, which is the shipped default:
 * a panel with no preference set is an icon-first panel.
 * @returns True when panel controls should draw their label word
 */
export function usePanelLabels(): boolean {
    return useContext(PanelLabelsContext);
}

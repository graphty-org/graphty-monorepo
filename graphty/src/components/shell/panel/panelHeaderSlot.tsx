/**
 * The activity panel's header actions slot, and the hook a panel body reaches it
 * with.
 *
 * A handful of panel controls belong in the 36px title row rather than in the
 * content band: the Analyze panel's Cards / List toggle is drawn there on
 * AnalyzePanel.dc.html:206-216, as a pair of 24px tiles between the panel name and
 * the close X. The control's STATE, though, belongs to the body that reads it --
 * the card view is one of the two entries Analyze keeps under its own 6.5 key --
 * so lifting the state into `AppShell` to pass it down as a prop would move a
 * panel's memory out of the panel to solve a layout problem.
 *
 * `ActivityPanel` therefore publishes the header's trailing slot as a DOM node and
 * the body portals into it, which is the same seam the inspector already uses for
 * its sticky footer (`useInspectorFooterNode`). A body rendered without the panel
 * chrome around it -- in a test, say -- gets `null` and draws nothing, exactly as
 * the inspector's footer does.
 */

import React, { createContext, useContext } from "react";

/** The header's trailing slot, or null where there is no panel chrome above. */
const PanelHeaderSlotContext = createContext<HTMLDivElement | null>(null);

/**
 * Props of {@link PanelHeaderSlotProvider}.
 * @public
 */
export interface PanelHeaderSlotProviderProps {
    /** The slot node the header published, or null before it mounts. */
    readonly node: HTMLDivElement | null;
    /** The panel, whose body reads the slot. */
    readonly children: React.ReactNode;
}

/**
 * Publishes the header's trailing slot to the panel body below it.
 * @param props - the slot node and the panel.
 * @returns the panel, with the slot in scope.
 */
export function PanelHeaderSlotProvider(props: PanelHeaderSlotProviderProps): React.JSX.Element {
    const { node, children } = props;

    return <PanelHeaderSlotContext.Provider value={node}>{children}</PanelHeaderSlotContext.Provider>;
}

/**
 * The header's trailing slot, for a body that draws a control in the title row.
 * @returns the slot node, or null when there is no panel chrome above.
 */
export function usePanelHeaderSlot(): HTMLDivElement | null {
    return useContext(PanelHeaderSlotContext);
}

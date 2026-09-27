import { createContext, useContext } from "react";

/** The header's trailing slot, or null where there is no panel chrome above. */
export const PanelHeaderSlotContext = createContext<HTMLDivElement | null>(null);

/**
 * The header's trailing slot, for a body that draws a control in the title row.
 * @returns the slot node, or null when there is no panel chrome above.
 */
export function usePanelHeaderSlot(): HTMLDivElement | null {
    return useContext(PanelHeaderSlotContext);
}

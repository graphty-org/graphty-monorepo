import { createContext } from "react";

/**
 * The sections drawn inside one panel, so that the two universal overflow rows
 * and the alt-click sibling toggle can reach every one of them.
 *
 * Registration is what makes "every sibling header in the same panel" a real
 * set rather than a guess: a section that is not rendered -- because the data
 * cannot support it (Rule 7c) -- is not in it, and one added by a later pass
 * joins it without anyone maintaining a list.
 */
export interface PanelSectionScope {
    /** Adds a section to the panel's set. Called on mount. */
    readonly registerSection: (sectionId: string) => void;
    /** Removes a section from the panel's set. Called on unmount. */
    readonly unregisterSection: (sectionId: string) => void;
    /** Every section currently drawn in this panel, in registration order. */
    readonly sectionIds: () => readonly string[];
}

/**
 * The panel's own section set. `null` outside a panel, where a section keeps
 * its own state and has no siblings to sweep.
 */
export const PanelSectionScopeContext = createContext<PanelSectionScope | null>(null);

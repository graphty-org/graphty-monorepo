import { createContext } from "react";

/**
 * Whether a step's checklist shows each value's color as the graph draws it now: on in the
 * selection workspace's Styled view, off in its Card colors view (where a ticked value is drawn in
 * the card's color, which the card already wears) and everywhere else.
 */
export const DrawnSwatches = createContext(false);

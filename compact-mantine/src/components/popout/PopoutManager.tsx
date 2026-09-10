import type { JSX, ReactNode } from "react";

import { PopoutManagerProvider } from "./PopoutContext";

/**
 * Props for the PopoutManager component.
 */
export interface PopoutManagerProps {
    /** The part of the tree that may contain pop-outs. Usually the whole application. */
    children: ReactNode;
}

/**
 * The single floating layer every pop-out on the page shares.
 *
 * Put one high in the tree, around anything that contains a pop-out. It owns
 * the stacking order, the portal the panels render into, and the dismissal
 * rules they all obey: Escape closes the innermost open panel, a click outside
 * closes them all, opening one panel closes the others at its own level, and
 * closing a panel closes everything opened from it.
 * @param props - Component props
 * @param props.children - The part of the tree that may contain pop-outs
 * @returns The provider that pop-outs inside it coordinate through
 */
export function PopoutManager({ children }: PopoutManagerProps): JSX.Element {
    return <PopoutManagerProvider>{children}</PopoutManagerProvider>;
}

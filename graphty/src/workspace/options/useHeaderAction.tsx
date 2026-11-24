/**
 * A pop-over's header slot: compact-mantine's pop-out header draws its buttons from an icon, a name and a click
 * (compact-mantine is locked to Figma), so content that puts a button there (an Advanced "...", AdvancedPop.tsx)
 * reaches it through this context.
 */

import React, { createContext, useCallback, useState } from "react";

/** A button in a pop-over's header: its Advanced "...". */
export interface HeaderAction {
    readonly id: string;
    readonly icon: React.ReactNode;
    readonly label: string;
    readonly onClick: (event: React.SyntheticEvent) => void;
}

/** Puts a button in the header of the pop-over it is drawn in. */
export const HeaderContext = createContext<((action: HeaderAction | undefined) => void) | null>(null);

/**
 * A pop-over's header slot: the button its content puts there, and the provider its content is drawn in.
 * @returns the header's buttons (undefined: none), and the body to draw in the panel.
 */
export function useHeaderAction(): {
    actions: HeaderAction[] | undefined;
    body: (children: React.ReactNode) => React.JSX.Element;
} {
    const [action, setAction] = useState<HeaderAction | undefined>(undefined);
    const put = useCallback((next: HeaderAction | undefined) => {
        setAction(() => next);
    }, []);
    return {
        actions: action === undefined ? undefined : [action],
        body: (children) => <HeaderContext.Provider value={put}>{children}</HeaderContext.Provider>,
    };
}

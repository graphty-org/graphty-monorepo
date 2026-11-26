/**
 * A settings pop-over's header "..." (compact-mantine `Popout.Panel` `more`): the content drawn in the pop-over knows
 * its groups of settings, the pop-over's frame draws the header, so the content hands its "..." up through this
 * context (design/ui/style-panel-v2/design.md, "Input rules").
 */

import type { PopoutHeaderMore } from "@graphty/compact-mantine";
import React, { createContext, useCallback, useState } from "react";

/** Puts a "..." in the header of the pop-over it is drawn in, or takes it away. */
export const HeaderMoreContext = createContext<((more: PopoutHeaderMore | undefined) => void) | null>(null);

/**
 * A pop-over's header "...": the one its content puts there, and the provider its content is drawn in.
 * @returns the header's "..." (undefined: none), and the body to draw in the panel.
 */
export function useHeaderMore(): {
    more: PopoutHeaderMore | undefined;
    body: (children: React.ReactNode) => React.JSX.Element;
} {
    // on reload: fresh: derived: set again by the panel drawn inside it
    const [more, setMore] = useState<PopoutHeaderMore | undefined>(undefined);
    const put = useCallback((next: PopoutHeaderMore | undefined) => {
        setMore(next);
    }, []);
    return {
        more,
        body: (children) => <HeaderMoreContext.Provider value={put}>{children}</HeaderMoreContext.Provider>,
    };
}
